"""
Quick script to get an authentication token for testing
Uses the default admin user from init.sql
"""
import requests
import json

# Backend URL
BASE_URL = "http://localhost:8000"

# Default admin credentials from init.sql
# Email: admin@observability.dev
# Password: admin123

def get_token():
    login_url = f"{BASE_URL}/api/v1/auth/login"
    
    credentials = {
        "email": "admin@observability.dev",
        "password": "admin123"
    }
    
    print("Logging in with default admin credentials...")
    print(f"Email: {credentials['email']}")
    
    try:
        response = requests.post(login_url, json=credentials)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print("\n✓ Login successful!")
            print(f"\nYour token:\n{token}")
            print("\n" + "="*80)
            print("\nTo test the cost endpoint, run:")
            print(f'\ncurl -H "Authorization: Bearer {token}" {BASE_URL}/api/v1/cost/waste')
            print("\n" + "="*80)
            return token
        else:
            print(f"\n✗ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nMake sure the backend server is running on port 8000")
        return None

if __name__ == "__main__":
    get_token()
