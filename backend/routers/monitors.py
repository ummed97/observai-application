"""
Uptime Monitor API Router
Endpoints for managing uptime monitors
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime

from models.database import Monitor, get_db
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/monitors", tags=["Monitors"])

class MonitorCreate(BaseModel):
    name: str
    url: str
    monitor_type: str = "http"  # http, ping, port
    interval_seconds: int = 600  # 10 minutes

class MonitorResponse(BaseModel):
    id: str
    name: str
    url: str
    monitor_type: str
    interval_seconds: int
    is_active: bool
    last_status: Optional[str]
    last_checked: Optional[datetime]
    response_time: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[MonitorResponse])
async def get_monitors(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all monitors for the current user"""
    result = await db.execute(
        select(Monitor).where(Monitor.user_id == user["user_id"])
    )
    monitors = result.scalars().all()
    return monitors

@router.post("", response_model=MonitorResponse)
async def create_monitor(
    monitor_data: MonitorCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new monitor"""
    # Validate monitor type
    if monitor_data.monitor_type not in ["http", "ping", "port"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid monitor type. Must be 'http', 'ping', or 'port'"
        )
    
    # Create monitor
    new_monitor = Monitor(
        user_id=user["user_id"],
        name=monitor_data.name,
        url=monitor_data.url,
        monitor_type=monitor_data.monitor_type,
        interval_seconds=monitor_data.interval_seconds
    )
    
    db.add(new_monitor)
    await db.commit()
    await db.refresh(new_monitor)
    
    return new_monitor

@router.delete("/{monitor_id}")
async def delete_monitor(
    monitor_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a monitor"""
    result = await db.execute(
        select(Monitor).where(
            Monitor.id == monitor_id,
            Monitor.user_id == user["user_id"]
        )
    )
    monitor = result.scalar_one_or_none()
    
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitor not found"
        )
    
    await db.delete(monitor)
    await db.commit()
    
    return {"status": "deleted", "monitor_id": monitor_id}

@router.get("/{monitor_id}", response_model=MonitorResponse)
async def get_monitor(
    monitor_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific monitor"""
    result = await db.execute(
        select(Monitor).where(
            Monitor.id == monitor_id,
            Monitor.user_id == user["user_id"]
        )
    )
    monitor = result.scalar_one_or_none()
    
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitor not found"
        )
    
    return monitor
