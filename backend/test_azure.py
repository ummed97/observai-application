import asyncio
import os
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Ensure we can import from backend modules
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_azure_connection():
    print("🚀 Starting Azure Connection Test...")
    
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    if not subscription_id:
        print("❌ Error: AZURE_SUBSCRIPTION_ID not found in environment variables.")
        return

    print(f"ℹ️  Using Subscription ID: {subscription_id}")
    
    # 1. Test Azure Monitor Collector (VM Metrics)
    print("\nTesting Azure Monitor Collector...")
    try:
        from data_ingestion.azure_collector import AzureMonitorCollector
        collector = AzureMonitorCollector()
        
        if not collector.enabled:
            print("❌ Azure Monitor Collector failed to initialize (check logs).")
        else:
            print("✅ Azure Monitor Collector initialized.")
            
            # Try to fetch metrics
            print("   Fetching metrics (this may take a moment)...")
            metrics = await collector.collect_metrics()
            
            if metrics:
                print(f"✅ Successfully collected {len(metrics)} metric data points.")
                print(f"   Sample: {metrics[0]}")
            else:
                print("⚠️  No metrics collected. This might be expected if no VMs are running or have data.")
                
    except Exception as e:
        print(f"❌ Error testing Azure Monitor: {e}")

    # 2. Test Cost Agent (Cost Management)
    print("\nTesting Cost Agent...")
    try:
        from agents.cost_agent import CostAgent
        cost_agent = CostAgent()
        await cost_agent.initialize()
        
        if not cost_agent.enabled:
            print("❌ Cost Agent failed to initialize.")
        else:
            print("✅ Cost Agent initialized.")
            
            # Try to fetch costs for last 7 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            print("   Fetching cost data...")
            cost_data = await cost_agent.analyze_costs(start_date, end_date, "ServiceName")
            
            if "error" in cost_data:
                print(f"❌ Error fetching costs: {cost_data['error']}")
            else:
                print(f"✅ Successfully fetched cost data.")
                print(f"   Total Cost: {cost_data.get('total_cost')} {cost_data.get('currency')}")
                if cost_data.get('breakdown'):
                    print(f"   Top Service: {cost_data['breakdown'][0]}")

    except Exception as e:
        print(f"❌ Error testing Cost Agent: {e}")

if __name__ == "__main__":
    asyncio.run(test_azure_connection())
