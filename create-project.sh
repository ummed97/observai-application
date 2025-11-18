#!/bin/bash

# ================================================================
# AI-Agentic Observability Platform - Project Creation Script
# This script creates the complete directory structure
# ================================================================

set -e

PROJECT_NAME="ai-observability-platform"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "================================================================"
echo "  AI-Agentic Observability Platform"
echo "  Project Structure Creation"
echo "================================================================"
echo -e "${NC}"

# Create root directory
echo -e "${YELLOW}Creating project directory...${NC}"
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Create backend structure
echo -e "${YELLOW}Creating backend structure...${NC}"
mkdir -p backend/{agents,data_ingestion,knowledge_graph,models,auth,config,tests}
mkdir -p backend/data_ingestion/connectors

# Create backend __init__ files
touch backend/__init__.py
touch backend/agents/__init__.py
touch backend/data_ingestion/__init__.py
touch backend/knowledge_graph/__init__.py
touch backend/models/__init__.py
touch backend/auth/__init__.py

# Create frontend structure
echo -e "${YELLOW}Creating frontend structure...${NC}"
mkdir -p frontend/public
mkdir -p frontend/src/{components,pages,lib,hooks,types}
mkdir -p frontend/src/components/{Dashboard,Topology,Chat,Common}

# Create additional directories
echo -e "${YELLOW}Creating additional directories...${NC}"
mkdir -p logs data grafana/{dashboards,datasources}
mkdir -p docs k8s scripts

echo -e "${GREEN}✓ Directory structure created!${NC}"
echo ""
echo "Project Structure:"
echo "===================="
tree -L 3 -d $PROJECT_NAME 2>/dev/null || find $PROJECT_NAME -type d -print | head -30

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Copy all artifact code into respective files"
echo "2. Copy .env.example to .env and add your API keys"
echo "3. Run: chmod +x setup.sh"
echo "4. Run: ./setup.sh"
echo ""
echo -e "${GREEN}Files to create (copy from artifacts):${NC}"
echo ""
echo "Backend Files:"
echo "  - backend/main.py"
echo "  - backend/agents/orchestrator.py"
echo "  - backend/agents/detector_agent.py"
echo "  - backend/agents/diagnoser_agent.py"
echo "  - backend/agents/forecaster_agent.py"
echo "  - backend/agents/remediator_agent.py"
echo "  - backend/agents/cost_agent.py"
echo "  - backend/data_ingestion/collector.py"
echo "  - backend/knowledge_graph/graph_engine.py"
echo "  - backend/models/database.py"
echo "  - backend/auth/jwt_handler.py"
echo "  - backend/config/agents.yaml"
echo "  - backend/config/data_sources.yaml"
echo "  - backend/requirements.txt"
echo "  - backend/Dockerfile"
echo "  - backend/init.sql"
echo ""
echo "Frontend Files:"
echo "  - frontend/src/index.tsx"
echo "  - frontend/src/index.css"
echo "  - frontend/src/App.tsx"
echo "  - frontend/src/pages/Dashboard.tsx"
echo "  - frontend/src/pages/TopologyView.tsx"
echo "  - frontend/src/pages/NLQuery.tsx"
echo "  - frontend/src/pages/Incidents.tsx"
echo "  - frontend/src/pages/CostAnalytics.tsx"
echo "  - frontend/src/pages/Login.tsx"
echo "  - frontend/src/components/Common/Sidebar.tsx"
echo "  - frontend/src/components/Common/Header.tsx"
echo "  - frontend/src/hooks/useAuth.ts"
echo "  - frontend/src/types/index.ts"
echo "  - frontend/package.json"
echo "  - frontend/tsconfig.json"
echo "  - frontend/tailwind.config.js"
echo "  - frontend/vite.config.ts"
echo "  - frontend/Dockerfile"
echo "  - frontend/nginx.conf"
echo "  - frontend/public/index.html"
echo ""
echo "Configuration Files:"
echo "  - docker-compose.yml"
echo "  - otel-collector-config.yaml"
echo "  - prometheus.yml"
echo "  - .env.example"
echo "  - setup.sh"
echo "  - README.md"
echo "  - MIGRATION.md"
echo ""
echo -e "${YELLOW}All artifact code is available in the conversation above!${NC}"
