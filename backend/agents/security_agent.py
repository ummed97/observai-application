"""
Security Agent - Threat Detection & Compliance
Continuously monitors for security threats, vulnerabilities, and compliance issues
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass
import random

logger = logging.getLogger(__name__)

@dataclass
class SecurityAlert:
    """Represents a security alert"""
    alert_id: str
    timestamp: datetime
    severity: str  # critical, high, medium, low
    type: str     # brute_force, suspicious_ip, vulnerability, config_drift
    description: str
    source: str
    status: str   # active, investigating, resolved
    context: Dict[str, Any]

class SecurityAgent:
    """
    Security Agent - Guardian of the infrastructure
    Detects threats, vulnerabilities, and compliance violations
    """

    def __init__(self):
        self.name = "security"
        self.status = "initializing"
        self.alerts: List[SecurityAlert] = []
        self.scanned_assets = 0
        self.last_scan = None
        
        # Mock threat intelligence database
        self.threat_intel = {
            "suspicious_ips": ["192.168.1.100", "10.0.0.55"],
            "vulnerable_packages": ["log4j-2.14", "openssl-1.1.1"]
        }
        
    async def initialize(self):
        """Initialize the security agent"""
        logger.info("Initializing Security Agent...")
        self.status = "active"
        logger.info("Security Agent initialized and active")

    async def shutdown(self):
        """Shutdown the agent"""
        self.status = "stopped"
        logger.info("Security Agent stopped")

    async def detect_threats(self) -> List[Dict[str, Any]]:
        """
        Main threat detection loop
        Returns list of detected threats
        """
        threats = []
        
        try:
            # 1. Simulate Brute Force Detection
            # In real implementation, this would query logs (Loki) for failed login patterns
            if random.random() < 0.1:  # 10% chance of detecting brute force
                threat = self._create_alert(
                    type="brute_force",
                    severity="high",
                    description="Multiple failed SSH login attempts detected from IP 203.0.113.42",
                    source="auth_logs",
                    context={"ip": "203.0.113.42", "attempts": 15, "user": "root"}
                )
                threats.append(threat)

            # 2. Simulate Vulnerability Scan
            # In real implementation, this would check package versions against CVE database
            if random.random() < 0.05:
                threat = self._create_alert(
                    type="vulnerability",
                    severity="critical",
                    description="Critical vulnerability detected in payment-service: Log4Shell (CVE-2021-44228)",
                    source="dependency_scanner",
                    context={"service": "payment-service", "package": "log4j", "version": "2.14.1"}
                )
                threats.append(threat)
                
            # 3. Simulate Suspicious Access
            if random.random() < 0.08:
                threat = self._create_alert(
                    type="suspicious_access",
                    severity="medium",
                    description="Access to sensitive database from non-production subnet",
                    source="network_logs",
                    context={"source_ip": "10.5.0.22", "target": "prod-db-01"}
                )
                threats.append(threat)

        except Exception as e:
            logger.error(f"Threat detection error: {e}")
        
        return [self.alert_to_dict(t) for t in threats]

    def _create_alert(self, type: str, severity: str, description: str, source: str, context: Dict[str, Any]) -> SecurityAlert:
        """Create and store a security alert"""
        alert = SecurityAlert(
            alert_id=f"sec_{datetime.utcnow().timestamp()}",
            timestamp=datetime.utcnow(),
            severity=severity,
            type=type,
            description=description,
            source=source,
            status="active",
            context=context
        )
        self.alerts.append(alert)
        self.last_scan = datetime.utcnow()
        logger.warning(f"Security Alert: {description}")
        return alert

    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get all alerts as dictionaries"""
        return [self.alert_to_dict(a) for a in self.alerts]

    def alert_to_dict(self, alert: SecurityAlert) -> Dict[str, Any]:
        """Convert alert object to dictionary"""
        return {
            "id": alert.alert_id,
            "timestamp": alert.timestamp.isoformat(),
            "severity": alert.severity,
            "type": alert.type,
            "description": alert.description,
            "source": alert.source,
            "status": alert.status,
            "context": alert.context
        }

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent task"""
        task_type = context.get('task_type', 'scan')
        
        if task_type == 'scan':
            threats = await self.detect_threats()
            return {
                'success': True,
                'threats': threats,
                'count': len(threats)
            }
        
        elif task_type == 'resolve_alert':
            alert_id = context.get('alert_id')
            for alert in self.alerts:
                if alert.alert_id == alert_id:
                    alert.status = 'resolved'
                    return {'success': True, 'message': f"Alert {alert_id} resolved"}
            return {'success': False, 'error': 'Alert not found'}
        
        else:
            return {'success': False, 'error': 'Unknown task type'}

    async def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        active_alerts = len([a for a in self.alerts if a.status == 'active'])
        
        return {
            "status": self.status,
            "active_alerts": active_alerts,
            "total_alerts": len(self.alerts),
            "last_scan": self.last_scan.isoformat() if self.last_scan else None,
            "success_rate": 1.0,
            "actions_taken": len(self.alerts)
        }
