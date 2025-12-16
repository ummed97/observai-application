import logging
import json
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Connector, TopologyNode, AsyncSessionLocal
from connectors.azure_connector import AzureConnector
from knowledge_graph.graph_engine import KnowledgeGraphEngine

logger = logging.getLogger(__name__)

class IngestionService:
    def __init__(self):
        self.graph_engine = KnowledgeGraphEngine()

    async def process_connector_sync(self, connector_id: str):
        """
        Full sync process for a connector:
        1. Fetch resources from Cloud Provider
        2. Update Postgres Inventory (TopologyNode)
        3. Update Knowledge Graph (Neo4j)
        """
        async with AsyncSessionLocal() as db:
            # 1. Get Connector
            result = await db.execute(select(Connector).where(Connector.id == connector_id))
            connector = result.scalar_one_or_none()
            
            if not connector:
                logger.error(f"Connector {connector_id} not found")
                return

            try:
                # Update status
                connector.last_sync_status = "syncing"
                await db.commit()

                # 2. Fetch Resources
                if connector.provider == "azure":
                    client = AzureConnector(connector.credentials)
                    resources = await client.fetch_resources()
                else:
                    raise ValueError(f"Unsupported provider: {connector.provider}")

                logger.info(f"Fetched {len(resources)} resources for connector {connector.name}")

                # 3. Ingest into Postgres (Inventory)
                await self._ingest_to_postgres(db, resources, connector.organization_id)
                
                # 4. Ingest into Neo4j (Graph)
                await self.graph_engine.ingest_topology(resources, connector.organization_id)

                # Update success status
                connector.last_sync_status = "success"
                connector.last_sync_time = datetime.utcnow()
                await db.commit()

            except Exception as e:
                logger.error(f"Sync failed for connector {connector_id}: {e}")
                connector.last_sync_status = "failed"
                await db.commit()
                raise e

    async def _ingest_to_postgres(self, db: AsyncSession, resources: list, org_id: str):
        """
        Upsert resources into topology_nodes table
        """
        for r in resources:
            # Check if node exists
            result = await db.execute(select(TopologyNode).where(TopologyNode.node_id == r['id']))
            node = result.scalar_one_or_none()
            
            if node:
                # Update
                node.name = r['name']
                node.type = r['type']
                node.location = r['location']
                node.tags = r['tags']
                node.updated_at = datetime.utcnow()
                # Ensure tenant_id is set (migration support)
                if not node.tenant_id:
                    node.tenant_id = org_id
            else:
                # Create
                node = TopologyNode(
                    node_id=r['id'],
                    name=r['name'],
                    type=r['type'],
                    status="unknown", # Status comes from metrics/health checks later
                    node_metadata={
                        "subscription_id": r['subscription_id'],
                        "resource_group": r['resource_group'],
                        "properties": r.get('properties', {})
                    },
                    labels=r['tags'],
                    tenant_id=org_id
                )
                db.add(node)
        
        await db.commit()
