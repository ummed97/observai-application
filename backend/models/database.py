"""
Database Models and Configuration
SQLAlchemy models for all platform entities
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON, ForeignKey, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    """User accounts"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatHistory(Base):
    """AI Query chat history per user"""
    __tablename__ = "chat_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('idx_chat_user_time', 'user_id', 'timestamp'),
    )

class Metric(Base):
    """Time-series metrics data"""
    __tablename__ = "metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, nullable=False, index=True)
    source = Column(String, nullable=False, index=True)
    metric_name = Column(String, nullable=False, index=True)
    value = Column(Float, nullable=False)
    labels = Column(JSON, default={})
    tenant_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_metric_time_name', 'timestamp', 'metric_name'),
        Index('idx_metric_source_name', 'source', 'metric_name'),
    )

class Incident(Base):
    """Incident tracking"""
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text)
    severity = Column(String, nullable=False, index=True)  # critical, high, medium, low
    status = Column(String, nullable=False, index=True)  # open, investigating, resolved, closed
    root_cause = Column(Text)
    affected_services = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    tenant_id = Column(String, index=True)

    # AI Analysis
    anomaly_data = Column(JSON)
    agent_analysis = Column(JSON)
    predicted_impact = Column(JSON)
    remediation_steps = Column(JSON)
    remediation_executed = Column(Boolean, default=False)
    remediation_result = Column(JSON)

class AgentActivity(Base):
    """Track agent actions and decisions"""
    __tablename__ = "agent_activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_type = Column(String, nullable=False, index=True)
    action_type = Column(String, nullable=False)
    context = Column(JSON)
    result = Column(JSON)
    success = Column(Boolean)
    execution_time = Column(Float)  # seconds
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    incident_id = Column(String, ForeignKey('incidents.id'))

class TopologyNode(Base):
    """Infrastructure topology nodes"""
    __tablename__ = "topology_nodes"

    node_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, index=True)  # service, database, pod, vm, etc.
    status = Column(String, nullable=False)  # healthy, warning, critical, unknown
    node_metadata = Column(JSON, default={})
    labels = Column(JSON, default={})
    tenant_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TopologyEdge(Base):
    """Infrastructure topology relationships"""
    __tablename__ = "topology_edges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_node_id = Column(String, ForeignKey('topology_nodes.node_id'), nullable=False)
    target_node_id = Column(String, ForeignKey('topology_nodes.node_id'), nullable=False)
    edge_type = Column(String, nullable=False)  # depends_on, calls, stores_in, etc.
    edge_metadata = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_edge_source_target', 'source_node_id', 'target_node_id'),
    )

class CostRecord(Base):
    """Cost tracking"""
    __tablename__ = "cost_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(DateTime, nullable=False, index=True)
    cloud_provider = Column(String, nullable=False, index=True)  # azure, aws, gcp
    service_name = Column(String, nullable=False, index=True)
    resource_id = Column(String)
    cost = Column(Float, nullable=False)
    currency = Column(String, default='USD')
    tags = Column(JSON, default={})
    tenant_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Prediction(Base):
    """ML predictions and forecasts"""
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_type = Column(String, nullable=False, index=True)  # capacity, failure, cost
    target = Column(String, nullable=False)  # service/resource being predicted
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    prediction_time = Column(DateTime, nullable=False)  # when prediction is for
    predicted_value = Column(Float)
    confidence = Column(Float)
    actual_value = Column(Float)  # for validation
    prediction_metadata = Column(JSON)
    tenant_id = Column(String, index=True)

class RemediationAction(Base):
    """Remediation actions queue"""
    __tablename__ = "remediation_actions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String, ForeignKey('incidents.id'))
    action_type = Column(String, nullable=False)  # restart, scale, rollback, etc.
    target = Column(String, nullable=False)
    parameters = Column(JSON)
    status = Column(String, nullable=False, index=True)  # pending, approved, executing, completed, failed
    approval_required = Column(Boolean, default=True)
    approved_by = Column(String, ForeignKey('users.id'))
    approved_at = Column(DateTime)
    executed_at = Column(DateTime)
    result = Column(JSON)
    estimated_impact = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class DataSource(Base):
    """Connected data sources"""
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False, index=True)  # prometheus, azure, aws, etc.
    connection_config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime)
    tenant_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertRule(Base):
    """Alert rules configuration"""
    __tablename__ = "alert_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    rule_type = Column(String, nullable=False)  # threshold, anomaly, pattern
    condition = Column(JSON, nullable=False)
    severity = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    notification_channels = Column(JSON, default=[])
    tenant_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    """Audit trail for all actions"""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'))
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String)
    resource_id = Column(String)
    details = Column(JSON)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    tenant_id = Column(String, index=True)

# Database connection setup
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://observai:observai@observai-postgres:5432/observai"
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
