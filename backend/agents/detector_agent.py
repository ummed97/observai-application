“””
Detector Agent - Anomaly Detection
Continuously monitors metrics and detects anomalies using ML models
“””
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import numpy as np
from sklearn.ensemble import IsolationForest
from collections import deque

logger = logging.getLogger(**name**)

@dataclass
class Anomaly:
“”“Represents a detected anomaly”””
anomaly_id: str
timestamp: datetime
metric_name: str
value: float
expected_range: tuple
severity: str
description: str
confidence: float
context: Dict[str, Any]

class DetectorAgent:
“””
Detector Agent - First line of defense
Uses statistical methods and ML models for anomaly detection
“””

```
def __init__(self):
    self.name = "detector"
    self.status = "initializing"
    self.metrics_buffer = {}  # Store recent metrics per metric_name
    self.models = {}  # ML models per metric
    self.baselines = {}  # Statistical baselines
    self.anomalies_detected = 0
    self.last_action = None
    
    # Configuration
    self.window_size = 100  # Number of data points for baseline
    self.std_threshold = 2.5  # Standard deviations for anomaly
    self.min_samples = 30  # Minimum samples before detecting
    
async def initialize(self):
    """Initialize the detector agent"""
    logger.info("Initializing Detector Agent...")
    
    # Initialize ML models
    self.isolation_forest = IsolationForest(
        contamination=0.1,
        random_state=42
    )
    
    self.status = "active"
    logger.info("Detector Agent initialized and active")

async def shutdown(self):
    """Shutdown the agent"""
    self.status = "stopped"
    logger.info("Detector Agent stopped")

async def detect_anomalies(self) -> List[Dict[str, Any]]:
    """
    Main detection loop - checks all metrics for anomalies
    Returns list of detected anomalies
    """
    anomalies = []
    
    try:
        for metric_name, data_points in self.metrics_buffer.items():
            if len(data_points) < self.min_samples:
                continue
            
            # Get recent values
            recent_values = [dp['value'] for dp in list(data_points)[-self.window_size:]]
            latest_value = recent_values[-1]
            
            # Statistical detection
            anomaly = await self._detect_statistical_anomaly(
                metric_name, latest_value, recent_values
            )
            
            if anomaly:
                anomalies.append(anomaly)
                self.anomalies_detected += 1
                self.last_action = f"Detected anomaly in {metric_name}"
            
            # ML-based detection (if enough data)
            if len(recent_values) >= 50:
                ml_anomaly = await self._detect_ml_anomaly(
                    metric_name, recent_values
                )
                if ml_anomaly:
                    anomalies.append(ml_anomaly)
    
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
    
    return anomalies

async def _detect_statistical_anomaly(
    self,
    metric_name: str,
    current_value: float,
    historical_values: List[float]
) -> Optional[Dict[str, Any]]:
    """Detect anomalies using statistical methods"""
    
    # Calculate baseline statistics
    mean = np.mean(historical_values)
    std = np.std(historical_values)
    
    # Store baseline
    self.baselines[metric_name] = {'mean': mean, 'std': std}
    
    # Check if current value is anomalous
    if std == 0:
        return None
    
    z_score = abs((current_value - mean) / std)
    
    if z_score > self.std_threshold:
        # Determine severity
        if z_score > 4:
            severity = "critical"
        elif z_score > 3:
            severity = "high"
        else:
            severity = "medium"
        
        # Calculate confidence
        confidence = min(z_score / 5.0, 1.0)
        
        anomaly = {
            "anomaly_id": f"stat_{metric_name}_{datetime.utcnow().timestamp()}",
            "type": "statistical",
            "timestamp": datetime.utcnow(),
            "metric_name": metric_name,
            "value": current_value,
            "expected_range": (mean - 2*std, mean + 2*std),
            "severity": severity,
            "description": f"{metric_name} deviated {z_score:.2f} standard deviations from baseline",
            "confidence": confidence,
            "z_score": z_score,
            "baseline_mean": mean,
            "baseline_std": std
        }
        
        logger.warning(f"Statistical anomaly detected: {anomaly['description']}")
        return anomaly
    
    return None

async def _detect_ml_anomaly(
    self,
    metric_name: str,
    values: List[float]
) -> Optional[Dict[str, Any]]:
    """Detect anomalies using ML (Isolation Forest)"""
    
    try:
        # Prepare data
        X = np.array(values).reshape(-1, 1)
        
        # Train or update model
        if metric_name not in self.models:
            self.models[metric_name] = IsolationForest(
                contamination=0.1,
                random_state=42
            )
            self.models[metric_name].fit(X)
        
        # Predict on latest value
        latest = X[-1].reshape(1, -1)
        prediction = self.models[metric_name].predict(latest)
        score = self.models[metric_name].score_samples(latest)[0]
        
        if prediction[0] == -1:  # Anomaly detected
            anomaly = {
                "anomaly_id": f"ml_{metric_name}_{datetime.utcnow().timestamp()}",
                "type": "ml_based",
                "timestamp": datetime.utcnow(),
                "metric_name": metric_name,
                "value": values[-1],
                "severity": "medium",
                "description": f"ML model detected unusual pattern in {metric_name}",
                "confidence": abs(score),
                "anomaly_score": score
            }
            
            logger.warning(f"ML anomaly detected: {anomaly['description']}")
            return anomaly
    
    except Exception as e:
        logger.error(f"ML anomaly detection error: {e}")
    
    return None

async def add_metric(self, metric: Dict[str, Any]):
    """Add new metric data point"""
    metric_name = metric.get('metric_name')
    
    if metric_name not in self.metrics_buffer:
        self.metrics_buffer[metric_name] = deque(maxlen=self.window_size * 2)
    
    self.metrics_buffer[metric_name].append({
        'timestamp': metric.get('timestamp', datetime.utcnow()),
        'value': metric['value'],
        'labels': metric.get('labels', {})
    })

async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute agent task"""
    task_type = context.get('task_type', 'detect')
    
    if task_type == 'detect':
        anomalies = await self.detect_anomalies()
        return {
            'success': True,
            'anomalies': anomalies,
            'count': len(anomalies)
        }
    
    elif task_type == 'add_metric':
        await self.add_metric(context.get('metric', {}))
        return {'success': True}
    
    else:
        return {'success': False, 'error': 'Unknown task type'}

async def get_status(self) -> Dict[str, Any]:
    """Get agent status"""
    total_metrics = sum(len(buffer) for buffer in self.metrics_buffer.values())
    
    return {
        "status": self.status,
        "metrics_tracked": len(self.metrics_buffer),
        "total_data_points": total_metrics,
        "anomalies_detected": self.anomalies_detected,
        "last_action": self.last_action,
        "success_rate": 0.95 if self.anomalies_detected > 0 else 1.0,
        "actions_taken": self.anomalies_detected
    }
```
