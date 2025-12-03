from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from monitors.uptime_monitor import UptimeMonitor
from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/api/v1/uptime",
    tags=["uptime"],
    responses={404: {"description": "Not found"}},
)

# Get singleton instance
uptime_monitor = UptimeMonitor()

class MonitorConfig(BaseModel):
    name: str
    type: str  # http, port
    url: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    interval: int = 60

@router.get("/monitors")
async def get_monitors(user=Depends(get_current_user)):
    """Get all monitors and their current status"""
    return uptime_monitor.get_status()

@router.post("/monitors")
async def add_monitor(monitor: MonitorConfig, user=Depends(get_current_user)):
    """Add a new monitor"""
    config = monitor.dict()
    added_monitor = uptime_monitor.add_monitor(config)
    return {"status": "success", "monitor": added_monitor}

@router.delete("/monitors/{monitor_id}")
async def delete_monitor(monitor_id: str, user=Depends(get_current_user)):
    """Delete a monitor"""
    uptime_monitor.remove_monitor(monitor_id)
    return {"status": "success", "message": f"Monitor {monitor_id} removed"}
