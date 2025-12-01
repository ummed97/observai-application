"""
Application Insights Collector
Collects logs, traces, exceptions, and performance metrics from Azure Application Insights
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, LogsQueryStatus
import os

logger = logging.getLogger(__name__)


class AppInsightsCollector:
    """Collects telemetry data from Azure Application Insights"""
    
    def __init__(self):
        self.name = "app_insights_collector"
        self.status = "initializing"
        
        # Get Application Insights configuration
        self.app_id = os.getenv("APPINSIGHTS_APP_ID")
        self.workspace_id = os.getenv("APPINSIGHTS_WORKSPACE_ID")
        
        if not self.app_id or not self.workspace_id:
            logger.warning("Application Insights not configured. Set APPINSIGHTS_APP_ID and APPINSIGHTS_WORKSPACE_ID environment variables.")
            self.enabled = False
            return
        
        try:
            # Initialize Azure credentials and client
            credential = DefaultAzureCredential()
            self.client = LogsQueryClient(credential)
            self.enabled = True
            self.status = "ready"
            logger.info(f"Application Insights Collector initialized for app: {self.app_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Application Insights client: {e}")
            self.enabled = False
            self.status = "error"
    
    async def query_logs(
        self,
        query: str,
        time_range: timedelta = timedelta(hours=24),
        max_results: int = 100
    ) -> Dict[str, Any]:
        """Query Application Insights logs using KQL"""
        if not self.enabled:
            return {
                "status": "disabled",
                "message": "Application Insights not configured",
                "logs": []
            }
        
        try:
            # Execute KQL query
            end_time = datetime.utcnow()
            start_time = end_time - time_range
            
            response = await asyncio.to_thread(
                self.client.query_workspace,
                workspace_id=self.workspace_id,
                query=query,
                timespan=(start_time, end_time)
            )
            
            if response.status == LogsQueryStatus.SUCCESS:
                logs = []
                for table in response.tables:
                    # Convert table rows to list of dicts
                    for row in table.rows[:max_results]:
                        log_entry = dict(zip([col.name for col in table.columns], row))
                        logs.append(log_entry)
                
                return {
                    "status": "success",
                    "count": len(logs),
                    "logs": logs
                }
            else:
                return {
                    "status": "partial_error",
                    "message": "Query returned partial results",
                    "logs": []
                }
        
        except Exception as e:
            logger.error(f"Error querying Application Insights: {e}")
            return {
                "status": "error",
                "message": str(e),
                "logs": []
            }
    
    async def get_recent_logs(
        self,
        hours: int = 1,
        severity: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get recent application logs"""
        severity_filter = f"| where SeverityLevel >= {self._get_severity_level(severity)}" if severity else ""
        
        query = f"""
        traces
        | union exceptions
        {severity_filter}
        | project TimeGenerated, SeverityLevel, Message, AppRoleName, OperationName, Properties
        | order by TimeGenerated desc
        | limit 100
        """
        
        return await self.query_logs(query, timedelta(hours=hours))
    
    async def get_exceptions(self, hours: int = 24) -> Dict[str, Any]:
        """Get recent exceptions with stack traces"""
        query = """
        exceptions
        | project TimeGenerated, Type, OuterMessage, InnerId, ProblemId, Assembly, Method, OuterType, Details
        | order by TimeGenerated desc
        | limit 50
        """
        
        return await self.query_logs(query, timedelta(hours=hours))
    
    async def get_request_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get request performance metrics"""
        query = """
        requests
        | summarize 
            RequestCount = count(),
            AvgDuration = avg(duration),
            P95Duration = percentile(duration, 95),
            P99Duration = percentile(duration, 99),
            FailureCount = countif(success == false),
            SuccessRate = 100.0 * countif(success == true) / count()
          by bin(timestamp, 5m), name
        | order by timestamp desc
        | limit 500
        """
        
        return await self.query_logs(query, timedelta(hours=hours))
    
    async def get_dependency_calls(self, hours: int = 24) -> Dict[str, Any]:
        """Get dependency call metrics (databases, HTTP calls, etc.)"""
        query = """
        dependencies
        | summarize 
            CallCount = count(),
            AvgDuration = avg(duration),
            FailureCount = countif(success == false)
          by bin(timestamp, 5m), type, target, name
        | order by timestamp desc
        | limit 200
        """
        
        return await self.query_logs(query, timedelta(hours=hours))
    
    async def get_traces_for_operation(
        self,
        operation_id: str
    ) -> Dict[str, Any]:
        """Get distributed trace for a specific operation"""
        query = f"""
        union traces, requests, dependencies, exceptions
        | where operation_Id == '{operation_id}'
        | project TimeGenerated, ItemType, Message, Name, Duration = duration, Success = success
        | order by TimeGenerated asc
        """
        
        return await self.query_logs(query, timedelta(days=1))
    
    def _get_severity_level(self, severity: Optional[str]) -> int:
        """Convert severity string to numeric level"""
        severity_map = {
            "verbose": 0,
            "info": 1,
            "warning": 2,
            "error": 3,
            "critical": 4
        }
        return severity_map.get(severity.lower() if severity else "", 0)
    
    async def get_performance_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get overall performance summary"""
        query = """
        requests
        | where timestamp > ago(1h)
        | summarize 
            TotalRequests = count(),
            AvgResponseTime = avg(duration),
            FailedRequests = countif(success == false),
            SuccessRate = 100.0 * countif(success == true) / count()
        """
        
        result = await self.query_logs(query, timedelta(hours=hours))
        
        if result["status"] == "success" and result["logs"]:
            return {
                "status": "success",
                "summary": result["logs"][0]
            }
        
        return {
            "status": "no_data",
            "summary": {}
        }
