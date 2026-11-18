# 🏋️ HealthAI — Personal Health Agent

AI-powered fitness and health coaching using **Amazon Bedrock** + **LangGraph** + **React** + **FastAPI**.

## Stack
- **Frontend**: React + Vite + Tailwind CSS v4 + Framer Motion + Recharts
- **Backend**: FastAPI + ChromaDB + LangChain + LangGraph + AWS Bedrock
- **AI Models**: Nova Micro → Nova Lite → Claude Haiku → Claude Sonnet (fallback chain)
- **CI/CD**: Jenkins → Amazon ECR → Kubernetes
- **Containerization**: Docker (multi-stage frontend, slim backend)

---

## Features
- 🤖 AI Chat powered by LangGraph ReAct agent (autonomous tool selection)
- 📊 Health Dashboard with live BMI, metric cards, weight trend chart, macro pie chart
- 📝 Daily Log with gamification (XP levels, streaks, badges)
- 🏆 30-Day Challenge tracker
- 📸 Progress photo upload
- 🎤 Voice input (browser speech-to-text)
- ⌚ Mock wearable sync (Fitbit/Apple Watch)
- ⏱️ Workout timer with circular progress
- 📋 Full weekly health report generation
- 🎉 Confetti animations on saves

---

## Architecture & Implementation

### RAG Pipeline and Vector Database

The RAG (Retrieval-Augmented Generation) pipeline is implemented in two layers:

**Layer 1 — Manual RAG** (`services/rag_pipeline.py`):
- User query → `BedrockClient.generate_embeddings()` calls Amazon Titan Embed Text v1 via boto3
- Embedding vector → `ChromaSetup.query()` performs cosine similarity search against the `health_knowledge` ChromaDB collection
- Top 3 documents injected into a prompt → `BedrockClient.generate_text()` sends to Bedrock

**Layer 2 — LangChain RAG** (`services/langchain_rag.py`):
- Replaces manual boto3 calls with `ChatBedrock` + `BedrockEmbeddings` from `langchain-aws`
- Uses LangChain's `Chroma` vectorstore wrapper pointing at the same `./chroma_db` persist directory — no data migration needed
- LCEL chain (pipe operator):
  ```
  retriever | _format_docs → RAG_PROMPT | ChatBedrock | StrOutputParser
  ```
- Returns `answer` + `sources` (which health guide categories were retrieved) for frontend transparency
- The `retriever` object (`k=3`, cosine similarity) is exported and reused by all 7 LangGraph tools

**Vector Database** (`services/chroma_setup.py`):
- `chromadb.PersistentClient` with HNSW cosine space index
- Collection: `health_knowledge` — stores 20 curated health guide embeddings
- Operations: `add_documents()`, `query()`, `clear_collection()`, `get_count()`
- Initialized on demand via the `/api/initialize` endpoint (click "Initialize AI" in sidebar)

---

### LangGraph Agent Workflow

Implemented in `services/langgraph_agent.py` using `langgraph.prebuilt.create_react_agent`.

**Why LangGraph over the old FitnessAgent:**
- Old agent: frontend sends `mode="workout_plan"` → backend calls one hardcoded function
- New agent: frontend sends plain text → LLM autonomously decides which tools to call

**ReAct Loop:**
```
[START] → [LLM reasons] → [tool call?]
               ↑                ↓
           [observe]  ←  [tool executes]
               ↓
           [done?] → [END: final response]
```

**7 registered tools** (each decorated with `@tool`; the LLM reads their docstrings to decide when to call them):

| Tool | Purpose |
|---|---|
| `search_knowledge` | Semantic search over ChromaDB health guides |
| `analyze_health_metrics` | Parses BMI, BP, blood sugar, cholesterol, sleep, stress with clinical flags |
| `generate_workout_plan` | 7-day personalized plan using profile + retrieved knowledge |
| `generate_diet_plan` | Calorie targets, macros, 7-day meals, condition-specific restrictions |
| `generate_motivation` | Personalized motivational message with 3 action steps |
| `analyze_progress` | Trends from daily logs: adherence %, weight delta, avg sleep/steps/energy |
| `generate_health_report` | Comprehensive report combining metrics + progress + knowledge |

**Memory**: `MemorySaver` checkpointer persists full message history (HumanMessage, AIMessage, ToolMessage) keyed by `thread_id` (one per user session). Each `/api/agent-v2` call passes `session_id` as the thread key.

**Example multi-tool flow** — user says *"I have diabetes and want to lose weight"*:
1. Agent calls `search_knowledge("diabetes weight loss")`
2. Agent calls `analyze_health_metrics("metabolic")`
3. Agent calls `generate_diet_plan("low-GI, diabetic-safe")`
4. Synthesizes all three results into one response

---

### FastAPI Backend Integration

Entry point: `app/main.py` — FastAPI app with CORS middleware, mounts `app/api/routes.py`.

**API Endpoints** (`/api/`):

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/initialize` | Load 20 health guides into ChromaDB |
| GET | `/status` | Returns guide count + readiness |
| POST | `/agent` | Original mode-based agent (legacy) |
| POST | `/query` | Direct RAG query via `rag_pipeline.py` |
| POST | `/rag` | LangChain LCEL RAG chain with source tracking |
| POST | `/agent-v2` | **LangGraph ReAct agent** — autonomous tool selection |

**Request model for `/agent-v2`**:
```python
class AgentV2Request(BaseModel):
    message: str
    profile: Optional[dict] = None
    logs: Optional[list] = None
    session_id: str = "default"
