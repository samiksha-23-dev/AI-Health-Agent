from app.services.bedrock_client import bedrock_client
from app.services.chroma_setup import chroma_db
from app.services.rag_pipeline import rag_pipeline

HEALTH_GUIDES = [
    {"text": "Strength Training Fundamentals: Progressive overload is key. Compound movements like squats, deadlifts, bench press, and rows build maximum muscle. Train each muscle group 2-3x per week. Rest 48-72 hours between sessions for the same muscle group. Aim for 3-5 sets of 6-12 reps for hypertrophy.", "metadata": {"category": "workout"}},
    {"text": "Cardiovascular Health: 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week. Zone 2 training (60-70% max HR) builds aerobic base. HIIT improves VO2 max. Walking 10,000 steps daily reduces cardiovascular disease risk by 30%.", "metadata": {"category": "cardio"}},
    {"text": "Nutrition for Muscle Gain: Caloric surplus of 250-500 calories above TDEE. Protein intake 1.6-2.2g per kg bodyweight. Carbohydrates fuel workouts — 4-7g per kg. Healthy fats 0.5-1g per kg. Meal timing: protein within 2 hours post-workout maximizes muscle protein synthesis.", "metadata": {"category": "nutrition"}},
    {"text": "Weight Loss Science: Caloric deficit of 500-750 calories creates 0.5-0.75kg weekly loss. High protein (2g/kg) preserves muscle during deficit. Fiber intake 25-35g daily increases satiety. Avoid ultra-processed foods. Sleep 7-9 hours — poor sleep increases ghrelin (hunger hormone) by 24%.", "metadata": {"category": "weight_loss"}},
    {"text": "Diabetes Management Through Lifestyle: Regular exercise improves insulin sensitivity. Resistance training reduces HbA1c by 0.6%. Low glycemic index foods stabilize blood sugar. Monitor carbohydrate intake — 45-60g per meal. Walking after meals reduces post-meal glucose spikes by 22%.", "metadata": {"category": "medical"}},
    {"text": "Hypertension and Exercise: Aerobic exercise reduces systolic BP by 5-8 mmHg. Avoid heavy isometric exercises if BP > 160/100. DASH diet reduces BP by 8-14 mmHg. Reduce sodium to < 2300mg daily. Potassium-rich foods (bananas, sweet potatoes) support healthy BP.", "metadata": {"category": "medical"}},
    {"text": "Sleep and Recovery: 7-9 hours of sleep is essential for muscle repair and hormone regulation. Growth hormone peaks during deep sleep. Sleep deprivation reduces testosterone by 10-15%. Magnesium supplementation improves sleep quality. Avoid screens 1 hour before bed — blue light suppresses melatonin.", "metadata": {"category": "recovery"}},
    {"text": "Flexibility and Mobility: Dynamic stretching before workouts, static stretching after. Yoga improves flexibility by 35% in 8 weeks. Hip flexor stretches counteract sitting. Foam rolling reduces muscle soreness by 30%. Mobility work prevents injury and improves performance.", "metadata": {"category": "recovery"}},
    {"text": "Mental Health and Exercise: 30 minutes of aerobic exercise reduces anxiety and depression symptoms. Exercise increases BDNF (brain-derived neurotrophic factor) — the brain's growth hormone. Mindfulness meditation reduces cortisol by 20%. Social exercise (group classes, team sports) boosts adherence by 40%.", "metadata": {"category": "mental_health"}},
    {"text": "Hydration Guidelines: Drink 35ml per kg bodyweight daily. During exercise, drink 500ml per hour of moderate activity. Electrolytes (sodium, potassium, magnesium) are critical for performance. Urine color should be pale yellow. Dehydration of just 2% reduces performance by 10-20%.", "metadata": {"category": "nutrition"}},
    {"text": "Cholesterol Management: Soluble fiber (oats, beans, apples) reduces LDL by 5-10%. Omega-3 fatty acids reduce triglycerides by 15-30%. Avoid trans fats completely. Exercise raises HDL (good cholesterol) by 5%. Plant sterols in fortified foods block cholesterol absorption.", "metadata": {"category": "medical"}},
    {"text": "HIIT Training Protocol: 20-30 second all-out efforts followed by 10-40 second rest. 4-6 rounds per session. Burns 25-30% more calories than steady-state cardio. Improves insulin sensitivity for 24-48 hours post-workout. Limit to 2-3 sessions per week to prevent overtraining.", "metadata": {"category": "workout"}},
    {"text": "Meal Planning for Health: Prep meals Sunday and Wednesday. Protein sources: chicken, fish, eggs, legumes, tofu. Complex carbs: brown rice, quinoa, sweet potato, oats. Vegetables: aim for 5-7 servings daily. Healthy fats: avocado, nuts, olive oil. Avoid skipping meals — leads to overeating.", "metadata": {"category": "nutrition"}},
    {"text": "Stress Management: Chronic stress elevates cortisol, causing fat storage and muscle breakdown. Breathing exercises (4-7-8 technique) activate parasympathetic nervous system. Cold showers reduce stress hormones. Journaling reduces anxiety. Limit caffeine after 2pm — disrupts sleep and increases cortisol.", "metadata": {"category": "mental_health"}},
    {"text": "Body Composition Improvement: Track progress with measurements, not just weight. Muscle weighs more than fat — scale can be misleading. Body fat percentage is a better metric. Waist-to-hip ratio < 0.9 for men, < 0.85 for women is healthy. Progress photos every 4 weeks show real changes.", "metadata": {"category": "fitness"}},
    {"text": "Beginner Workout Program: Start with 3 days per week full-body training. Focus on form before weight. Bodyweight exercises first: push-ups, squats, lunges, planks. Add resistance gradually — 5-10% increase per week. Rest 60-90 seconds between sets. Consistency beats intensity for beginners.", "metadata": {"category": "workout"}},
    {"text": "Anti-Inflammatory Diet: Chronic inflammation causes disease. Anti-inflammatory foods: berries, fatty fish, leafy greens, nuts, olive oil, turmeric. Avoid: refined sugars, processed meats, trans fats, excessive alcohol. Mediterranean diet reduces inflammation markers by 20%. Curcumin (turmeric) is as effective as ibuprofen for joint pain.", "metadata": {"category": "nutrition"}},
    {"text": "Bone Health and Osteoporosis Prevention: Weight-bearing exercise builds bone density. Calcium 1000-1200mg daily. Vitamin D 1000-2000 IU daily. Resistance training increases bone density by 1-3% per year. Avoid excessive alcohol and smoking — both reduce bone density. Balance training prevents falls.", "metadata": {"category": "medical"}},
    {"text": "Gut Health and Microbiome: 30+ different plant foods per week diversifies gut bacteria. Fermented foods (yogurt, kefir, kimchi) add beneficial bacteria. Prebiotic fiber feeds good bacteria. Avoid antibiotics unless necessary. Gut health affects immunity, mood, and metabolism. Probiotics reduce bloating and improve digestion.", "metadata": {"category": "nutrition"}},
    {"text": "Goal Setting for Fitness: SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound. Track workouts in a journal or app. Celebrate small wins — dopamine reinforces habits. Find an accountability partner — increases success rate by 65%. Review and adjust goals every 4 weeks based on progress.", "metadata": {"category": "fitness"}},
]

