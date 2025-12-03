"""
Multi-Agent Orchestration System
Coordinates all AI agents for observability tasks
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import json

from agents.detector_agent import DetectorAgent
from agents.diagnoser_agent import DiagnoserAgent
from agents.forecaster_agent import ForecasterAgent
from agents.remediator_agent import RemediatorAgent
from agents.cost_agent import CostAgent
from agents.security_agent import SecurityAgent

logger = logging.getLogger(__name__)


@dataclass
class AgentTask:
    """Represents a task for an agent"""
    task_id: str
    agent_type: str
    priority: int
    context: Dict[str, Any]
    created_at: datetime
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None


class AgentOrchestrator:
    """
    Orchestrates collaborative work between specialized AI agents
    Implements the multi-agent reasoning core from the PRD
    """
    
    def __init__(self):
        self.agents = {
            "detector": DetectorAgent(),
            "diagnoser": DiagnoserAgent(),
            "forecaster": ForecasterAgent(),
            "remediator": RemediatorAgent(),
            "cost": CostAgent(),
            "security": SecurityAgent()
        }
        
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, AgentTask] = {}
        self.incident_history: List[Dict[str, Any]] = []
        self.remediation_pending: List[Dict[str, Any]] = []
        
        self.running = False
        
    async def start(self):
        """Start the orchestrator"""
        logger.info("Starting Agent Orchestrator...")
        self.running = True
        
        # Start all agents
        for agent_name, agent in self.agents.items():
            await agent.initialize()
            logger.info(f"Initialized {agent_name} agent")
        
        # Start task processing loop
        asyncio.create_task(self._process_tasks())
        asyncio.create_task(self._continuous_monitoring())
        
        logger.info("Agent Orchestrator started")
    
    async def stop(self):
        """Stop the orchestrator"""
        logger.info("Stopping Agent Orchestrator...")
        self.running = False
        
        for agent in self.agents.values():
            await agent.shutdown()
    
    async def _process_tasks(self):
        """Main task processing loop"""
        while self.running:
            try:
                if not self.task_queue.empty():
                    task = await self.task_queue.get()
                    await self._execute_task(task)
                else:
                    await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Task processing error: {e}")
    
    async def _continuous_monitoring(self):
        """Continuous monitoring for anomalies"""
        while self.running:
            try:
                # Detector agent continuously checks for anomalies
                anomalies = await self.agents["detector"].detect_anomalies()
                
                if anomalies:
                    logger.info(f"Detected {len(anomalies)} anomalies")
                    for anomaly in anomalies:
                        await self._handle_anomaly(anomaly)
                
                await asyncio.sleep(30)  # Check every 30 seconds
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _handle_anomaly(self, anomaly: Dict[str, Any]):
        """Handle detected anomaly through agent collaboration"""
        logger.info(f"Handling anomaly: {anomaly.get('type')}")
        
        # Create incident
        incident = {
            "id": f"inc_{datetime.utcnow().timestamp()}",
            "title": anomaly.get("description", "Anomaly detected"),
            "severity": anomaly.get("severity", "medium"),
            "created_at": datetime.utcnow(),
            "status": "investigating",
            "anomaly_data": anomaly
        }
        
        # Step 1: Diagnoser analyzes root cause
        diagnosis = await self.agents["diagnoser"].analyze(anomaly)
        incident["root_cause"] = diagnosis.get("root_cause")
        incident["affected_services"] = diagnosis.get("affected_services", [])
        
        # Step 2: Forecaster predicts impact
        forecast = await self.agents["forecaster"].predict_impact(diagnosis)
        incident["predicted_impact"] = forecast.get("impact")
        incident["time_to_critical"] = forecast.get("time_to_critical")
        
        # Step 3: Remediator suggests fix
        remediation = await self.agents["remediator"].suggest_remediation(diagnosis, forecast)
        incident["remediation_steps"] = remediation.get("steps", [])
        incident["auto_remediation"] = remediation.get("auto_execute", False)
        
        # Store incident
        self.incident_history.append(incident)
        
        # Execute or queue remediation
        if remediation.get("auto_execute"):
            await self._execute_remediation(incident, remediation)
        else:
            self.remediation_pending.append({
                "incident_id": incident["id"],
                "remediation": remediation,
                "requires_approval": True
            })
        
        return incident
    
    async def _execute_task(self, task: AgentTask):
        """Execute a specific agent task"""
        try:
            agent = self.agents.get(task.agent_type)
            if not agent:
                logger.error(f"Agent not found: {task.agent_type}")
                return
            
            logger.info(f"Executing task {task.task_id} with {task.agent_type}")
            
            result = await agent.execute(task.context)
            task.result = result
            task.status = "completed"
            
        except Exception as e:
            logger.error(f"Task execution error: {e}")
            task.status = "failed"
            task.result = {"error": str(e)}
    
    async def _execute_remediation(self, incident: Dict[str, Any], remediation: Dict[str, Any]):
        """Execute remediation actions"""
        try:
            result = await self.agents["remediator"].execute_actions(
                remediation.get("actions", [])
            )
            
            incident["remediation_executed"] = True
            incident["remediation_result"] = result
            incident["status"] = "resolved" if result.get("success") else "failed"
            
            logger.info(f"Remediation executed for incident {incident['id']}: {result}")
            
        except Exception as e:
            logger.error(f"Remediation execution error: {e}")
            incident["status"] = "remediation_failed"
    
    # Public API methods
    
    async def handle_incident(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle manually created incident"""
        anomaly = {
            "type": "manual",
            "description": incident_data.get("description"),
            "severity": incident_data.get("severity", "medium"),
            "affected_services": incident_data.get("affected_services", [])
        }
        
        return await self._handle_anomaly(anomaly)
    
    async def get_incidents(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get incidents with filters"""
        incidents = self.incident_history
        
        if status:
            incidents = [i for i in incidents if i.get("status") == status]
        
        if severity:
            incidents = [i for i in incidents if i.get("severity") == severity]
        
        # Sort by created_at descending
        incidents = sorted(incidents, key=lambda x: x.get("created_at", datetime.min), reverse=True)
        
        return incidents[:limit]
    
    async def get_incident_details(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed incident information"""
        for incident in self.incident_history:
            if incident.get("id") == incident_id:
                return incident
        return None
    
    async def get_agent_statuses(self) -> List[Dict[str, Any]]:
        """Get status of all agents"""
        statuses = []
        
        for agent_name, agent in self.agents.items():
            status = await agent.get_status()
            statuses.append({
                "agent_id": agent_name,
                "agent_type": agent_name,
                "status": status.get("status", "unknown"),
                "last_action": status.get("last_action"),
                "success_rate": status.get("success_rate", 0.0),
                "actions_taken": status.get("actions_taken", 0)
            })
        
        return statuses
    
    async def trigger_agent(self, agent_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Manually trigger specific agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")
        
        return await agent.execute(context)
    
    async def process_nl_query(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process natural language query"""
        # Use diagnoser agent's NLP capabilities
        result = await self.agents["diagnoser"].process_nl_query(query, context)
        
        return {
            "query": query,
            "answer": result.get("answer"),
            "sources": result.get("sources", []),
            "confidence": result.get("confidence", 0.0),
            "visualizations": result.get("visualizations")
        }
    
    async def get_pending_remediations(self) -> List[Dict[str, Any]]:
        """Get pending remediations"""
        return self.remediation_pending
    
    async def approve_remediation(self, action_id: str, user: Dict[str, Any]) -> Dict[str, Any]:
        """Approve and execute remediation"""
        for pending in self.remediation_pending:
            if pending.get("action_id") == action_id:
                # Find associated incident
                incident = await self.get_incident_details(pending["incident_id"])
                if incident:
                    result = await self._execute_remediation(incident, pending["remediation"])
                    self.remediation_pending.remove(pending)
                    return result
        
        raise ValueError(f"Remediation not found: {action_id}")
    
    async def reject_remediation(self, action_id: str, reason: str, user: Dict[str, Any]):
        """Reject remediation"""
        for pending in self.remediation_pending:
            if pending.get("action_id") == action_id:
                pending["status"] = "rejected"
                pending["rejection_reason"] = reason
                pending["rejected_by"] = user.get("sub")
                self.remediation_pending.remove(pending)
                return
        
        raise ValueError(f"Remediation not found: {action_id}")
    
    async def get_cost_analysis(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "service"
    ) -> Dict[str, Any]:
        """Get cost analysis"""
        return await self.agents["cost"].analyze_costs(start_date, end_date, group_by)
    
    async def detect_cost_waste(self) -> Dict[str, Any]:
        """Detect cost waste"""
        return await self.agents["cost"].detect_waste()
    
    async def predict_capacity(self, service: str, horizon_days: int) -> Dict[str, Any]:
        """Predict capacity needs"""
        return await self.agents["forecaster"].predict_capacity(service, horizon_days)
    
    async def predict_failures(self) -> List[Dict[str, Any]]:
        """Get failure predictions"""
        return await self.agents["forecaster"].predict_failures()
    
    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status"""
        return {
            "running": self.running,
            "active_tasks": len(self.active_tasks),
            "total_incidents": len(self.incident_history),
            "pending_remediations": len(self.remediation_pending),
            "agents": {
                name: "active" if agent else "inactive"
                for name, agent in self.agents.items()
            }
        }
