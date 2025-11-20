"""
Debug script to verify SECRET_KEY consistency
Run this inside the backend container to check if tokens work
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, '/app')

from auth.jwt_handler import create_access_token, SECRET_KEY as JWT_SECRET
from main import SECRET_KEY as MAIN_SECRET
import jwt

print("=== SECRET_KEY Debug ===")
print(f"jwt_handler.py SECRET_KEY: {JWT_SECRET}")
print(f"main.py SECRET_KEY: {MAIN_SECRET}")
print(f"Keys match: {JWT_SECRET == MAIN_SECRET}")
print()

# Create a test token
print("=== Creating Test Token ===")
test_data = {"sub": "test_user", "email": "test@example.com"}
token = create_access_token(test_data)
print(f"Token created: {token[:50]}...")
print()

# Try to decode with jwt_handler's key
print("=== Decoding with jwt_handler SECRET_KEY ===")
try:
    payload1 = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    print(f"✓ Success: {payload1}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Try to decode with main.py's key
print("=== Decoding with main.py SECRET_KEY ===")
try:
    payload2 = jwt.decode(token, MAIN_SECRET, algorithms=["HS256"])
    print(f"✓ Success: {payload2}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Check environment
print("=== Environment Variables ===")
print(f"SECRET_KEY from env: {os.getenv('SECRET_KEY', 'NOT SET')}")
print(f"OPENAI_API_KEY from env: {os.getenv('OPENAI_API_KEY', 'NOT SET')[:20]}...")
