"""
Uptime Monitor - Website & API Monitoring with Email Alerts
Monitors availability, response time, and sends email alerts on status changes
"""
import asyncio
import logging
import aiohttp
import time
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import select

logger = logging.getLogger(__name__)

class UptimeMonitor:
    """
    Uptime Monitor Service
    Checks HTTP/HTTPS endpoints from database and sends email alerts
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
            
        self.running = False
        self.initialized = True
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        
        logger.info("Uptime Monitor initialized")

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
        """Main monitoring loop - checks every 60 seconds"""
        while self.running:
            try:
                await self._check_all_monitors()
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
            
            await asyncio.sleep(60)

    async def _check_all_monitors(self):
        """Check all active monitors from database"""
        from models.database import AsyncSessionLocal, Monitor, User
        
        async with AsyncSessionLocal() as session:
            # Get monitors that need checking
            now = datetime.utcnow()
            result = await session.execute(
                select(Monitor, User).join(User, Monitor.user_id == User.id).where(
                    Monitor.is_active == True
                )
            )
            monitors_with_users = result.all()
            
            for monitor, user in monitors_with_users:
                # Check if it's time to check this monitor
                if monitor.last_checked:
                    next_check = monitor.last_checked + timedelta(seconds=monitor.interval_seconds)
                    if now < next_check:
                        continue
                
                # Perform check
                try:
                    status, response_time = await self._check_monitor(monitor)
                    
                    # Detect status change
                    status_changed = monitor.last_status and monitor.last_status != status
                    
                    # Update monitor
                    monitor.last_status = status
                    monitor.last_checked = now
                    monitor.response_time = response_time
                    await session.commit()
                    
                    # Send alert if status changed
                    if status_changed:
                        await self._send_alert(monitor, user, status)
                        
                except Exception as e:
                    logger.error(f"Error checking monitor {monitor.name}: {e}")

    async def _check_monitor(self, monitor) -> tuple[str, float]:
        """Execute a single check and return (status, response_time_ms)"""
        start_time = time.time()
        status = "down"
        
        try:
            if monitor.monitor_type == "http":
                async with aiohttp.ClientSession() as session:
                    async with session.get(monitor.url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        if 200 <= response.status < 400:
                            status = "up"
                            
            elif monitor.monitor_type == "ping":
                # Simple TCP connection check
                host = monitor.url.replace("http://", "").replace("https://", "").split("/")[0]
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(host, 80),
                    timeout=10
                )
                status = "up"
                writer.close()
                await writer.wait_closed()
                
        except Exception as e:
            logger.warning(f"Monitor {monitor.name} check failed: {e}")
            status = "down"
            
        duration = (time.time() - start_time) * 1000
        return status, round(duration, 2)

    async def _send_alert(self, monitor, user, new_status: str):
        """Send email alert on status change
        - 'non-working' email: Only when site goes down (up→down)
        - 'working' email: Only when site recovers (down→up)
        """
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP not configured, skipping email alert")
            if new_status == "up":
                logger.info(f"✅ WORKING: Monitor '{monitor.name}' ({monitor.url}) is back UP")
            else:
                logger.info(f"🚨 NON-WORKING: Monitor '{monitor.name}' ({monitor.url}) is DOWN")
            return
        
        try:
            # Determine email type based on new status
            if new_status == "up":
                # Site recovered (down → up)
                subject = f"✅ WORKING: {monitor.name} is back online"
                body = f"""
Hello {user.full_name},

Good news! Your monitored service has recovered and is now working.

Monitor: {monitor.name}
URL: {monitor.url}
Status: WORKING (UP)
Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

Your service is now responding normally with HTTP 200 OK.

Best regards,
ObservAI Monitoring System
"""
            else:
                # Site went down (up → down or first check)
                subject = f"🚨 NON-WORKING: {monitor.name} is down"
                body = f"""
Hello {user.full_name},

Alert! Your monitored service is currently not working.

Monitor: {monitor.name}
URL: {monitor.url}
Status: NON-WORKING (DOWN)
Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

The service is not responding or returning an error status code.
Please investigate the issue as soon as possible.

Best regards,
ObservAI Monitoring System
"""
            
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = user.email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Alert email sent to {user.email} for monitor {monitor.name} (status: {new_status})")
            
        except Exception as e:
            logger.error(f"Failed to send alert email: {e}")

    def get_status(self) -> List[Dict[str, Any]]:
        """Get current status - kept for compatibility"""
        return []
