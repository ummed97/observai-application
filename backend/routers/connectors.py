from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

from models.database import get_db, Connector, OrganizationMember
from auth.jwt_handler import get_current_user_token
from connectors.azure_connector import AzureConnector

router = APIRouter(prefix="/api/v1/connectors", tags=["Connectors"])

# Pydantic Models
class ConnectorCreate(BaseModel):
    name: str
    provider: str  # azure
    client_id: str
    client_secret: str
    tenant_id: str

class ConnectorResponse(BaseModel):
    id: str
    name: str
    provider: str
    is_active: bool
    last_sync_status: Optional[str]
    last_sync_time: Optional[datetime]
    created_at: datetime

# Helper to check permissions
async def check_org_permission(user_token: dict, db: AsyncSession):
    org_id = user_token.get("org_id")
    role = user_token.get("role")
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization context")
    return org_id, role

@router.get("/", response_model=List[ConnectorResponse])
async def list_connectors(
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    org_id, _ = await check_org_permission(token, db)
    
    result = await db.execute(select(Connector).where(Connector.organization_id == org_id))
    connectors = result.scalars().all()
    return connectors

@router.post("/", response_model=ConnectorResponse)
async def create_connector(
    connector_data: ConnectorCreate,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    org_id, role = await check_org_permission(token, db)
    
    if role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can add connectors")
    
    if connector_data.provider != "azure":
        raise HTTPException(status_code=400, detail="Only 'azure' provider is supported currently")
    
    # Validate Credentials
    creds = {
        "client_id": connector_data.client_id,
        "client_secret": connector_data.client_secret,
        "tenant_id": connector_data.tenant_id
    }
    
    try:
        connector_client = AzureConnector(creds)
        await connector_client.validate()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")
    
    # Save to DB
    new_connector = Connector(
        organization_id=org_id,
        name=connector_data.name,
        provider=connector_data.provider,
        credentials=creds, # In prod, encrypt this!
        is_active=True,
        last_sync_status="pending"
    )
    
    db.add(new_connector)
    await db.commit()
    await db.refresh(new_connector)
    
    return new_connector

@router.delete("/{connector_id}")
async def delete_connector(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    org_id, role = await check_org_permission(token, db)
    
    if role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete connectors")
        
    result = await db.execute(select(Connector).where(Connector.id == connector_id, Connector.organization_id == org_id))
    connector = result.scalar_one_or_none()
    
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
        
    await db.delete(connector)
    await db.commit()
    
    return {"message": "Connector deleted"}

async def sync_connector_task(connector_id: str):
    # Background task for syncing
    from data_ingestion.ingestion_service import IngestionService
    service = IngestionService()
    await service.process_connector_sync(connector_id)

@router.post("/{connector_id}/sync")
async def sync_connector(
    connector_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    org_id, _ = await check_org_permission(token, db)
    
    result = await db.execute(select(Connector).where(Connector.id == connector_id, Connector.organization_id == org_id))
    connector = result.scalar_one_or_none()
    
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    # We don't need to pass session factory anymore, IngestionService handles it
    background_tasks.add_task(sync_connector_task, connector_id)
    
    return {"message": "Sync started"}
