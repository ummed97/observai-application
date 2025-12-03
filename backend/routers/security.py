from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from agents.orchestrator import AgentOrchestrator
from routers.auth import get_current_user

# We need a way to access the global orchestrator instance
# In a real app, this might be better handled via dependency injection
# For now, we'll import the global instance from main (circular import risk, but we'll handle it carefully)
# Actually, better to use a dependency that retrieves it from app state or similar.
# But given the current structure in main.py, we can't easily import `agent_orchestrator` without circular imports.
# So we will rely on the fact that the orchestrator is a singleton-like service or pass it via app state.
# However, `main.py` defines `agent_orchestrator` globally. 

# Alternative: Define the router here, but inject the orchestrator in main.py when including the router? 
# FastAPI doesn't make that super easy for global variables.

# Let's use a dependency that tries to find the orchestrator.
# Or better, let's move the global `agent_orchestrator` to a separate module `services.py` or similar to avoid circular imports.
# But to avoid large refactors, we will assume `main.py` will attach it to `app.state` or similar, 
# OR we can just instantiate a new Orchestrator if it was a singleton (it's not currently).

# EASIEST PATH: 
# We will create the router here. In `main.py`, we will pass the orchestrator to the router endpoints 
# by using a dependency that returns the global variable from `main`. 
# But `main` imports `routers.security`, so `routers.security` cannot import `main`.

# SOLUTION:
# We will define a `get_orchestrator` dependency in a new file `dependencies.py` or similar, 
# but the instance is in `main`.
# Let's use `request.app.state.orchestrator`. We need to set this in `main.py`.

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
