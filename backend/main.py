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

# Load environment variables
load_dotenv()

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
import jwt

from auth.jwt_handler import validate_token
from auth.dependencies import get_current_user
from models.database import get_db
from agents.orchestrator import AgentOrchestrator
from data_ingestion.collector import DataCollector
from data_ingestion.app_insights_collector import AppInsightsCollector
from knowledge_graph.graph_engine import KnowledgeGraphEngine
from monitors.uptime_monitor import UptimeMonitor
from routers.auth import router as auth_router
from routers.chat import router as chat_router
from routers.connectors import router as connectors_router
from routers.monitors import router as monitors_router

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

DATABASE_URL = "postgresql+asyncpg://observai:observai@observai-postgres:5432/observai"
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# Global instances

agent_orchestrator: Optional[AgentOrchestrator] = None
data_collector: Optional[DataCollector] = None
app_insights_collector: Optional[AppInsightsCollector] = None
knowledge_graph: Optional[KnowledgeGraphEngine] = None
uptime_service: Optional[UptimeMonitor] = None
websocket_connections: List[WebSocket] = []

# Security

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global agent_orchestrator, data_collector, app_insights_collector, knowledge_graph, uptime_service

    logger.info("Starting AI-Agentic Observability Platform...")

    # Initialize database
    try:
        from init_db import init_db
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    # Initialize core systems
    agent_orchestrator = AgentOrchestrator()
    data_collector = DataCollector()
    app_insights_collector = AppInsightsCollector()
    knowledge_graph = KnowledgeGraphEngine()
    uptime_service = UptimeMonitor()
    
    # Store orchestrator in app state for routers
    app.state.orchestrator = agent_orchestrator

    # Start background tasks
    asyncio.create_task(agent_orchestrator.start())
    asyncio.create_task(data_collector.start())
    asyncio.create_task(uptime_service.start())

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
app.include_router(chat_router)
app.include_router(connectors_router)
app.include_router(monitors_router)

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
    session_id: Optional[str] = None

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
from auth.dependencies import get_current_user, security

# ===== DATABASE =====

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
    """Get all topology nodes for current org"""
    try:
        org_id = user.get("org_id")
        return await knowledge_graph.get_all_nodes(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/topology/graph")
async def get_topology_graph(user=Depends(get_current_user)):
    """Get complete topology graph for current org"""
    try:
        org_id = user.get("org_id")
        return await knowledge_graph.get_full_graph(org_id)
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
async def natural_language_query(request: NLQueryRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Process natural language query"""
    try:
        # Inject system summary into context
        org_id = user.get("org_id")
        system_summary = await knowledge_graph.get_system_summary(org_id)
        
        # Ensure context exists
        if not request.context:
            request.context = {}
            
        request.context["system_summary"] = system_summary
        request.context["user_info"] = {
            "name": user.get("sub"),
            "role": user.get("role"),
            "org_id": org_id
        }
        
        result = await agent_orchestrator.process_nl_query(request.query, request.context)
        
        # Save to chat history (non-blocking, don't fail the query if this fails)
        try:
            from models.database import ChatHistory
            chat_entry = ChatHistory(
                user_id=user.get("user_id"),
                session_id=request.session_id,
                query=request.query,
                response=result.get("answer", "")
            )
            db.add(chat_entry)
            await db.commit()
        except Exception as db_error:
            logger.error(f"Failed to save chat history: {db_error}")
            await db.rollback()
            # Don't fail the query if chat history save fails
        
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
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get cost summary with grouping"""
    try:
        # Fetch Azure Connector for this org
        from models.database import Connector
        from sqlalchemy import select
        
        result = await db.execute(
            select(Connector).where(
                Connector.organization_id == user["org_id"],
                Connector.provider == "azure",
                Connector.is_active == True
            )
        )
        connector = result.scalars().first()
        
        credentials = None
        subscription_id = None
        
        if connector:
            credentials = connector.credentials
            # Extract subscription ID from credentials or fetch it if stored separately
            # For now, we assume it might be in credentials or we can't use it without it
            # The AzureConnector stores client_id, client_secret, tenant_id.
            # We need subscription_id for Cost Management.
            # Let's assume it's stored in credentials for now, or we need to update Connector model/logic
            # to store subscription_id explicitly.
            # Based on previous code, AzureConnector fetches resources across all subscriptions.
            # But Cost Management usually requires a specific scope (Subscription or Management Group).
            # We'll try to find a subscription ID from the fetched resources or require it in credentials.
            # For this implementation, let's assume 'subscription_id' is added to credentials during setup
            # or we pick the first one available if we had a way to list them.
            # For MVP, let's check if it's in credentials.
            subscription_id = credentials.get("subscription_id")
            
        return await agent_orchestrator.get_cost_analysis(
            start_date, 
            end_date, 
            group_by,
            credentials=credentials,
            subscription_id=subscription_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cost/waste")
async def get_cost_waste(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get cost waste detection results"""
    try:
        # Fetch Azure Connector for this org
        from models.database import Connector
        from sqlalchemy import select
        
        result = await db.execute(
            select(Connector).where(
                Connector.organization_id == user["org_id"],
                Connector.provider == "azure",
                Connector.is_active == True
            )
        )
        connector = result.scalars().first()
        
        credentials = None
        subscription_id = None
        
        if connector:
            credentials = connector.credentials
            subscription_id = credentials.get("subscription_id")

        return await agent_orchestrator.detect_cost_waste(
            credentials=credentials,
            subscription_id=subscription_id
        )
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

# ===== APPLICATION INSIGHTS =====

@app.get("/api/v1/insights/logs")
async def get_application_logs(
    hours: int = 1,
    severity: str = None,
    user=Depends(get_current_user)
):
    """Get application logs from Application Insights"""
    try:
        if not app_insights_collector or not app_insights_collector.enabled:
            return {"status": "disabled", "message": "Application Insights not configured", "logs": []}
        return await app_insights_collector.get_recent_logs(hours, severity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/insights/exceptions")
async def get_exceptions(hours: int = 24, user=Depends(get_current_user)):
    """Get recent exceptions from Application Insights"""
    try:
        if not app_insights_collector or not app_insights_collector.enabled:
            return {"status": "disabled", "message": "Application Insights not configured", "exceptions": []}
        return await app_insights_collector.get_exceptions(hours)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/insights/performance")
async def get_performance_metrics(hours: int = 24, user=Depends(get_current_user)):
    """Get request performance metrics"""
    try:
        if not app_insights_collector or not app_insights_collector.enabled:
            return {"status": "disabled", "message": "Application Insights not configured", "metrics": []}
        result = await app_insights_collector.get_request_metrics(hours)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/insights/summary")
async def get_performance_summary(hours: int = 1, user=Depends(get_current_user)):
    """Get overall performance summary"""
    try:
        if not app_insights_collector or not app_insights_collector.enabled:
            return {"status": "disabled", "summary": {}}
        return await app_insights_collector.get_performance_summary(hours)
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
