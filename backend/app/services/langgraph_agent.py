"""
langgraph_agent.py  —  True Agentic AI with LangGraph ReAct loop
=================================================================
WHAT THIS REPLACES vs the old FitnessAgent:

OLD FitnessAgent (fitness_agent.py):
  - Frontend sends mode="workout_plan"
  - Backend runs: if mode == "workout_plan": return self._workout_plan(...)
  - ONE function called per request, decided by the FRONTEND
  - No reasoning, no autonomy, no multi-tool responses

NEW LangGraph Agent:
  - Frontend sends a plain natural language message
  - The LLM ITSELF reads the message and decides which tools to call
  - Can call MULTIPLE tools in sequence if needed
  - Observes each tool's output before deciding the next step
  - Maintains typed state across the entire conversation
  - This is the ReAct loop: Reason → Act → Observe → Reason → Respond

HOW LANGGRAPH WORKS IN THIS FILE:
  1. @tool decorators  →  define 7 functions as LangChain tools with descriptions
                          The LLM reads these descriptions to decide which to call
  2. create_react_agent()  →  LangGraph builds the ReAct graph automatically:
                               [START] → [LLM thinks] → [tool call?]
                                              ↑               ↓
                                         [observe]  ←  [tool runs]
                                              ↓
                                         [done?] → [END: final response]
  3. MemorySaver  →  LangGraph checkpointer that persists conversation state
                     in memory, keyed by thread_id (one per user session)
  4. agent.invoke()  →  runs the full graph until the LLM decides to stop

NEW FEATURES vs old FitnessAgent:
  - "I have diabetes and want to lose weight" → agent calls search_knowledge
    (gets diabetes guides) + analyze_health_metrics + generate_diet_plan
    automatically in one response
  - True conversation memory per user session via MemorySaver + thread_id
  - Agent shows its reasoning steps (which tools it called and why)
  - No mode selection needed — agent decides based on message content
"""

import warnings
warnings.filterwarnings("ignore")
import json

from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from app.services.langchain_rag import langchain_llm, langchain_retriever, format_profile

# ── Shared state passed into tools via closure ────────────────────────────────
# LangGraph tools are plain functions — we inject profile/logs via module-level
# variables that get set before each agent.invoke() call.
_current_profile: dict = {}
_current_logs: list = []


def _set_context(profile: dict, logs: list):
    global _current_profile, _current_logs
    _current_profile = profile or {}
    _current_logs = logs or []


# ── TOOL 1: search_knowledge ──────────────────────────────────────────────────
# WHY THIS IS A TOOL: The LLM calls this whenever it needs factual health
# information. The @tool decorator + docstring tells the LLM what this tool
# does and when to use it. LangGraph passes the LLM's chosen argument automatically.
@tool
def search_knowledge(query: str) -> str:
    """Search the health knowledge base for information about fitness, nutrition,
    medical conditions, workouts, diet, sleep, stress, or any health topic.
    Use this tool first before generating any plan or advice."""
    docs = langchain_retriever.invoke(query)
    if not docs:
        return "No relevant knowledge found for this query."
    results = []
    for doc in docs:
        category = doc.metadata.get("category", "general")
        results.append(f"[{category.upper()}]: {doc.page_content}")
    return "\n\n".join(results)


# ── TOOL 2: analyze_health_metrics ───────────────────────────────────────────
# WHY THIS IS A TOOL: When the user asks about their health status, the agent
# calls this tool to get a structured analysis of their profile metrics.
# The LLM then uses this analysis in its final response.
@tool
def analyze_health_metrics(focus: str = "all") -> str:
    """Analyze the user's health metrics from their profile.
    focus can be: 'cardiovascular', 'metabolic', 'lifestyle', 'bmi', or 'all'.
    Returns a structured analysis of the relevant metrics."""
    p = _current_profile
    if not p:
        return "No health profile available. Ask the user to complete their profile."

    bmi = float(p.get("bmi") or 0)
    bmi_cat = "Normal" if 18.5 <= bmi < 25 else "Underweight" if bmi < 18.5 else "Overweight" if bmi < 30 else "Obese"

    analysis = {
        "bmi": f"{bmi} ({bmi_cat})",
        "blood_pressure": p.get("blood_pressure", "N/A"),
        "heart_rate": f"{p.get('heart_rate', 'N/A')} bpm",
        "blood_sugar": f"{p.get('blood_sugar', 'N/A')} mg/dL",
        "cholesterol": f"{p.get('cholesterol', 'N/A')} mg/dL",
        "sleep": f"{p.get('sleep_hours', 'N/A')} hours/night",
        "stress": f"{p.get('stress_level', 'N/A')}/10",
        "water": f"{p.get('water_intake', 'N/A')} L/day",
        "fitness_level": p.get("fitness_level", "N/A"),
        "goal": p.get("goal", "N/A"),
        "conditions": p.get("conditions", "None"),
        "medications": p.get("medications", "None"),
    }

    flags = []
    if bmi >= 30:
        flags.append("⚠️ BMI indicates obesity — prioritize weight loss")
    if bmi < 18.5 and bmi > 0:
        flags.append("⚠️ BMI indicates underweight — increase caloric intake")
    bp = str(p.get("blood_pressure", ""))
    if bp and "/" in bp:
        systolic = int(bp.split("/")[0])
        if systolic > 140:
            flags.append("🚨 High blood pressure — avoid heavy isometric exercises")
        elif systolic > 120:
            flags.append("⚠️ Elevated blood pressure — monitor during exercise")
    bs = float(p.get("blood_sugar") or 0)
    if bs > 126:
        flags.append("🚨 High blood sugar — likely diabetic, low-GI diet critical")
    elif bs > 100:
        flags.append("⚠️ Pre-diabetic range — reduce refined carbohydrates")
    chol = float(p.get("cholesterol") or 0)
    if chol > 240:
        flags.append("🚨 High cholesterol — increase fiber, reduce saturated fats")
    sleep = float(p.get("sleep_hours") or 0)
    if sleep < 6:
        flags.append("⚠️ Insufficient sleep — recovery and hormone regulation impaired")
    stress = float(p.get("stress_level") or 0)
    if stress >= 8:
        flags.append("⚠️ Very high stress — cortisol elevation causing fat storage")

    result = f"HEALTH METRICS ANALYSIS:\n{json.dumps(analysis, indent=2)}"
    if flags:
        result += f"\n\nFLAGS & ALERTS:\n" + "\n".join(flags)
    else:
        result += "\n\nNo critical flags detected."
    return result


