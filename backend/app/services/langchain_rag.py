"""
langchain_rag.py  —  LangChain RAG layer
=========================================
WHAT LANGCHAIN REPLACES vs the old manual code:

OLD (bedrock_client.py + fitness_agent._get_context):
  1. Manually build different JSON bodies for Nova vs Claude
  2. Manually call Titan embeddings via boto3
  3. Manually query ChromaDB and join results as a string
  4. Manually build f-string prompts

NEW (LangChain):
  1. ChatBedrock handles all model-specific request formats automatically
  2. BedrockEmbeddings plugs directly into LangChain vectorstore interface
  3. Chroma vectorstore returns Document objects with metadata (source tracking)
  4. PromptTemplate with named slots — safer and reusable
  5. LCEL pipe chain: retriever | prompt | llm | parser — one line per step

NEW FEATURES THIS ADDS:
  - Source tracking: every answer returns which health guide categories were used
  - Retriever object reused by LangGraph tools (defined once, shared everywhere)
  - Document metadata (category field) available for filtering
"""

import warnings
warnings.filterwarnings("ignore")

from langchain_aws import ChatBedrock, BedrockEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from app.config import config


# ── LLM: ChatBedrock ──────────────────────────────────────────────────────────
# WHY: Normalizes request/response format across all Bedrock models.
# No more separate JSON body builders for Nova vs Claude.
llm = ChatBedrock(
    model_id="amazon.nova-micro-v1:0",
    region_name=config.AWS_REGION,
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
    model_kwargs={"temperature": 0.7, "maxTokens": 1500},
)

# ── Embeddings: BedrockEmbeddings ─────────────────────────────────────────────
# WHY: Implements LangChain Embeddings interface so it plugs into any vectorstore.
# No manual boto3 JSON parsing needed.
embeddings = BedrockEmbeddings(
    model_id="amazon.titan-embed-text-v1",
    region_name=config.AWS_REGION,
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
)

# ── Vectorstore: LangChain Chroma wrapper ─────────────────────────────────────
# WHY: Wraps ChromaDB with LangChain's Retriever interface.
# Uses the SAME persist_directory as the old chroma_setup.py — no data migration.
vectorstore = Chroma(
    collection_name="health_knowledge",
    embedding_function=embeddings,
    persist_directory=config.CHROMA_PATH,
)

# ── Retriever: the "R" in RAG ─────────────────────────────────────────────────
# WHY: .as_retriever() is the standard LangChain interface used by all chains
# and LangGraph tools. Defined once here, imported everywhere.
# k=3 → top 3 most semantically similar health guides per query.
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3},
)

# ── RAG Prompt Template ───────────────────────────────────────────────────────
# WHY: Named variables {context}, {question}, {profile} are validated at build time.
# Safer than f-strings which silently produce wrong output if a variable is missing.
RAG_PROMPT = PromptTemplate(
    input_variables=["context", "question", "profile"],
    template="""You are an expert AI health and fitness coach powered by Amazon Bedrock.

User Health Profile:
{profile}

Relevant Health Knowledge (retrieved from knowledge base):
{context}

User Question: {question}

Provide a detailed, personalized, actionable response grounded in the knowledge above.
Use bullet points and clear structure.""",
)


def _format_docs(docs) -> str:
    """Convert LangChain Document objects to a string with source labels."""
    return "\n\n".join(
        f"[{doc.metadata.get('category', 'general').upper()}]\n{doc.page_content}"
        for doc in docs
    )


def format_profile(profile: dict) -> str:
    if not profile:
        return "No profile provided."
    return (
        f"Name: {profile.get('name','N/A')}, Age: {profile.get('age','N/A')}, "
        f"Gender: {profile.get('gender','N/A')}, Weight: {profile.get('weight','N/A')}kg, "
        f"Height: {profile.get('height','N/A')}cm, BMI: {profile.get('bmi','N/A')}, "
        f"Goal: {profile.get('goal','N/A')}, Fitness Level: {profile.get('fitness_level','N/A')}, "
        f"Conditions: {profile.get('conditions','None')}, Medications: {profile.get('medications','None')}, "
        f"BP: {profile.get('blood_pressure','N/A')}, HR: {profile.get('heart_rate','N/A')}, "
        f"Blood Sugar: {profile.get('blood_sugar','N/A')}, Cholesterol: {profile.get('cholesterol','N/A')}, "
        f"Sleep: {profile.get('sleep_hours','N/A')}hrs, Stress: {profile.get('stress_level','N/A')}/10, "
        f"Water: {profile.get('water_intake','N/A')}L, "
        f"Dietary Restrictions: {profile.get('dietary_restrictions','None')}"
    )


def rag_query(question: str, profile: dict = None) -> dict:
    """
    Run a full RAG query using LangChain LCEL chain.

    LCEL chain flow (pipe operator):
      retriever  →  gets top 3 Document objects from ChromaDB
      _format_docs  →  converts Documents to string with category labels
      RAG_PROMPT  →  fills {context}, {question}, {profile} slots
      llm  →  sends to ChatBedrock (Amazon Nova Micro)
      StrOutputParser  →  extracts clean string from AIMessage response object

    NEW vs old: returns sources list so frontend can show which guides were used.
    """
    profile_str = format_profile(profile)

    # Build LCEL chain
    # RunnablePassthrough() passes the question through unchanged so
    # both {context} (from retriever) and {question} are available in the prompt
    chain = (
        {
            "context": retriever | _format_docs,
            "question": RunnablePassthrough(),
            "profile": lambda _: profile_str,
        }
        | RAG_PROMPT
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke(question)

    # Also retrieve source docs for transparency
    source_docs = retriever.invoke(question)
    sources = list({doc.metadata.get("category", "general") for doc in source_docs})

    return {
        "answer": answer,
        "sources": sources,
        "docs_retrieved": len(source_docs),
    }


# Export for LangGraph tools
langchain_llm = llm
langchain_retriever = retriever
