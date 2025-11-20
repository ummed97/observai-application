"""
AI-Agentic Observability Platform - Main Application
FastAPI backend with multi-agent system
"""
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import asyncio
import logging
import os
import json
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
import jwt

from agents.orchestrator import AgentOrchestrator
from data_ingestion.collector import DataCollector
from knowledge_graph.graph_engine import KnowledgeGraphEngine
from routers.auth import router as auth_router

# Load environment variables
# We check if OPENAI_API_KEY is missing or looks like a placeholder (often passed by docker-compose defaults)
# If so, we force reload from the local .env file
load_dotenv()
current_key = os.getenv("OPENAI_API_KEY", "")
if not current_key or current_key.startswith("sk-your-"):
    load_dotenv(override=True)

# Logging setup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup

DATABASE_URL = "postgresql+asyncpg://observai:observai@localhost:5432/observai"
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# Global instances

agent_orchestrator: Optional[AgentOrchestrator] = None
data_collector: Optional[DataCollector] = None
knowledge_graph: Optional[KnowledgeGraphEngine] = None
websocket_connections: List[WebSocket] = []

# Security

security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global agent_orchestrator, data_collector, knowledge_graph

    logger.info("Starting AI-Agentic Observability Platform...")

    # Initialize core systems
    agent_orchestrator = AgentOrchestrator()
    data_collector = DataCollector()
    knowledge_graph = KnowledgeGraphEngine()

    # Start background tasks
    asyncio.create_task(agent_orchestrator.start())
    asyncio.create_task(data_collector.start())

    logger.info("Platform started successfully")

    yield

    # Cleanup
    logger.info("Shutting down platform...")
    await agent_orchestrator.stop()
    await data_collector.stop()

app = FastAPI(
    title="AI-Agentic Observability Platform",
    description="Unified, AI-driven observability fabric with autonomous agents",
    version="1.0.0",
    lifespan=lifespan
)

# CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)

# ===== MODELS =====

class MetricData(BaseModel):
    timestamp: datetime
    source: str
    metric_name: str
    value: float
    labels: Dict[str, str] = {}

class IncidentCreate(BaseModel):
    title: str
    severity: str
    description: Optional[str] = None
    affected_services: List[str] = []

class IncidentResponse(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    created_at: datetime
    root_cause: Optional[str] = None
    remediation_steps: List[str] = []
    agent_analysis: Optional[Dict[str, Any]] = None

class AgentStatus(BaseModel):
    agent_id: str
    agent_type: str
    status: str
    last_action: Optional[str] = None
    success_rate: float
    actions_taken: int

class TopologyNode(BaseModel):
    node_id: str
    name: str
    type: str  # service, database, pod, etc.
    status: str
    node_metadata: Dict[str, Any]
    dependencies: List[str]

class NLQueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class NLQueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]
    confidence: float
    visualizations: Optional[Dict[str, Any]] = None

class RemediationAction(BaseModel):
    action_id: str
    action_type: str
    target: str
    status: str
    approval_required: bool
    estimated_impact: str

# ===== AUTHENTICATION =====

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== DATABASE =====

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ===== ROUTERS =====
from routers import auth
app.include_router(auth.router)

# ===== HEALTH CHECK =====