# ── TOOL 3: generate_workout_plan ─────────────────────────────────────────────
@tool
def generate_workout_plan(requirements: str = "") -> str:
    """Generate a personalized 7-day workout plan based on the user's fitness level,
    goal, medical conditions, and any specific requirements provided."""
    p = _current_profile
    profile_str = format_profile(p)
    knowledge = search_knowledge.invoke(f"workout plan {p.get('goal','')} {p.get('fitness_level','')} {p.get('conditions','')}")

    prompt = f"""Create a complete 7-day personalized workout plan.

Profile: {profile_str}
Specific Requirements: {requirements}
Relevant Knowledge: {knowledge}

Include: day-by-day breakdown, exercises with sets/reps/rest, warm-up/cool-down,
modifications for medical conditions, progressive overload strategy."""

    response = langchain_llm.invoke(prompt)
    return response.content


# ── TOOL 4: generate_diet_plan ────────────────────────────────────────────────
@tool
def generate_diet_plan(requirements: str = "") -> str:
    """Generate a personalized diet and nutrition plan based on the user's goal,
    medical conditions, dietary restrictions, and any specific requirements."""
    p = _current_profile
    profile_str = format_profile(p)
    knowledge = search_knowledge.invoke(f"nutrition diet {p.get('goal','')} {p.get('conditions','')} {p.get('dietary_restrictions','')}")

    prompt = f"""Create a complete personalized diet plan.

Profile: {profile_str}
Specific Requirements: {requirements}
Relevant Knowledge: {knowledge}

Include: daily calorie target, macros breakdown, 7-day meal plan,
foods to include/avoid based on medical conditions, hydration guidelines."""

    response = langchain_llm.invoke(prompt)
    return response.content


# ── TOOL 5: generate_motivation ───────────────────────────────────────────────
@tool
def generate_motivation(context: str = "") -> str:
    """Generate a powerful personalized motivational message for the user.
    Use when the user seems discouraged, asks for motivation, or needs encouragement."""
    p = _current_profile
    profile_str = format_profile(p)

    prompt = f"""Create a powerful personalized motivational message.

Profile: {profile_str}
Context: {context}

Acknowledge their specific goal, use their metrics to show what's possible,
include 3 specific action steps for today, end with an inspiring call to action."""

    response = langchain_llm.invoke(prompt)
    return response.content


# ── TOOL 6: analyze_progress ─────────────────────────────────────────────────
@tool
def analyze_progress(period: str = "week") -> str:
    """Analyze the user's progress from their daily logs.
    period can be 'week' (last 7 days) or 'all' (all logs).
    Returns trends, achievements, and areas for improvement."""
    logs = _current_logs
    if not logs:
        return "No logs found. Ask the user to start logging their daily health data."

    recent = logs[-7:] if period == "week" else logs
    workout_days = sum(1 for l in recent if l.get("workout_done"))
    diet_days = sum(1 for l in recent if l.get("diet_followed"))
    weights = [float(l["weight"]) for l in recent if l.get("weight")]
    sleep_vals = [float(l["sleep"]) for l in recent if l.get("sleep")]
    water_vals = [float(l["water"]) for l in recent if l.get("water")]
    steps_vals = [float(l["steps"]) for l in recent if l.get("steps")]
    energy_vals = [float(l["energy"]) for l in recent if l.get("energy")]

    summary = {
        "period": f"Last {len(recent)} logs",
        "workout_adherence": f"{workout_days}/{len(recent)} days ({round(workout_days/len(recent)*100)}%)",
        "diet_adherence": f"{diet_days}/{len(recent)} days ({round(diet_days/len(recent)*100)}%)",
        "weight_trend": f"{weights[0]}kg → {weights[-1]}kg (change: {round(weights[-1]-weights[0],1)}kg)" if len(weights) >= 2 else "insufficient data",
        "avg_sleep": f"{round(sum(sleep_vals)/len(sleep_vals),1)}hrs" if sleep_vals else "not logged",
        "avg_water": f"{round(sum(water_vals)/len(water_vals),1)}L" if water_vals else "not logged",
        "avg_steps": f"{round(sum(steps_vals)/len(steps_vals)):,}" if steps_vals else "not logged",
        "avg_energy": f"{round(sum(energy_vals)/len(energy_vals),1)}/10" if energy_vals else "not logged",
    }

    return f"PROGRESS ANALYSIS:\n{json.dumps(summary, indent=2)}"


