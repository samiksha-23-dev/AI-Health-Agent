import chromadb
from app.config import config

class ChromaSetup:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=config.CHROMA_PATH)
        self.collection = self.client.get_or_create_collection(
            name="health_knowledge",
            metadata={"hnsw:space": "cosine"}
        )

    def add_documents(self, documents: list[dict]):
        ids = [str(i) for i in range(len(documents))]
        texts = [d["text"] for d in documents]
        embeddings = [d["embedding"] for d in documents]
        metadatas = [d.get("metadata", {}) for d in documents]
        self.collection.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)

    def query(self, embedding: list, n_results: int = 3) -> list[str]:
        results = self.collection.query(query_embeddings=[embedding], n_results=n_results)
        return results["documents"][0] if results["documents"] else []

    def clear_collection(self):
        self.client.delete_collection("health_knowledge")
        self.collection = self.client.get_or_create_collection(
            name="health_knowledge", metadata={"hnsw:space": "cosine"}
        )

    def get_count(self) -> int:
        return self.collection.count()

chroma_db = ChromaSetup()
