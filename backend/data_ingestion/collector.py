"""
Data Collector - Unified Data Ingestion
Collects metrics, logs, and traces from various sources
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import asyncpg
from data_ingestion.azure_collector import AzureMonitorCollector

logger = logging.getLogger(__name__)


class DataCollector:
    """
    Data Collector - Ingests telemetry from multiple sources
    """
    
    def __init__(self):
        self.running = False
        self.metrics_buffer = defaultdict(list)
        self.db_pool: Optional[asyncpg.Pool] = None
        self.azure_collector = AzureMonitorCollector()
    
    async def start(self):
        """Start the data collector"""
        logger.info("Starting Data Collector...")
        self.running = True
        
        # Initialize database connection pool
        try:
            self.db_pool = await asyncpg.create_pool(
                host="timescaledb",
                port=5432,
                user="observai",
                password="observai",
                database="metrics",
                min_size=5,
                max_size=20
            )
            logger.info("Connected to TimescaleDB")
        except Exception as e:
            logger.error(f"Failed to connect to TimescaleDB: {e}")
        
        # Start background collection tasks
        asyncio.create_task(self._flush_metrics_periodically())
        
        logger.info("Data Collector started")
    
    async def stop(self):
        """Stop the data collector"""
        logger.info("Stopping Data Collector...")
        self.running = False
        
        if self.db_pool:
            await self.db_pool.close()
    
    async def ingest_metrics(self, metrics: List[Dict[str, Any]]) -> bool:
        """
        Ingest metrics from various sources
        """
        try:
            for metric in metrics:
                # Validate metric
                if not self._validate_metric(metric):
                    logger.warning(f"Invalid metric: {metric}")
                    continue
                
                # Add to buffer
                metric_name = metric.get("metric_name")
                self.metrics_buffer[metric_name].append(metric)
                
                # Store in database
                if self.db_pool:
                    await self._store_metric(metric)
            
            return True
            
        except Exception as e:
            logger.error(f"Metric ingestion error: {e}")
            return False
    
    def _validate_metric(self, metric: Dict[str, Any]) -> bool:
        """Validate metric data"""
        required_fields = ["timestamp", "source", "metric_name", "value"]
        return all(field in metric for field in required_fields)
    
    async def _store_metric(self, metric: Dict[str, Any]):
        """Store metric in TimescaleDB"""
        try:
            query = """
                INSERT INTO metrics (timestamp, source, metric_name, value, labels)
                VALUES ($1, $2, $3, $4, $5)
            """
            
            await self.db_pool.execute(
                query,
                metric.get("timestamp"),
                metric.get("source"),
                metric.get("metric_name"),
                metric.get("value"),
                metric.get("labels", {})
            )
            
        except Exception as e:
            logger.error(f"Failed to store metric: {e}")
    
    async def query_metrics(
        self,
        metric_name: str,
        start_time: datetime,
        end_time: datetime,
        labels: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query metrics from database
        """
        try:
            if not self.db_pool:
                return []
            
            query = """
                SELECT timestamp, source, metric_name, value, labels
                FROM metrics
                WHERE metric_name = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
                ORDER BY timestamp DESC
                LIMIT 1000
            """
            
            rows = await self.db_pool.fetch(
                query,
                metric_name,
                start_time,
                end_time
            )
            
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"Query metrics error: {e}")
            return []
    
    async def _flush_metrics_periodically(self):
        """Periodically flush metrics buffer"""
        while self.running:
            try:
                await asyncio.sleep(60)  # Flush every minute
                
                # Collect Azure Metrics periodically
                if self.azure_collector.enabled:
                    azure_metrics = await self.azure_collector.collect_metrics()
                    if azure_metrics:
                        await self.ingest_metrics(azure_metrics)
                        logger.info(f"Collected {len(azure_metrics)} Azure metrics")
                
                # Process buffered metrics
                for metric_name, metrics in self.metrics_buffer.items():
                    if len(metrics) > 100:
                        # Keep only recent metrics
                        self.metrics_buffer[metric_name] = metrics[-100:]
                
            except Exception as e:
                logger.error(f"Flush metrics error: {e}")
    
    async def ingest_logs(self, logs: List[Dict[str, Any]]) -> bool:
        """Ingest logs from various sources"""
        try:
            # Store logs (simplified - would use OpenSearch/Loki in production)
            logger.info(f"Ingested {len(logs)} log entries")
            return True
        except Exception as e:
            logger.error(f"Log ingestion error: {e}")
            return False
    
    async def ingest_traces(self, traces: List[Dict[str, Any]]) -> bool:
        """Ingest distributed traces"""
        try:
            # Store traces (simplified - would use Tempo/Jaeger in production)
            logger.info(f"Ingested {len(traces)} traces")
            return True
        except Exception as e:
            logger.error(f"Trace ingestion error: {e}")
            return False
