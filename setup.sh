#!/bin/bash

set -e

echo “================================================”
echo “  AI-Agentic Observability Platform Setup”
echo “================================================”
echo “”

# Colors

GREEN=’\033[0;32m’
YELLOW=’\033[1;33m’
RED=’\033[0;31m’
NC=’\033[0m’ # No Color

# Check if Docker is installed

if ! command -v docker &> /dev/null; then
echo -e “${RED}Docker is not installed. Please install Docker first.${NC}”
exit 1
fi

# Check if Docker Compose is installed

if ! command -v docker-compose &> /dev/null; then
echo -e “${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}”
exit 1
fi

echo -e “${GREEN}✓ Docker and Docker Compose are installed${NC}”

# Create directory structure

echo “”
echo “Creating directory structure…”
mkdir -p backend/{agents,data_ingestion,knowledge_graph,models,config}
mkdir -p frontend/src/{components,pages,lib,hooks}
mkdir -p logs data

echo -e “${GREEN}✓ Directory structure created${NC}”

# Check if .env exists

if [ ! -f .env ]; then
echo “”
echo -e “${YELLOW}⚠ .env file not found. Creating from template…${NC}”
cat > .env << ‘EOF’

# API Keys (REQUIRED - Add your keys here)

OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Security

SECRET_KEY=$(openssl rand -hex 32)

# Database URLs (auto-configured in docker-compose)

DATABASE_URL=postgresql+asyncpg://observai:observai@postgres:5432/observai
TIMESCALE_URL=postgresql+asyncpg://observai:observai@timescaledb:5432/metrics
REDIS_URL=redis://redis:6379
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=observai123

# Application Settings

LOG_LEVEL=INFO
ENABLE_DEBUG=false
EOF
echo -e “${YELLOW}⚠ Please edit .env and add your API keys${NC}”
echo “”
read -p “Press enter to continue after updating .env…”
fi

# Validate API keys

if grep -q “your-openai-key-here” .env || grep -q “your-anthropic-key-here” .env; then
echo -e “${YELLOW}⚠ Warning: API keys not configured. AI features may not work.${NC}”
read -p “Continue anyway? (y/n) “ -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
exit 1
fi
fi

echo “”
echo “Building Docker images…”
docker-compose build

echo “”
echo -e “${GREEN}✓ Docker images built successfully${NC}”

echo “”
echo “Starting services…”
docker-compose up -d

echo “”
echo “Waiting for services to be healthy…”
sleep 10

# Check service health

services=(“postgres” “redis” “timescaledb” “neo4j” “backend”)
for service in “${services[@]}”; do
echo -n “Checking $service… “
if docker-compose ps | grep -q “$service.*Up”; then
echo -e “${GREEN}✓${NC}”
else
echo -e “${RED}✗${NC}”
echo -e “${RED}Service $service failed to start. Check logs with: docker-compose logs $service${NC}”
fi
done

echo “”
echo “Initializing database…”
docker-compose exec -T backend python -c “
from sqlalchemy import create_engine
from models import Base
import os

DATABASE_URL = os.getenv(‘DATABASE_URL’).replace(’+asyncpg’, ‘’)
engine = create_engine(DATABASE_URL)
Base.metadata.create_all(engine)
print(‘Database initialized successfully’)
“

echo “”
echo -e “${GREEN}================================================”
echo “  Setup Complete!”
echo “================================================${NC}”
echo “”
echo “Access the platform:”
echo “  Frontend:    http://localhost:3000”
echo “  Backend API: http://localhost:8000”
echo “  API Docs:    http://localhost:8000/docs”
echo “  Neo4j:       http://localhost:7474 (neo4j/observai123)”
echo “  Grafana:     http://localhost:3001 (admin/admin)”
echo “”
echo “Next steps:”
echo “  1. Create a user: curl -X POST http://localhost:8000/api/v1/auth/register \”
echo “       -H ‘Content-Type: application/json’ \”
echo “       -d ‘{"email":"admin@example.com","password":"secure123","full_name":"Admin"}’”
echo “”
echo “  2. View logs: docker-compose logs -f”
echo “  3. Stop platform: docker-compose down”
echo “”
echo “For help: docker-compose logs -f backend”
echo “”
