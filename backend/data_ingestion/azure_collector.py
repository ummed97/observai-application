"""
Azure Monitor Collector
Collects metrics from Azure Monitor for VMs and other resources
"""
import logging
import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from azure.identity import DefaultAzureCredential
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.core.exceptions import AzureError

logger = logging.getLogger(__name__)

class AzureMonitorCollector:
    """
    Collector for Azure Monitor metrics
    """
    def __init__(self):
        self.subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        self.resource_group = os.getenv("AZURE_RESOURCE_GROUP")
        self.enabled = False
        self.credential = None
        self.monitor_client = None
        self.resource_client = None
        
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize Azure clients if credentials are present"""
        if not self.subscription_id:
            logger.warning("AZURE_SUBSCRIPTION_ID not set. Azure collection disabled.")
            return

        try:
            # Use DefaultAzureCredential which supports multiple auth methods
            # (Environment vars, Managed Identity, CLI, etc.)
            self.credential = DefaultAzureCredential()
            
            self.monitor_client = MonitorManagementClient(
                self.credential, 
                self.subscription_id
            )
            
            self.resource_client = ResourceManagementClient(
                self.credential, 
                self.subscription_id
            )
            
            self.enabled = True
            logger.info("Azure Monitor Collector initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Azure Collector: {e}")
            self.enabled = False

    async def collect_metrics(self) -> List[Dict[str, Any]]:
        """
        Collect metrics from Azure resources
        Currently supports: Virtual Machines (CPU Usage)
        """
        if not self.enabled:
            return []

        metrics_data = []
        
        try:
            # Run blocking Azure calls in a thread pool to avoid blocking the event loop
            metrics_data = await asyncio.to_thread(self._collect_metrics_sync)
            return metrics_data
            
        except Exception as e:
            logger.error(f"Error collecting Azure metrics: {e}")
            return []

    def _collect_metrics_sync(self) -> List[Dict[str, Any]]:
        """Synchronous method to collect metrics"""
        metrics_data = []
        
        try:
            # List all VMs in the resource group (if specified) or subscription
            if self.resource_group:
                vms = self.resource_client.resources.list_by_resource_group(
                    self.resource_group, 
                    filter="resourceType eq 'Microsoft.Compute/virtualMachines'"
                )
            else:
                # Fallback to listing all VMs in subscription if no RG specified
                vms = self.resource_client.resources.list(
                    filter="resourceType eq 'Microsoft.Compute/virtualMachines'"
                )

            for vm in vms:
                try:
                    # Fetch CPU Usage (Percentage CPU)
                    # Timespan: Last 5 minutes
                    today = datetime.utcnow()
                    timespan = f"{(today - timedelta(minutes=5)).isoformat()}/{today.isoformat()}"
                    
                    cpu_metrics = self.monitor_client.metrics.list(
                        vm.id,
                        metricnames='Percentage CPU',
                        timespan=timespan,
                        interval='PT1M',
                        aggregation='Average'
                    )

                    for item in cpu_metrics.value:
                        for timeseries in item.timeseries:
                            for data in timeseries.data:
                                if data.average is not None:
                                    metrics_data.append({
                                        "timestamp": data.time_stamp,
                                        "source": "azure_vm",
                                        "resource_id": vm.id,
                                        "resource_name": vm.name,
                                        "metric_name": "cpu_usage_percent",
                                        "value": data.average,
                                        "labels": {
                                            "region": vm.location,
                                            "resource_group": self._get_rg_from_id(vm.id)
                                        }
                                    })
                except Exception as vm_error:
                    logger.warning(f"Failed to collect metrics for VM {vm.name}: {vm_error}")
                    continue

        except Exception as e:
            logger.error(f"Error in _collect_metrics_sync: {e}")
            
        return metrics_data

    def _get_rg_from_id(self, resource_id: str) -> str:
        """Extract resource group name from resource ID"""
        try:
            # /subscriptions/{sub}/resourceGroups/{rg}/...
            parts = resource_id.split('/')
            if 'resourceGroups' in parts:
                idx = parts.index('resourceGroups')
                if idx + 1 < len(parts):
                    return parts[idx + 1]
        except:
            pass
        return "unknown"
