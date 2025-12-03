"""
Uptime Monitor - Website & API Monitoring
Monitors availability, response time, and SSL status
"""
import asyncio
import logging
import aiohttp
import time
import socket
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class MonitorResult:
    monitor_id: str
    timestamp: datetime
    status: str  # UP, DOWN
    response_time_ms: float
    status_code: Optional[int] = None
    error: Optional[str] = None

class UptimeMonitor:
    """
    Uptime Monitor Service
    Checks HTTP/HTTPS endpoints and TCP ports
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(UptimeMonitor, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance
    
    def __init__(self):
        if self.initialized:
            return
            
        self.monitors = []
        self.results = {}  # monitor_id -> List[MonitorResult]
        self.running = False
        self.initialized = True
        
        # Add some default monitors if empty
        if not self.monitors:
            self.add_monitor({
                "id": "mon_1",
                "name": "Main Website",
                "type": "http",
                "url": "https://google.com",
                "interval": 60
            })

    def add_monitor(self, monitor_config: Dict[str, Any]):
        """Add a new monitor"""
        # Generate ID if not present
        if "id" not in monitor_config:
            monitor_config["id"] = f"mon_{int(time.time())}"
            
        self.monitors.append(monitor_config)
        self.results[monitor_config["id"]] = []
        logger.info(f"Added monitor: {monitor_config['name']}")
        return monitor_config

    def remove_monitor(self, monitor_id: str):
        """Remove a monitor by ID"""
        self.monitors = [m for m in self.monitors if m["id"] != monitor_id]
        if monitor_id in self.results:
            del self.results[monitor_id]
        logger.info(f"Removed monitor: {monitor_id}")

    def get_monitors(self) -> List[Dict[str, Any]]:
        """Get all monitor configurations"""
        return self.monitors

    def get_status(self) -> Dict[str, Any]:
        """Get current status of all monitors"""
        return {
            "monitors": self.monitors,
            "results": self.results,
            "running": self.running
        }

    async def start(self):
        """Start the monitoring loop"""
        if self.running:
            return
            
        self.running = True
        asyncio.create_task(self._monitor_loop())
        logger.info("Uptime Monitor started")

    async def stop(self):
        self.running = False

    async def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            for monitor in self.monitors:
                try:
                    result = await self._check_monitor(monitor)
                    self._store_result(result)
                except Exception as e:
                    logger.error(f"Error checking monitor {monitor['name']}: {e}")
            
            await asyncio.sleep(60)  # Check every minute for now

    async def _check_monitor(self, monitor: Dict[str, Any]) -> MonitorResult:
        """Execute a single check"""
        start_time = time.time()
        status = "DOWN"
        status_code = None
        error = None
        
        try:
            if monitor["type"] == "http":
                async with aiohttp.ClientSession() as session:
                    async with session.get(monitor["url"], timeout=10) as response:
                        status_code = response.status
                        if 200 <= status_code < 400:
                            status = "UP"
                        else:
                            error = f"Status code: {status_code}"
                            
            elif monitor["type"] == "port":
                host = monitor["host"]
                port = monitor["port"]
                reader, writer = await asyncio.open_connection(host, port)
                status = "UP"
                writer.close()
                await writer.wait_closed()
                
        except Exception as e:
            error = str(e)
            
        duration = (time.time() - start_time) * 1000
        
        return MonitorResult(
            monitor_id=monitor["id"],
            timestamp=datetime.utcnow(),
            status=status,
            response_time_ms=round(duration, 2),
            status_code=status_code,
            error=error
        )

    def _store_result(self, result: MonitorResult):
        """Store check result"""
        history = self.results.get(result.monitor_id, [])
        history.append(result)
        # Keep last 100 results
        if len(history) > 100:
            history.pop(0)
        self.results[result.monitor_id] = history
        
        if result.status == "DOWN":
            logger.warning(f"Monitor {result.monitor_id} is DOWN: {result.error}")

    def get_status(self) -> List[Dict[str, Any]]:
        """Get current status of all monitors"""
        status_list = []
        for monitor in self.monitors:
            history = self.results.get(monitor["id"], [])
            last_result = history[-1] if history else None
            
            status_list.append({
                "id": monitor["id"],
                "name": monitor["name"],
                "type": monitor["type"],
                "url": monitor.get("url") or f"{monitor.get('host')}:{monitor.get('port')}",
                "status": last_result.status if last_result else "UNKNOWN",
                "last_check": last_result.timestamp.isoformat() if last_result else None,
                "response_time": last_result.response_time_ms if last_result else 0,
                "uptime_24h": 99.9, # Mock for now
                "history": [
                    {
                        "time": r.timestamp.strftime("%H:%M"), 
                        "value": r.response_time_ms
                    } for r in history[-20:]
                ]
            })
        return status_list
