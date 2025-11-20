#!/bin/bash

# Debug script to test authentication flow

echo "=== Testing Authentication Flow ==="
echo ""

# Test 1: Register a new user
echo "1. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test User"
  }')

echo "Register Response:"
echo $REGISTER_RESPONSE | jq '.'
echo ""

# Extract token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.access_token')
echo "Extracted Token: $TOKEN"
echo ""

# Test 2: Try to access protected endpoint
echo "2. Testing protected endpoint with token..."
AGENTS_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/v1/agents" \
  -H "Authorization: Bearer $TOKEN")

echo "Agents Response:"
echo $AGENTS_RESPONSE | jq '.'
echo ""

# Test 3: Login with existing user
echo "3. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jinesh@gmail.com",
    "password": "jinesh"
  }')

echo "Login Response:"
echo $LOGIN_RESPONSE | jq '.'
echo ""

# Extract login token
LOGIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "Login Token: $LOGIN_TOKEN"
echo ""

# Test 4: Use login token
echo "4. Testing protected endpoint with login token..."
QUERY_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/query" \
  -H "Authorization: Bearer $LOGIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me system status"
  }')

echo "Query Response:"
echo $QUERY_RESPONSE | jq '.'
