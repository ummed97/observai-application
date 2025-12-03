from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from agents.orchestrator import AgentOrchestrator
from auth.dependencies import get_current_user
from fastapi import Request

router = APIRouter(
    prefix="/api/v1/security",
    tags=["security"],
    responses={404: {"description": "Not found"}},
)

@router.get("/status")
async def get_security_status(request: Request, user=Depends(get_current_user)):
    """Get current security status"""
    orchestrator: AgentOrchestrator = request.app.state.orchestrator
    security_agent = orchestrator.agents.get("security")
    
    if not security_agent:
        raise HTTPException(status_code=503, detail="Security agent not initialized")
        
    return await security_agent.get_status()

@router.get("/alerts")
async def get_security_alerts(request: Request, user=Depends(get_current_user)):
    """Get active security alerts"""
    orchestrator: AgentOrchestrator = request.app.state.orchestrator
    security_agent = orchestrator.agents.get("security")
    
    if not security_agent:
        raise HTTPException(status_code=503, detail="Security agent not initialized")
        
    # We need to expose alerts from the agent. 
    # The agent has `self.alerts`. We should add a method to get them or access directly.
    # Let's assume we can access `security_agent.alerts` directly for now or via `get_status` which returns counts.
    # We should update SecurityAgent to return alerts list.
    
    return security_agent.get_alerts()

@router.post("/scan")
async def trigger_security_scan(request: Request, user=Depends(get_current_user)):
    """Trigger a manual security scan"""
    orchestrator: AgentOrchestrator = request.app.state.orchestrator
    
    result = await orchestrator.trigger_agent("security", {"task_type": "scan"})
    return result
