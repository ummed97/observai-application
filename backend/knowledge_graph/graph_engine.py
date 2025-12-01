"""
Knowledge Graph Engine - Neo4j integration with Azure Resource Discovery
"""
import logging
import os
from typing import List, Dict, Any
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.monitor import MonitorManagementClient

logger = logging.getLogger(__name__)

class KnowledgeGraphEngine:
    def __init__(self):
        self.driver = None
        self.subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        self.discovered_resources = []
        
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
    
    async def discover_azure_resources(self) -> List[Dict[str, Any]]:
        """Discover all Azure resources in subscription"""
        if not self.resource_client:
            logger.warning("Azure client not initialized, returning mock data")
            return self._get_mock_data()
        
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
                    "status": "healthy",  # Will be enriched with actual health later
                    "metadata": {
                        "tags": resource.tags or {},
                        "kind": getattr(resource, 'kind', None),
                        "sku": str(getattr(resource, 'sku', None)) if hasattr(resource, 'sku') else None
                    },
                    "dependencies": []
                }
                discovered.append(node)
            
            self.discovered_resources = discovered
            logger.info(f"Discovered {len(discovered)} Azure resources")
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering Azure resources: {e}")
            return self._get_mock_data()
    
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
    
    def _get_mock_data(self) -> List[Dict[str, Any]]:
        """Return mock topology data when Azure discovery is not available"""
        return [
            {
                "node_id": "svc-1",
                "name": "API Gateway",
                "type": "service",
                "status": "healthy",
                "metadata": {},
                "dependencies": ["svc-2", "svc-3"]
            },
            {
                "node_id": "svc-2",
                "name": "Database",
                "type": "database",
                "status": "healthy",
                "metadata": {},
                "dependencies": []
            },
            {
                "node_id": "svc-3",
                "name": "Cache",
                "type": "redis",
                "status": "healthy",
                "metadata": {},
                "dependencies": []
            }
        ]
        
    async def get_all_nodes(self) -> List[Dict[str, Any]]:
        """Get all topology nodes (discover if not already done)"""
        if not self.discovered_resources:
            await self.discover_azure_resources()
        
        return self.discovered_resources if self.discovered_resources else self._get_mock_data()
    
    async def get_full_graph(self) -> Dict[str, Any]:
        """Get complete topology graph"""
        nodes = await self.get_all_nodes()
        edges = self._build_edges(nodes)
        
        return {"nodes": nodes, "edges": edges}
    
    def _build_edges(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build dependency edges between nodes"""
        edges = []
        
        # Build edges based on resource relationships
        for node in nodes:
            # VM to Network Interface dependencies
            if node["type"] == "vm":
                # Find network interfaces in same resource group
                for other in nodes:
                    if (other["type"] == "network_interface" and 
                        other.get("resource_group") == node.get("resource_group")):
                        edges.append({
                            "source": node["node_id"],
                            "target": other["node_id"],
                            "type": "uses"
                        })
            
            # App Service to Database dependencies (inferred from naming)
            if node["type"] == "app_service":
                for other in nodes:
                    if other["type"] == "database" and other.get("resource_group") == node.get("resource_group"):
                        edges.append({
                            "source": node["node_id"],
                            "target": other["node_id"],
                            "type": "connects_to"
                        })
            
            # App Insights monitoring relationships
            if node["type"] == "app_insights":
                for other in nodes:
                    if other["type"] in ["app_service", "vm"] and other.get("resource_group") == node.get("resource_group"):
                        edges.append({
                            "source": other["node_id"],
                            "target": node["node_id"],
                            "type": "monitored_by"
                        })
        
        return edges
    
    async def get_dependencies(self, node_id: str, depth: int) -> Dict[str, Any]:
        """Get node dependencies"""
        nodes = await self.get_all_nodes()
        graph = await self.get_full_graph()
        
        # Find the node
        target_node = None
        for node in nodes:
            if node["node_id"] == node_id:
                target_node = node
                break
        
        if not target_node:
            return {"node_id": node_id, "dependencies": []}
        
        # Find all edges from this node
        dependencies = []
        for edge in graph["edges"]:
            if edge["source"] == node_id:
                dependencies.append(edge["target"])
        
        return {"node_id": node_id, "dependencies": dependencies}