class FitnessAgent:
    def __init__(self):
        self.conversation_history = []

    def _get_context(self, query: str) -> str:
        embedding = bedrock_client.generate_embeddings(query)
        docs = chroma_db.query(embedding, n_results=3)
        return "\n\n".join(docs) if docs else ""

    def _profile_str(self, profile: dict) -> str:
        if not profile:
            return ""
        return f"""
User Profile:
- Name: {profile.get('name', 'User')}, Age: {profile.get('age', 'N/A')}, Gender: {profile.get('gender', 'N/A')}
- Weight: {profile.get('weight', 'N/A')}kg, Height: {profile.get('height', 'N/A')}cm, BMI: {profile.get('bmi', 'N/A')}
- Goal: {profile.get('goal', 'N/A')}, Fitness Level: {profile.get('fitness_level', 'N/A')}
- Medical Conditions: {profile.get('conditions', 'None')}, Medications: {profile.get('medications', 'None')}
- Dietary Restrictions: {profile.get('dietary_restrictions', 'None')}
- Blood Pressure: {profile.get('blood_pressure', 'N/A')}, Heart Rate: {profile.get('heart_rate', 'N/A')}
- Blood Sugar: {profile.get('blood_sugar', 'N/A')}, Cholesterol: {profile.get('cholesterol', 'N/A')}
- Sleep: {profile.get('sleep_hours', 'N/A')}hrs, Stress: {profile.get('stress_level', 'N/A')}/10, Water: {profile.get('water_intake', 'N/A')}L
"""

    def process(self, message: str, mode: str, profile: dict = None, logs: list = None) -> dict:
        context = self._get_context(message)
        profile_str = self._profile_str(profile)
        self.conversation_history.append({"role": "user", "content": message})

        if mode == "workout_plan":
            response = self._workout_plan(profile_str, context)
        elif mode == "diet_plan":
            response = self._diet_plan(profile_str, context)
        elif mode == "motivation":
            response = self._motivation(profile_str, context)
        elif mode == "progress_tips":
            response = self._progress_tips(profile_str, context, logs)
        elif mode == "health_analysis":
            response = self._health_analysis(profile_str, context)
        elif mode == "health_report":
            response = self._health_report(profile_str, context, logs)
        else:
            response = self._rag_answer(message, profile_str, context)

        self.conversation_history.append({"role": "assistant", "content": response})
        return {"response": response, "mode": mode, "context_used": bool(context)}

    def _rag_answer(self, message: str, profile_str: str, context: str) -> str:
        history = "\n".join([f"{m['role'].title()}: {m['content']}" for m in self.conversation_history[-6:]])
        prompt = f"""You are an expert AI health and fitness coach with deep knowledge in exercise science, nutrition, and preventive medicine.
{profile_str}
Health Knowledge Base:
{context}

Conversation History:
{history}

Provide a detailed, personalized, actionable response. Use bullet points and structure your answer clearly."""
        return bedrock_client.generate_text(prompt, max_tokens=1200)

    def _workout_plan(self, profile_str: str, context: str) -> str:
        prompt = f"""You are an expert personal trainer. Create a complete 7-day personalized workout plan.
{profile_str}
Knowledge Base:
{context}

Generate a structured 7-day workout plan with:
- Day-by-day breakdown (Day 1-7)
- Specific exercises with sets, reps, and rest periods
- Warm-up and cool-down for each day
- Modifications for any medical conditions
- Progressive overload strategy
- Weekly goals and expected outcomes
Format with clear headers and bullet points."""
        return bedrock_client.generate_text(prompt, max_tokens=1500)

    def _diet_plan(self, profile_str: str, context: str) -> str:
        prompt = f"""You are a registered dietitian and nutrition expert. Create a complete personalized diet plan.
{profile_str}
Nutrition Knowledge:
{context}

Generate a comprehensive diet plan with:
- Daily calorie target and macronutrient breakdown (protein/carbs/fats)
- 7-day meal plan (breakfast, lunch, dinner, snacks)
- Specific foods to include and avoid based on medical conditions
- Hydration guidelines
- Supplement recommendations if needed
- Meal prep tips
Format with clear structure and practical portions."""
        return bedrock_client.generate_text(prompt, max_tokens=1500)

    def _motivation(self, profile_str: str, context: str) -> str:
        prompt = f"""You are an elite performance coach and motivational expert.
{profile_str}
{context}

Create a powerful, personalized motivational message that:
- Acknowledges their specific goal and challenges
- Uses their health metrics to show what's possible
- Includes 3 specific action steps for today
- Ends with an inspiring call to action
Make it emotional, personal, and energizing."""
        return bedrock_client.generate_text(prompt, max_tokens=800)

    def _progress_tips(self, profile_str: str, context: str, logs: list) -> str:
        logs_str = f"\nRecent Logs (last 7 days): {logs[-7:] if logs else 'No logs yet'}"
        prompt = f"""You are a health analytics expert and performance coach.
{profile_str}
{logs_str}
{context}

Provide detailed progress tracking advice:
- Analysis of current trends from logs
- 5 specific metrics to track daily
- Weekly milestone targets based on their goal
- Warning signs to watch for
- Optimization strategies for faster results
- Tools and techniques for accurate tracking"""
        return bedrock_client.generate_text(prompt, max_tokens=1000)

    def _health_analysis(self, profile_str: str, context: str) -> str:
        prompt = f"""You are a preventive medicine specialist and health analyst.
{profile_str}
Medical Knowledge:
{context}

Perform a comprehensive health analysis:
1. **Overall Health Score** (0-100) with breakdown by category
2. **Cardiovascular Risk Assessment** based on BP, HR, cholesterol
3. **Metabolic Health** based on blood sugar, BMI, activity level
4. **Lifestyle Analysis** — sleep, stress, hydration, habits
5. **Top 5 Priority Recommendations** ranked by impact
6. **Red Flags** — any metrics requiring immediate attention
7. **30-Day Action Plan** with specific weekly targets
Be specific, data-driven, and actionable."""
        return bedrock_client.generate_text(prompt, max_tokens=1500)

    def _health_report(self, profile_str: str, context: str, logs: list) -> str:
        logs_str = f"\nWeekly Logs: {logs[-7:] if logs else 'No logs recorded'}"
        prompt = f"""You are a comprehensive health report specialist.
{profile_str}
{logs_str}
{context}

Generate a complete weekly health report:
1. **Executive Health Summary** — overall status this week
2. **Achievements** — what went well, milestones hit
3. **Areas for Improvement** — specific gaps identified
4. **Health Metrics Analysis** — trends and changes
5. **This Week's Focus** — top 3 priorities
6. **Personalized Tips** — 5 actionable improvements
7. **Next Week's SMART Goals** — 3 specific, measurable targets
8. **Long-term Outlook** — projected progress at current rate
Make it comprehensive, encouraging, and data-driven."""
        return bedrock_client.generate_text(prompt, max_tokens=2000)

    def initialize_knowledge_base(self) -> dict:
        chroma_db.clear_collection()
        documents = []
        for guide in HEALTH_GUIDES:
            embedding = bedrock_client.generate_embeddings(guide["text"])
            documents.append({"text": guide["text"], "embedding": embedding, "metadata": guide["metadata"]})
        chroma_db.add_documents(documents)
        return {"status": "success", "guides_loaded": len(HEALTH_GUIDES)}

fitness_agent = FitnessAgent()