```

**Response includes** `response`, `tools_used` (reasoning trace), `mode`, `session_id`.

Run locally:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
Interactive docs at `http://localhost:8080/docs`.

---

### Jenkins CI/CD Automation

Defined in `Jenkinsfile` — 5-stage declarative pipeline:

```
Prepare Workspace → Login to ECR → Build & Push Backend → Build & Push Frontend → Deploy to Kubernetes
```

**Stage details:**
1. **Prepare Workspace** — copies project files from `/opt/project/` into the Jenkins workspace
2. **Login to ECR** — uses `AmazonWebServicesCredentialsBinding` with credential ID `aws-ecr-creds` to authenticate Docker with Amazon ECR (`633193633631.dkr.ecr.us-east-1.amazonaws.com`)
3. **Build & Push Backend** — `docker build` from `backend/Dockerfile`, tags and pushes `healthai-backend:latest` to ECR
4. **Build & Push Frontend** — `docker build` from `frontend/Dockerfile` (multi-stage), tags and pushes `healthai-frontend:latest` to ECR
5. **Deploy to Kubernetes** — `kubectl apply` on both deployment manifests, then `kubectl rollout status` to confirm successful rollout

Environment variables set at pipeline level: `AWS_REGION`, `ECR_ACCOUNT`, `BACKEND_IMAGE`, `FRONTEND_IMAGE`.

---

### Docker Containerization

**Backend** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```
- Slim base image minimizes attack surface and image size
- Dependencies installed before copying source for Docker layer caching

**Frontend** (`frontend/Dockerfile`) — multi-stage build:
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```
- Builder stage compiles React/Vite; final image is nginx:alpine (~25MB) with only static assets
- Custom `nginx.conf` handles SPA routing

---

### Kubernetes Deployment

Manifests in `k8s/`:

**Backend** (`backend-deployment.yaml`):
- `Deployment` with 1 replica, image pulled from ECR
- `imagePullPolicy: Never` (local cluster / minikube)
- AWS credentials injected via `envFrom.secretRef` → `healthai-secrets` Secret
- `ClusterIP` Service on port 8080

**Frontend** (`frontend-deployment.yaml`):
- `Deployment` with 1 replica, nginx container on port 80
- `NodePort` Service exposing port `30007` for external browser access

**Secrets** (`secrets.yaml`):
- Kubernetes `Secret` of type `Opaque` storing AWS credentials, region, model ID, API config
- ⚠️ **Never commit real credentials to this file** — use `kubectl create secret` or a secrets manager (AWS Secrets Manager / Sealed Secrets) in production

---

### Prometheus and Grafana Monitoring

> Monitoring integration is planned for the next iteration. The following describes the intended setup:

- **Prometheus**: scrape FastAPI metrics via `prometheus-fastapi-instrumentator` middleware, exposing `/metrics` endpoint. Key metrics: request latency, error rate, Bedrock API call duration, ChromaDB query time.
- **Grafana**: dashboards for API throughput, P95 latency per endpoint, LangGraph tool call frequency, and Bedrock model fallback rate.
- Kubernetes: deploy Prometheus + Grafana via `kube-prometheus-stack` Helm chart; add `ServiceMonitor` CRD pointing at `healthai-backend-service`.

---

## Setup

### 1. Configure AWS credentials
Edit `.env`:
```
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
AWS_REGION=us-east-1
```

### 2. Start Backend
```bash
start_backend.bat
# or manually:
cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 8080 --reload
```

### 3. Start Frontend
```bash
start_frontend.bat
# or manually:
cd frontend
npm install
npm run dev
```

### 4. Open App
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/docs

### 5. Initialize AI Knowledge Base
Click **"Initialize AI"** in the sidebar to load 20 health guides into ChromaDB.

---

## Project Structure
```
healthai/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                ← FastAPI app + CORS
│       ├── config.py              ← Settings (env vars)
│       ├── api/routes.py          ← All API endpoints
│       └── services/
│           ├── bedrock_client.py  ← boto3 Bedrock wrapper (model fallback chain)
│           ├── chroma_setup.py    ← ChromaDB persistent vector store
│           ├── rag_pipeline.py    ← Manual RAG (embed → query → generate)
│           ├── langchain_rag.py   ← LangChain LCEL RAG chain + retriever
│           ├── langgraph_agent.py ← LangGraph ReAct agent + 7 tools + MemorySaver
│           └── fitness_agent.py   ← Legacy mode-based agent + 20 health guides
├── frontend/
│   ├── Dockerfile                 ← Multi-stage Node build → nginx:alpine
│   ├── nginx.conf
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── AuthScreen.jsx
│       │   └── Sidebar.jsx
│       ├── pages/
│       │   ├── ProfileTab.jsx
│       │   ├── DashboardTab.jsx
│       │   ├── ChatTab.jsx
│       │   ├── LogTab.jsx
│       │   ├── ReportTab.jsx
│       │   └── FriendsTab.jsx
│       └── utils/
│           ├── api.js
│           └── helpers.js
├── k8s/
│   ├── backend-deployment.yaml   ← K8s Deployment + ClusterIP Service
│   ├── frontend-deployment.yaml  ← K8s Deployment + NodePort Service
│   └── secrets.yaml              ← K8s Secret (⚠️ never commit real values)
├── Jenkinsfile                   ← 5-stage CI/CD pipeline
├── .env
├── start_backend.bat
└── start_frontend.bat
```
