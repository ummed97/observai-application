from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.resource import SubscriptionClient
import logging

logger = logging.getLogger(__name__)

class AzureConnector:
    def __init__(self, credentials):
        """
        Initialize Azure Connector with Service Principal credentials
        credentials: dict containing client_id, client_secret, tenant_id
        """
        self.client_id = credentials.get("client_id")
        self.client_secret = credentials.get("client_secret")
        self.tenant_id = credentials.get("tenant_id")
        
        if not all([self.client_id, self.client_secret, self.tenant_id]):
            raise ValueError("Missing required credentials: client_id, client_secret, tenant_id")

        self.credential = ClientSecretCredential(
            client_id=self.client_id,
            client_secret=self.client_secret,
            tenant_id=self.tenant_id
        )

    async def validate(self):
        """
        Validate credentials by attempting to list subscriptions
        Returns: True if valid, raises Exception if invalid
        """
        try:
            # We use SubscriptionClient to test access
            # Note: In a real async app, we should use the async versions of Azure SDK clients
            # For this MVP, we'll use the sync client in a way that doesn't block too much, 
            # or wrap in run_in_executor if needed. 
            # Ideally: use azure-mgmt-resource.aio
            
            # Using sync client for simplicity in MVP, but wrapped in try/catch
            sub_client = SubscriptionClient(self.credential)
            # Just try to get the first page of subscriptions
            next(sub_client.subscriptions.list(), None)
            return True
        except Exception as e:
            logger.error(f"Azure validation failed: {str(e)}")
            raise Exception(f"Failed to authenticate with Azure: {str(e)}")

    async def fetch_resources(self):
        """
        Fetch all resources using Azure Resource Graph (ARG)
        For MVP, we'll just list resources via ResourceManagementClient
        """
        try:
            # 1. Get all subscriptions
            sub_client = SubscriptionClient(self.credential)
            subs = list(sub_client.subscriptions.list())
            
            all_resources = []
            
            for sub in subs:
                resource_client = ResourceManagementClient(self.credential, sub.subscription_id)
                # List all resources in subscription
                resources = resource_client.resources.list()
                for r in resources:
                    all_resources.append({
                        "id": r.id,
                        "name": r.name,
                        "type": r.type,
                        "location": r.location,
                        "tags": r.tags,
                        "subscription_id": sub.subscription_id
                    })
            
            return all_resources
        except Exception as e:
            logger.error(f"Failed to fetch Azure resources: {str(e)}")
            raise e
