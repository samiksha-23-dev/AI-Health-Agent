from app.services.bedrock_client import bedrock_client
from app.services.chroma_setup import chroma_db

class RAGPipeline:
    def query(self, question: str, user_profile: dict = None) -> str:
        embedding = bedrock_client.generate_embeddings(question)
        docs = chroma_db.query(embedding, n_results=3)
        context = "\n\n".join(docs) if docs else "No specific knowledge found."
        profile_str = ""
        if user_profile:
            profile_str = f"\nUser Profile: {user_profile}\n"
        prompt = f"""You are an expert personal health and fitness coach.
{profile_str}
Relevant Health Knowledge:
{context}

User Question: {question}

Provide a detailed, personalized, actionable response based on the knowledge above and the user's profile."""
        return bedrock_client.generate_text(prompt)

rag_pipeline = RAGPipeline()
