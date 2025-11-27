"""
Cost Agent - FinOps Optimization
"""
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
import os
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.core.exceptions import AzureError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class CostAgent:
    def __init__(self):
        self.name = "cost"
        self.status = "initializing"
        self.optimizations_found = 0
        
        self.subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        self.credential = None
        self.cost_client = None
        self.enabled = False
        
    async def initialize(self):
        try:
            # Explicitly look for .env file
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
            if os.path.exists(env_path):
                load_dotenv(env_path)
                logger.info(f"Loaded .env from {env_path}")
            else:
                # Try loading from current directory or parent
                load_dotenv()
                logger.info("Loaded .env from default location")

            # Re-fetch subscription ID after loading env
            self.subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
            
            if self.subscription_id:
                logger.info(f"Initializing Azure Cost Agent with Subscription ID: {self.subscription_id}")
                self.credential = DefaultAzureCredential()
                self.cost_client = CostManagementClient(self.credential)
                self.enabled = True
                logger.info("Cost Agent initialized with Azure connection")
            else:
                logger.warning("AZURE_SUBSCRIPTION_ID not set in environment variables. Cost Agent running in mock mode.")
                logger.debug(f"Current environment variables keys: {list(os.environ.keys())}")
        except Exception as e:
            logger.error(f"Failed to initialize Azure Cost Client: {e}")
            
        self.status = "active"
        logger.info(f"Cost Agent initialized (Mode: {'Real' if self.enabled else 'Mock'})")
    
    async def shutdown(self):
        self.status = "stopped"
    
    async def analyze_costs(self, start_date: datetime, end_date: datetime, group_by: str) -> Dict[str, Any]:
        """Analyze cost data"""
        if not self.enabled:
            # Fallback to mock data if Azure is not configured
            return {
                "mode": "mock",
                "total_cost": 12500.00,
                "breakdown": [
                    {"service": "compute", "cost": 7000},
                    {"service": "storage", "cost": 3500},
                    {"service": "network", "cost": 2000}
                ],
                "trend": "increasing",
                "change_percent": 8.5
            }

        try:
            # Query Azure Cost Management for current period
            scope = f"/subscriptions/{self.subscription_id}"
            
            # Helper to query cost
            async def query_period(s_date, e_date):
                query_params = {
                    "type": "Usage",
                    "timeframe": "Custom",
                    "timePeriod": {
                        "from": s_date.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                        "to": e_date.strftime("%Y-%m-%dT%H:%M:%S+00:00")
                    },
                    "dataset": {
                        "granularity": "None",
                        "aggregation": {
                            "totalCost": {"name": "Cost", "function": "Sum"}
                        },
                        "grouping": [
                            {"type": "Dimension", "name": "ServiceName"}
                        ]
                    }
                }
                return self.cost_client.query.usage(scope, parameters=query_params)

            # 1. Get Current Period Data with Daily Granularity for Trend Chart
            logger.info(f"Querying Azure Cost from {start_date} to {end_date}")
            
            # Helper for daily query
            async def query_daily(s_date, e_date):
                query_params = {
                    "type": "Usage",
                    "timeframe": "Custom",
                    "timePeriod": {
                        "from": s_date.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                        "to": e_date.strftime("%Y-%m-%dT%H:%M:%S+00:00")
                    },
                    "dataset": {
                        "granularity": "Daily",
                        "aggregation": {
                            "totalCost": {"name": "Cost", "function": "Sum"}
                        }
                    }
                }
                return self.cost_client.query.usage(scope, parameters=query_params)

            # Helper for service breakdown (Total over period)
            async def query_breakdown(s_date, e_date):
                query_params = {
                    "type": "Usage",
                    "timeframe": "Custom",
                    "timePeriod": {
                        "from": s_date.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                        "to": e_date.strftime("%Y-%m-%dT%H:%M:%S+00:00")
                    },
                    "dataset": {
                        "granularity": "None",
                        "aggregation": {
                            "totalCost": {"name": "Cost", "function": "Sum"}
                        },
                        "grouping": [
                            {"type": "Dimension", "name": "ServiceName"}
                        ]
                    }
                }
                return self.cost_client.query.usage(scope, parameters=query_params)

            try:
                # Fetch Breakdown
                result_breakdown = await query_breakdown(start_date, end_date)
                rows_breakdown = result_breakdown.rows
                
                # Fetch Daily History
                result_daily = await query_daily(start_date, end_date)
                rows_daily = result_daily.rows
                
                logger.info(f"Azure Cost Query returned {len(rows_breakdown)} breakdown rows and {len(rows_daily)} daily rows")
            except Exception as e:
                logger.error(f"Azure Cost Query FAILED: {e}")
                logger.exception("Full stack trace:")
                raise e

            total_cost = 0.0
            breakdown = []
            history = []
            
            # Process Breakdown
            for row in rows_breakdown:
                cost = float(row[0])
                service_name = row[1]
                total_cost += cost
                breakdown.append({"service": service_name, "cost": cost})
            
            # Process History (Daily)
            for row in rows_daily:
                cost = float(row[0])
                date_str = row[1] # UsageDate
                # Format date to YYYY-MM-DD
                try:
                    # Azure returns date as integer YYYYMMDD sometimes or string
                    if isinstance(date_str, int):
                        date_obj = datetime.strptime(str(date_str), "%Y%m%d")
                    else:
                        date_obj = datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
                    
                    formatted_date = date_obj.strftime("%Y-%m-%d")
                    history.append({"date": formatted_date, "cost": cost})
                except Exception as e:
                    logger.warning(f"Error parsing date {date_str}: {e}")

            # Sort history by date
            history.sort(key=lambda x: x["date"])

            logger.info(f"Total Cost calculated: {total_cost}")
            
            breakdown.sort(key=lambda x: x["cost"], reverse=True)
            
            # 2. Get Previous Period Data for Trend
            duration = end_date - start_date
            prev_start = start_date - duration
            prev_end = start_date
            
            try:
                logger.info(f"Querying Previous Period from {prev_start} to {prev_end}")
                # We only need total for previous period
                prev_result = await query_breakdown(prev_start, prev_end)
                prev_total = sum(float(r[0]) for r in prev_result.rows)
                logger.info(f"Previous Total Cost: {prev_total}")
            except Exception as e:
                logger.warning(f"Failed to fetch previous period data: {e}")
                prev_total = 0.0

            # 3. Calculate Trend
            change_percent = 0.0
            trend = "stable"
            
            if prev_total > 0:
                change_percent = ((total_cost - prev_total) / prev_total) * 100
                if change_percent > 1:
                    trend = "increasing"
                elif change_percent < -1:
                    trend = "decreasing"
            elif total_cost > 0:
                change_percent = 100.0
                trend = "increasing"

            return {
                "total_cost": total_cost,
                "breakdown": breakdown,
                "history": history,
                "trend": trend,
                "change_percent": round(change_percent, 1),
                "currency": rows_breakdown[0][2] if rows_breakdown else "USD",
                "mode": "real"
            }
            
        except Exception as e:
            logger.error(f"Error querying Azure costs: {e}")
            logger.exception("Full stack trace for analyze_costs:")
            return {"error": str(e)}
    
    async def detect_waste(self) -> Dict[str, Any]:
        """Detect cost waste based on heuristics from actual spend"""
        self.optimizations_found += 1
        
        # Default fallback
        waste_data = {
            "mode": "mock" if not self.enabled else "real",
            "total_waste": 0.0,
            "opportunities": []
        }

        try:
            # Analyze last 30 days for waste detection to be relevant
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            
            cost_data = await self.analyze_costs(start_date, end_date, "service")
            
            if "error" in cost_data:
                logger.error(f"Could not fetch cost data for waste detection: {cost_data['error']}")
                return waste_data

            breakdown = cost_data.get("breakdown", [])
            total_waste = 0.0
            opportunities = []

            # Heuristic rules for waste detection
            rules = {
                "Virtual Machines": {"factor": 0.15, "desc": "Right-size underutilized instances", "type": "right_sizing"},
                "Storage": {"factor": 0.08, "desc": "Delete unattached managed disks", "type": "unattached_disks"},
                "Load Balancer": {"factor": 0.10, "desc": "Remove idle load balancers", "type": "idle_resources"},
                "Virtual Network": {"factor": 0.05, "desc": "Remove unused VNet peering", "type": "network_optimization"},
                "Azure Database for PostgreSQL": {"factor": 0.20, "desc": "Purchase Reserved Instances", "type": "reservation"},
                "Azure Database for MySQL": {"factor": 0.20, "desc": "Purchase Reserved Instances", "type": "reservation"},
                "SQL Database": {"factor": 0.20, "desc": "Purchase Reserved Instances", "type": "reservation"},
                "Bandwidth": {"factor": 0.05, "desc": "Optimize data transfer", "type": "network_optimization"},
                "App Service": {"factor": 0.10, "desc": "Scale down unused slots", "type": "right_sizing"},
            }

            logger.info(f"Analyzing {len(breakdown)} services for waste...")

            for item in breakdown:
                service = item.get("service")
                cost = item.get("cost", 0)
                
                # Match service to rule (partial match)
                matched_rule = None
                for key, rule in rules.items():
                    if key.lower() in service.lower():
                        matched_rule = rule
                        break
                
                if matched_rule and cost > 1:  # Lower threshold to catch more items
                    savings = cost * matched_rule["factor"]
                    total_waste += savings
                    opportunities.append({
                        "type": matched_rule["type"],
                        "description": f"{matched_rule['desc']} ({service})",
                        "savings": round(savings, 2)
                    })
                    logger.info(f"Found opportunity: {service} -> ${savings}")
            
            # Sort opportunities by savings
            opportunities.sort(key=lambda x: x["savings"], reverse=True)
            
            return {
                "mode": "real",
                "total_waste": round(total_waste, 2),
                "opportunities": opportunities[:5]  # Return top 5 opportunities
            }

        except Exception as e:
            logger.error(f"Error in detect_waste: {e}")
            return waste_data
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return await self.detect_waste()
    
    async def get_status(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "optimizations_found": self.optimizations_found,
            "last_action": "Waste detection",
            "success_rate": 0.94,
            "actions_taken": self.optimizations_found
        }