@app.get("/health")
async def health_check():
    """Platform health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "components": {
            "agents": agent_orchestrator.get_status() if agent_orchestrator else "not_initialized",
            "data_collector": "running" if data_collector else "not_initialized",
            "knowledge_graph": "connected" if knowledge_graph else "not_initialized"
        }
    }

# ===== DATA INGESTION =====

@app.post("/api/v1/ingest/metrics")
async def ingest_metrics(metrics: List[MetricData], user=Depends(get_current_user)):
    """Ingest metrics from various sources"""
    try:
        await data_collector.ingest_metrics(metrics)
        return {"status": "accepted", "count": len(metrics)}
    except Exception as e:
        logger.error(f"Metric ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/metrics/query")
async def query_metrics(
    metric_name: str,
    start_time: datetime,
    end_time: datetime,
    labels: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Query metrics with time range"""
    try:
        label_dict = json.loads(labels) if labels else {}
        result = await data_collector.query_metrics(
            metric_name, start_time, end_time, label_dict
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== INCIDENTS =====

@app.get("/api/v1/incidents", response_model=List[IncidentResponse])
async def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    user=Depends(get_current_user)
):
    """Get incidents with optional filters"""
    try:
        incidents = await agent_orchestrator.get_incidents(status, severity, limit)
        return incidents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/incidents", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate, user=Depends(get_current_user)):
    """Create new incident - triggers agent analysis"""
    try:
        result = await agent_orchestrator.handle_incident(incident.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str, user=Depends(get_current_user)):
    """Get detailed incident information"""
    try:
        incident = await agent_orchestrator.get_incident_details(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return incident
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== AI AGENTS =====

@app.get("/api/v1/agents", response_model=List[AgentStatus])
async def get_agents(user=Depends(get_current_user)):
    """Get all agent statuses"""
    try:
        return await agent_orchestrator.get_agent_statuses()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/agents/{agent_id}/trigger")
async def trigger_agent(agent_id: str, context: Dict[str, Any], user=Depends(get_current_user)):
    """Manually trigger specific agent"""
    try:
        result = await agent_orchestrator.trigger_agent(agent_id, context)
        return {"status": "triggered", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== TOPOLOGY & KNOWLEDGE GRAPH =====

@app.get("/api/v1/topology/nodes", response_model=List[TopologyNode])
async def get_topology_nodes(user=Depends(get_current_user)):
    """Get all topology nodes"""
    try:
        return await knowledge_graph.get_all_nodes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/topology/graph")
async def get_topology_graph(user=Depends(get_current_user)):
    """Get complete topology graph"""
    try:
        return await knowledge_graph.get_full_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/topology/dependencies/{node_id}")
async def get_node_dependencies(node_id: str, depth: int = 3, user=Depends(get_current_user)):
    """Get dependencies for specific node"""
    try:
        return await knowledge_graph.get_dependencies(node_id, depth)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== NATURAL LANGUAGE INTERFACE =====

@app.post("/api/v1/query", response_model=NLQueryResponse)
async def natural_language_query(request: NLQueryRequest, user=Depends(get_current_user)):
    """Process natural language query"""
    try:
        result = await agent_orchestrator.process_nl_query(request.query, request.context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== REMEDIATION =====

@app.get("/api/v1/remediation/pending")
async def get_pending_remediations(user=Depends(get_current_user)):
    """Get pending remediation actions requiring approval"""
    try:
        return await agent_orchestrator.get_pending_remediations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/remediation/{action_id}/approve")
async def approve_remediation(action_id: str, user=Depends(get_current_user)):
    """Approve pending remediation action"""
    try:
        result = await agent_orchestrator.approve_remediation(action_id, user)
        return {"status": "approved", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/remediation/{action_id}/reject")
async def reject_remediation(action_id: str, reason: str, user=Depends(get_current_user)):
    """Reject pending remediation action"""
    try:
        await agent_orchestrator.reject_remediation(action_id, reason, user)
        return {"status": "rejected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== COST ANALYTICS =====

@app.get("/api/v1/cost/summary")
async def get_cost_summary(
    start_date: datetime,
    end_date: datetime,
    group_by: str = "service",
    user=Depends(get_current_user)
):
    """Get cost summary with grouping"""
    try:
        return await agent_orchestrator.get_cost_analysis(start_date, end_date, group_by)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cost/waste")
async def get_cost_waste(user=Depends(get_current_user)):
    """Get cost waste detection results"""
    try:
        return await agent_orchestrator.detect_cost_waste()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== PREDICTIONS =====

@app.get("/api/v1/predictions/capacity")
async def predict_capacity(service: str, horizon_days: int = 7, user=Depends(get_current_user)):
    """Predict capacity needs"""
    try:
        return await agent_orchestrator.predict_capacity(service, horizon_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/predictions/failures")
async def predict_failures(user=Depends(get_current_user)):
    """Get failure predictions"""
    try:
        return await agent_orchestrator.predict_failures()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== WEBSOCKET =====

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await websocket.accept()
    websocket_connections.append(websocket)

    try:
        while True:
            # Keep connection alive and send updates
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        websocket_connections.remove(websocket)

async def broadcast_update(message: Dict[str, Any]):
    """Broadcast update to all connected clients"""
    for websocket in websocket_connections:
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"WebSocket broadcast error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
