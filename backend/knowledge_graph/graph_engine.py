"""
Knowledge Graph Engine - Neo4j integration with Azure Resource Discovery
"""
import logging
import os
from typing import List, Dict, Any
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.monitor import MonitorManagementClient
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)

class KnowledgeGraphEngine:
    def __init__(self):
        self.driver = None
        self.subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        self.neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        self.neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD", "observai123")
        
        # Initialize Neo4j Driver
        try:
            self.driver = GraphDatabase.driver(
                self.neo4j_uri, 
                auth=(self.neo4j_user, self.neo4j_password)
            )
            logger.info(f"Connected to Neo4j at {self.neo4j_uri}")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")

        # Initialize Azure clients if credentials available
        try:
            if self.subscription_id:
                credential = DefaultAzureCredential()
                self.resource_client = ResourceManagementClient(credential, self.subscription_id)
                self.monitor_client = MonitorManagementClient(credential, self.subscription_id)
                logger.info(f"Knowledge Graph Engine initialized with Azure subscription: {self.subscription_id}")
            else:
                logger.warning("No Azure subscription ID configured for topology discovery")
                self.resource_client = None
                self.monitor_client = None
        except Exception as e:
            logger.error(f"Failed to initialize Azure clients: {e}")
            self.resource_client = None
            self.monitor_client = None
    
    def close(self):
        if self.driver:
            self.driver.close()

    async def discover_azure_resources(self) -> List[Dict[str, Any]]:
        """Discover all Azure resources and sync to Neo4j"""
        if not self.resource_client:
            logger.warning("Azure client not initialized, returning mock data")
            return await self.get_all_nodes() # Fallback to existing graph data
        
        try:
            logger.info("Discovering Azure resources...")
            discovered = []
            
            # Query all resources in subscription
            resources = list(self.resource_client.resources.list())
            
            for resource in resources:
                node = {
                    "node_id": resource.id,
                    "name": resource.name,
                    "type": self._map_resource_type(resource.type),
                    "azure_type": resource.type,
                    "location": resource.location,
                    "resource_group": resource.id.split('/')[4] if len(resource.id.split('/')) > 4 else "unknown",
                    "status": "healthy",
                    "metadata": {
                        "tags": resource.tags or {},
                        "kind": getattr(resource, 'kind', None),
                    }
                }
                discovered.append(node)
            
            # Sync to Neo4j
            await self._sync_to_neo4j(discovered)
            
            logger.info(f"Discovered and synced {len(discovered)} Azure resources")
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering Azure resources: {e}")
            return []
    
    async def _sync_to_neo4j(self, nodes: List[Dict[str, Any]]):
        """Persist nodes to Neo4j"""
        if not self.driver:
            return

        with self.driver.session() as session:
            # Create nodes
            for node in nodes:
                session.run(
                    """
                    MERGE (n:Resource {id: $node_id})
                    SET n.name = $name,
                        n.type = $type,
                        n.location = $location,
                        n.resource_group = $resource_group,
                        n.status = $status
                    """,
                    node_id=node["node_id"],
                    name=node["name"],
                    type=node["type"],
                    location=node["location"],
                    resource_group=node["resource_group"],
                    status=node["status"]
                )
            
            # Infer and create relationships (Edges)
            # 1. Resource Group containment
            session.run(
                """
                MATCH (n:Resource)
                MERGE (rg:ResourceGroup {name: n.resource_group})
                MERGE (n)-[:BELONGS_TO]->(rg)
                """
            )
            
            # 2. Heuristic dependencies (e.g., App Service -> Plan)
            # This is simplified; real logic would parse ARM templates or connection strings
            pass

    def _map_resource_type(self, azure_type: str) -> str:
        """Map Azure resource type to topology node type"""
        type_mapping = {
            "Microsoft.Compute/virtualMachines": "vm",
            "Microsoft.Web/sites": "app_service",
            "Microsoft.Sql/servers": "database",
            "Microsoft.DBforPostgreSQL/servers": "database",
            "Microsoft.DBforMySQL/servers": "database",
            "Microsoft.Storage/storageAccounts": "storage",
            "Microsoft.Network/virtualNetworks": "network",
            "Microsoft.Network/networkInterfaces": "network_interface",
            "Microsoft.Network/publicIPAddresses": "public_ip",
            "Microsoft.Insights/components": "app_insights",
            "Microsoft.KeyVault/vaults": "key_vault",
            "Microsoft.ContainerService/managedClusters": "kubernetes",
            "Microsoft.DocumentDB/databaseAccounts": "cosmos_db",
            "Microsoft.Cache/Redis": "redis"
        }
        return type_mapping.get(azure_type, "service")
    
    async def _get_nodes_from_postgres(self) -> List[Dict[str, Any]]:
        """Fallback: Get topology nodes from PostgreSQL"""
        try:
            from models.database import AsyncSessionLocal, TopologyNode
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(TopologyNode))
                nodes = result.scalars().all()
                
                return [
                    {
                        "node_id": node.node_id,
                        "name": node.name,
                        "type": node.type,
                        "status": node.status,
                        "node_metadata": node.node_metadata,
                        "dependencies": []
                    }
                    for node in nodes
                ]
        except Exception as e:
            logger.error(f"Error fetching nodes from PostgreSQL: {e}")
            return []

    async def get_all_nodes(self) -> List[Dict[str, Any]]:
        """Get all topology nodes from Neo4j, fallback to PostgreSQL"""
        if not self.driver:
            logger.info("Neo4j not available, using PostgreSQL")
            return await self._get_nodes_from_postgres()

        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (n:Resource)
                    RETURN n.id as node_id, n.name as name, n.type as type, n.status as status, n.resource_group as resource_group
                    """
                )
                nodes = [dict(record) for record in result]
                
                # If Neo4j is empty, fallback to PostgreSQL
                if not nodes:
                    logger.info("Neo4j empty, falling back to PostgreSQL")
                    return await self._get_nodes_from_postgres()
                
                return nodes
        except Exception as e:
            logger.error(f"Error fetching nodes from Neo4j: {e}")
            return await self._get_nodes_from_postgres()

    async def get_full_graph(self) -> Dict[str, Any]:
        """Get complete topology graph from Neo4j"""
        nodes = await self.get_all_nodes()
        
        # Fetch relationships
        edges = []
        if self.driver:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (a)-[r]->(b)
                    RETURN a.id as source, b.id as target, type(r) as type
                    """
                )
                edges = [dict(record) for record in result]
        
        return {"nodes": nodes, "edges": edges}

    def _get_mock_data(self) -> List[Dict[str, Any]]:
        """Return mock topology data when Neo4j is not available"""
        return [
            {
                "node_id": "svc-1",
                "name": "API Gateway",
                "type": "service",
                "status": "healthy",
                "resource_group": "rg-prod",
                "dependencies": ["svc-2", "svc-3"]
            },
            {
                "node_id": "svc-2",
                "name": "Database",
                "type": "database",
                "status": "healthy",
                "resource_group": "rg-prod",
                "dependencies": []
            },
            {
                "node_id": "svc-3",
                "name": "Cache",
                "type": "redis",
                "status": "healthy",
    def close(self):
        if self.driver:
            self.driver.close()

    async def discover_azure_resources(self) -> List[Dict[str, Any]]:
        """Discover all Azure resources and sync to Neo4j"""
        if not self.resource_client:
            logger.warning("Azure client not initialized, returning mock data")
            return await self.get_all_nodes() # Fallback to existing graph data
        
        try:
            logger.info("Discovering Azure resources...")
            discovered = []
            
            # Query all resources in subscription
            resources = list(self.resource_client.resources.list())
            
            for resource in resources:
                node = {
                    "node_id": resource.id,
                    "name": resource.name,
                    "type": self._map_resource_type(resource.type),
                    "azure_type": resource.type,
                    "location": resource.location,
                    "resource_group": resource.id.split('/')[4] if len(resource.id.split('/')) > 4 else "unknown",
                    "status": "healthy",
                    "metadata": {
                        "tags": resource.tags or {},
                        "kind": getattr(resource, 'kind', None),
                    }
                }
                discovered.append(node)
            
            # Sync to Neo4j
            await self._sync_to_neo4j(discovered)
            
            logger.info(f"Discovered and synced {len(discovered)} Azure resources")
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering Azure resources: {e}")
            return []
    
    async def _sync_to_neo4j(self, nodes: List[Dict[str, Any]]):
        """Persist nodes to Neo4j"""
        if not self.driver:
            return

        with self.driver.session() as session:
            # Create nodes
            for node in nodes:
                session.run(
                    """
                    MERGE (n:Resource {id: $node_id})
                    SET n.name = $name,
                        n.type = $type,
                        n.location = $location,
                        n.resource_group = $resource_group,
                        n.status = $status
                    """,
                    node_id=node["node_id"],
                    name=node["name"],
                    type=node["type"],
                    location=node["location"],
                    resource_group=node["resource_group"],
                    status=node["status"]
                )
            
            # Infer and create relationships (Edges)
            # 1. Resource Group containment
            session.run(
                """
                MATCH (n:Resource)
                MERGE (rg:ResourceGroup {name: n.resource_group})
                MERGE (n)-[:BELONGS_TO]->(rg)
                """
            )
            
            # 2. Heuristic dependencies (e.g., App Service -> Plan)
            # This is simplified; real logic would parse ARM templates or connection strings
            pass

    def _map_resource_type(self, azure_type: str) -> str:
        """Map Azure resource type to topology node type"""
        type_mapping = {
            "Microsoft.Compute/virtualMachines": "vm",
            "Microsoft.Web/sites": "app_service",
            "Microsoft.Sql/servers": "database",
            "Microsoft.DBforPostgreSQL/servers": "database",
            "Microsoft.DBforMySQL/servers": "database",
            "Microsoft.Storage/storageAccounts": "storage",
            "Microsoft.Network/virtualNetworks": "network",
            "Microsoft.Network/networkInterfaces": "network_interface",
            "Microsoft.Network/publicIPAddresses": "public_ip",
            "Microsoft.Insights/components": "app_insights",
            "Microsoft.KeyVault/vaults": "key_vault",
            "Microsoft.ContainerService/managedClusters": "kubernetes",
            "Microsoft.DocumentDB/databaseAccounts": "cosmos_db",
            "Microsoft.Cache/Redis": "redis"
        }
        return type_mapping.get(azure_type, "service")
    
    async def _get_nodes_from_postgres(self) -> List[Dict[str, Any]]:
        """Fallback: Get topology nodes from PostgreSQL"""
        try:
            from models.database import AsyncSessionLocal, TopologyNode
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(TopologyNode))
                nodes = result.scalars().all()
                
                return [
                    {
                        "node_id": node.node_id,
                        "name": node.name,
                        "type": node.type,
                        "status": node.status,
                        "node_metadata": node.node_metadata,
                        "dependencies": []
                    }
                    for node in nodes
                ]
        except Exception as e:
            logger.error(f"Error fetching nodes from PostgreSQL: {e}")
            return []

    async def get_all_nodes(self) -> List[Dict[str, Any]]:
        """Get all topology nodes from Neo4j, fallback to PostgreSQL"""
        if not self.driver:
            logger.info("Neo4j not available, using PostgreSQL")
            return await self._get_nodes_from_postgres()

        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (n:Resource)
                    RETURN n.id as node_id, n.name as name, n.type as type, n.status as status, n.resource_group as resource_group
                    """
                )
                nodes = [dict(record) for record in result]
                
                # If Neo4j is empty, fallback to PostgreSQL
                if not nodes:
                    logger.info("Neo4j empty, falling back to PostgreSQL")
                    return await self._get_nodes_from_postgres()
                
                return nodes
        except Exception as e:
            logger.error(f"Error fetching nodes from Neo4j: {e}")
            return await self._get_nodes_from_postgres()

    async def get_full_graph(self) -> Dict[str, Any]:
        """Get complete topology graph from Neo4j"""
        nodes = await self.get_all_nodes()
        
        # Fetch relationships
        edges = []
        if self.driver:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (a)-[r]->(b)
                    RETURN a.id as source, b.id as target, type(r) as type
                    """
                )
                edges = [dict(record) for record in result]
        
        return {"nodes": nodes, "edges": edges}

    def _get_mock_data(self) -> List[Dict[str, Any]]:
        """Return mock topology data when Neo4j is not available"""
        return [
            {
                "node_id": "svc-1",
                "name": "API Gateway",
                "type": "service",
                "status": "healthy",
                "resource_group": "rg-prod",
                "dependencies": ["svc-2", "svc-3"]
            },
            {
                "node_id": "svc-2",
                "name": "Database",
                "type": "database",
                "status": "healthy",
                "resource_group": "rg-prod",
                "dependencies": []
            },
            {
                "node_id": "svc-3",
                "name": "Cache",
                "type": "redis",
                "status": "healthy",
                "resource_group": "rg-prod",
                "dependencies": []
            }
        ]

    async def ingest_topology(self, resources: list, org_id: str):
        """
        Ingest resources into Neo4j with tenant isolation
        """
        if not self.driver:
            logger.warning("Neo4j driver not initialized, skipping graph ingestion")
            return

        query = """
        UNWIND $resources as r
        MERGE (n:Resource {id: r.id})
        SET n.name = r.name,
            n.type = r.type,
            n.location = r.location,
            n.subscriptionId = r.subscription_id,
            n.resourceGroup = r.resource_group,
            n.tenant_id = $org_id,
            n.updated_at = datetime()
        
        // Add specific label based on type (e.g., VirtualMachine)
        WITH n, r
        CALL apoc.create.addLabels(n, [split(r.type, '/')[-1]]) YIELD node
        RETURN count(n)
        """
        
        try:
            async with self.driver.session() as session:
                await session.run(query, resources=resources, org_id=org_id)
                logger.info(f"Ingested {len(resources)} nodes into Neo4j for org {org_id}")
        except Exception as e:
            logger.error(f"Neo4j ingestion failed: {e}")
            # Don't raise, just log. Postgres is primary inventory.
    async def get_dependencies(self, node_id: str, depth: int) -> Dict[str, Any]:
        """Get node dependencies from Neo4j"""
        if not self.driver:
            return {"node_id": node_id, "dependencies": []}
            
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (n {id: $node_id})-[r*1..2]->(m)
                RETURN m.id as dep_id
                """,
                node_id=node_id
            )
            dependencies = [record["dep_id"] for record in result]
            return {"node_id": node_id, "dependencies": dependencies}
