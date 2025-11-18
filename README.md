# AI-Agentic Observability Platform

A unified, AI-driven observability fabric that spans all clouds and environments, where autonomous agents continuously monitor, reason, correlate, and optimize infrastructure health without manual intervention.

## 🎯 Key Features

### ✅ Multi-Agent AI System

- **Detector Agent**: Real-time anomaly detection with ML-powered pattern analysis
- **Diagnoser Agent**: Root cause analysis with cross-signal correlation
- **Forecaster Agent**: Predictive failure detection and capacity planning
- **Remediator Agent**: Autonomous self-healing with approval workflows
- **Cost Agent**: FinOps optimization and waste detection

### ✅ Unified Observability

- Multi-cloud support (Azure, AWS, GCP, on-prem)
- OpenTelemetry-native data ingestion
- Metrics, logs, and traces in one platform
- Real-time streaming with WebSocket updates

### ✅ Knowledge Graph

- Interactive service topology visualization
- Dependency mapping and impact analysis
- Multi-hop root cause analysis
- Drift detection

### ✅ Natural Language Interface

- ChatOps-style query interface
- Ask questions in plain English
- Get insights with visualizations
- Context-aware responses

### ✅ Autonomous Remediation

- Policy-based automation
- Human-in-the-loop approval
- Rollback capabilities
- Action validation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Frontend (React + TypeScript)       │
│  Dashboard | Topology | NL Query | Incidents│
└──────────────────┬──────────────────────────┘
                   │ REST API + WebSocket
┌──────────────────┴──────────────────────────┐
│       Backend (FastAPI + Multi-Agents)       │
│  Agent Orchestrator | Data Collector         │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────┴────────┐   ┌────────┴──────────┐
│   PostgreSQL   │   │   TimescaleDB     │
│  (Main Data)   │   │    (Metrics)      │
└────────────────┘   └───────────────────┘
        │                     │
┌───────┴────────┐   ┌────────┴──────────┐
│     Neo4j      │   │      Redis        │
│ (Knowledge     │   │    (Caching)      │
│    Graph)      │   │                   │
└────────────────┘   └───────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenAI API key (or Anthropic Claude API key)
- 8GB+ RAM recommended
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ai-observability-platform.git
cd ai-observability-platform
```

### 2. Environment Setup

Create `.env` file in root directory:

```env
# API Keys (required)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Security
SECRET_KEY=your-super-secret-key-change-in-production

# Database URLs (auto-configured in docker-compose)
DATABASE_URL=postgresql+asyncpg://observai:observai@postgres:5432/observai
TIMESCALE_URL=postgresql+asyncpg://observai:observai@timescaledb:5432/metrics
REDIS_URL=redis://redis:6379
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=observai123
```

### 3. Start All Services

```bash
# Start entire platform
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 4. Access the Platform

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Neo4j Browser**: http://localhost:7474 (neo4j/observai123)
- **Grafana**: http://localhost:3001 (admin/admin)

### 5. Create First User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword",
    "full_name": "Admin User"
  }'
```

Response will contain `access_token` - save this for API calls.

## 📊 Usage Examples

### Ingest Metrics

```bash
curl -X POST http://localhost:8000/api/v1/ingest/metrics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{
    "timestamp": "2024-01-01T12:00:00Z",
    "source": "kubernetes",
    "metric_name": "cpu_usage",
    "value": 75.5,
    "labels": {"service": "api-gateway", "pod": "api-xyz"}
  }]'
```

### Query with Natural Language

```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Why did API latency increase in the last hour?"
  }'
```

### Get Agent Status

```bash
curl -X GET http://localhost:8000/api/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Configuration

### Agent Configuration

Edit `backend/config/agents.yaml`:

```yaml
agents:
  detector:
    enabled: true
    detection_interval: 30  # seconds
    anomaly_threshold: 2.5  # standard deviations
  
  diagnoser:
    enabled: true
    correlation_window: 300  # seconds
  
  forecaster:
    enabled: true
    prediction_horizon: 7  # days
  
  remediator:
    enabled: true
    auto_execute: false  # require approval
    allowed_actions:
      - restart_pod
      - scale_deployment
      - rollback_deployment
  
  cost:
    enabled: true
    scan_interval: 3600  # hourly
```

### Data Sources

Connect to existing monitoring tools:

```yaml
# backend/config/data_sources.yaml
sources:
  - type: prometheus
    url: http://prometheus:9090
    scrape_interval: 30s
  
  - type: azure_monitor
    subscription_id: your-sub-id
    resource_group: your-rg
    
  - type: aws_cloudwatch
    region: us-east-1
    access_key_id: your-key
    secret_access_key: your-secret
```

## 📚 API Documentation

Full API documentation available at http://localhost:8000/docs

### Key Endpoints

- `POST /api/v1/ingest/metrics` - Ingest metrics
- `GET /api/v1/incidents` - List incidents
- `GET /api/v1/agents` - Agent statuses
- `POST /api/v1/query` - Natural language query
- `GET /api/v1/topology/graph` - Get topology
- `GET /api/v1/cost/waste` - Cost waste detection
- `GET /api/v1/predictions/failures` - Failure predictions

## 🧪 Development

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build
```

### Run Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 🔒 Security

- All API endpoints require JWT authentication
- Secrets stored in environment variables
- Database connections encrypted
- RBAC for multi-tenancy
- Audit logging for all agent actions

## 📈 Monitoring the Platform

The platform monitors itself! You can:

- View platform metrics in Prometheus (port 9090)
- Visualize in Grafana (port 3001)
- Check health endpoint: `GET /health`

## 🤝 Contributing

1. Fork the repository
1. Create feature branch (`git checkout -b feature/amazing-feature`)
1. Commit changes (`git commit -m 'Add amazing feature'`)
1. Push to branch (`git push origin feature/amazing-feature`)
1. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support

- Documentation: https://docs.observability-platform.dev
- Issues: https://github.com/yourusername/ai-observability-platform/issues
- Discussions: https://github.com/yourusername/ai-observability-platform/discussions

## 🗺️ Roadmap

### Phase 1 (Current)

- ✅ Core platform infrastructure
- ✅ Basic AI agents
- ✅ Multi-cloud data ingestion
- ✅ Knowledge graph foundation

### Phase 2 (Q2 2024)

- 🔄 Advanced agent collaboration
- 🔄 Expanded integrations (GCP, Kubernetes)
- 🔄 Self-healing workflows
- 🔄 Enhanced NLP capabilities

### Phase 3 (Q3 2024)

- 📅 FinOps intelligence
- 📅 Security monitoring
- 📅 Advanced predictions
- 📅 Plugin marketplace

### Phase 4 (Q4 2024)

- 📅 Enterprise features
- 📅 Multi-tenancy
- 📅 Compliance certifications
- 📅 Agent marketplace

## 🙏 Acknowledgments

Built with:

- FastAPI
- React
- OpenTelemetry
- LangChain
- Neo4j
- TimescaleDB

-----

**Made with ❤️ for DevOps and SRE teams worldwide**