# ── TOOL 7: generate_health_report ───────────────────────────────────────────
@tool
def generate_health_report(scope: str = "weekly") -> str:
    """Generate a comprehensive health report combining metrics analysis and log trends.
    scope can be 'weekly' or 'full'. Use when user asks for a report or summary."""
    p = _current_profile
    profile_str = format_profile(p)
    metrics = analyze_health_metrics.invoke("all")
    progress = analyze_progress.invoke("week")
    knowledge = search_knowledge.invoke(f"health report goals {p.get('goal','')}")

    prompt = f"""Generate a comprehensive {scope} health report.

Profile: {profile_str}
Metrics Analysis: {metrics}
Progress Data: {progress}
Relevant Knowledge: {knowledge}

Include: executive summary, achievements, areas for improvement,
health metrics analysis, this week's focus, personalized tips,
next week's SMART goals, long-term outlook."""

    response = langchain_llm.invoke(prompt)
    return response.content


# ── LangGraph ReAct Agent ─────────────────────────────────────────────────────
# WHY create_react_agent:
#   This function from langgraph.prebuilt builds the full ReAct graph automatically.
#   It creates nodes: [agent (LLM)] ↔ [tools] with edges that loop until
#   the LLM decides it has enough information to give a final answer.
#
# WHY MemorySaver:
#   Persists the full message history (HumanMessage, AIMessage, ToolMessage)
#   in memory keyed by thread_id. Each user session gets its own thread_id
#   so conversations are isolated. The agent remembers everything said in
#   the session without us manually managing a history list.

ALL_TOOLS = [
    search_knowledge,
    analyze_health_metrics,
    generate_workout_plan,
    generate_diet_plan,
    generate_motivation,
    analyze_progress,
    generate_health_report,
]

memory = MemorySaver()

agent = create_react_agent(
    model=langchain_llm,
    tools=ALL_TOOLS,
    checkpointer=memory,
)

SYSTEM_PROMPT = """You are an expert AI personal health and fitness coach powered by Amazon Bedrock.
You have access to 7 specialized tools. Always use tools to gather information before responding.

TOOL USAGE RULES:
- ALWAYS call search_knowledge first for any health/fitness question
- Call analyze_health_metrics when the user asks about their health status or before making plans
- Call analyze_progress when the user asks how they are doing or about their logs
- Call generate_workout_plan for exercise/workout requests
- Call generate_diet_plan for nutrition/diet/meal requests
- Call generate_motivation when the user needs encouragement
- Call generate_health_report for comprehensive summaries or weekly reports
- You CAN and SHOULD call multiple tools in one response when needed
- After calling tools, synthesize all results into one clear, personalized response

Always be encouraging, specific, and reference the user's actual health data."""


def run_agent(message: str, profile: dict, logs: list, session_id: str) -> dict:
    """
    Run the LangGraph ReAct agent.

    HOW IT WORKS:
    1. _set_context() injects profile/logs so tools can access them
    2. agent.invoke() runs the full ReAct graph:
       - LLM reads the message + system prompt + tool descriptions
       - LLM decides which tool(s) to call
       - Tools execute and return results as ToolMessages
       - LLM reads tool results and decides: call more tools OR respond
       - Loop continues until LLM produces a final AIMessage
    3. config={"configurable": {"thread_id": session_id}} tells MemorySaver
       which conversation thread to load/save — this is how per-user memory works
    4. We extract tool_calls from the message history to show the user
       which tools the agent used (the "reasoning trace")
    """
    _set_context(profile, logs)

    config = {"configurable": {"thread_id": session_id}}

    input_messages = {
        "messages": [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=message),
        ]
    }

    result = agent.invoke(input_messages, config=config)

    # Extract final AI response
    final_message = result["messages"][-1]
    response_text = final_message.content

    # Extract which tools were called (reasoning trace)
    tools_used = []
    for msg in result["messages"]:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_name = tc.get("name", "") if isinstance(tc, dict) else getattr(tc, "name", "")
                if tool_name and tool_name not in tools_used:
                    tools_used.append(tool_name)

    return {
        "response": response_text,
        "tools_used": tools_used,
        "mode": "langgraph_react_agent",
        "session_id": session_id,
    }
