from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.fitness_agent import fitness_agent
from app.services.chroma_setup import chroma_db

router = APIRouter(prefix="/api")


class AgentRequest(BaseModel):
    message: str
    mode: str = "rag_answer"
    profile: Optional[dict] = None
    logs: Optional[list] = None


class AgentV2Request(BaseModel):
    message: str
    profile: Optional[dict] = None
    logs: Optional[list] = None
    session_id: str = "default"


class QueryRequest(BaseModel):
    query: str
    profile: Optional[dict] = None


# ── Original endpoints (unchanged) ───────────────────────────────────────────

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "Personal Health Agent API"}


@router.post("/initialize")
def initialize():
    try:
        result = fitness_agent.initialize_knowledge_base()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent")
def agent_endpoint(req: AgentRequest):
    """Original prompt-router agent — mode selected by frontend."""
    try:
        result = fitness_agent.process(req.message, req.mode, req.profile, req.logs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
def query_endpoint(req: QueryRequest):
    try:
        from app.services.rag_pipeline import rag_pipeline
        response = rag_pipeline.query(req.query, req.profile)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def status():
    count = chroma_db.get_count()
    return {"guides_loaded": count, "ready": count > 0}


# ── NEW: LangChain RAG endpoint ───────────────────────────────────────────────

@router.post("/rag")
def rag_endpoint(req: QueryRequest):
    """
    LangChain RAG endpoint.
    Uses LCEL chain: retriever | prompt | ChatBedrock | StrOutputParser
    Returns answer + sources (which health guide categories were used).
    """
    try:
        from app.services.langchain_rag import rag_query
        result = rag_query(req.query, req.profile)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── NEW: LangGraph ReAct Agent endpoint ──────────────────────────────────────

@router.post("/agent-v2")
def agent_v2_endpoint(req: AgentV2Request):
    """
    LangGraph ReAct Agent endpoint.

    HOW THIS DIFFERS FROM /api/agent:
    - /api/agent: frontend sends mode="workout_plan", backend obeys, calls one function
    - /api/agent-v2: frontend sends plain text, LLM decides which tools to call

    The LLM autonomously:
    1. Reads the message
    2. Decides which of 7 tools to call (can call multiple)
    3. Reads tool results
    4. Decides if more tools are needed
    5. Generates final synthesized response

    Returns: response text + tools_used list (the agent's reasoning trace)
    session_id: use a unique ID per user to maintain separate conversation memory
    """
    try:
        from app.services.langgraph_agent import run_agent
        result = run_agent(
            message=req.message,
            profile=req.profile,
            logs=req.logs,
            session_id=req.session_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
