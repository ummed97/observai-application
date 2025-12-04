-- Database Initialization Script
-- Creates necessary extensions and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic data (if needed)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Create indexes for better performance
-- (Additional indexes beyond those defined in SQLAlchemy models)

-- Metrics table partitioning setup (for better time-series performance)
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR DEFAULT uuid_generate_v4()::text PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    source VARCHAR NOT NULL,
    metric_name VARCHAR NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}',
    tenant_id VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_time_name ON metrics (timestamp, metric_name);
CREATE INDEX IF NOT EXISTS idx_metric_source_name ON metrics (source, metric_name);

-- TimescaleDB hypertable disabled - not available in standard PostgreSQL
-- This doesn't affect functionality, just disables automatic time-series partitioning
-- SELECT create_hypertable('metrics', 'timestamp', if_not_exists => TRUE);


-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';

-- Seed data for development/testing
-- Insert default admin user (password: admin123)
INSERT INTO users (id, email, hashed_password, full_name, is_active, is_superuser, created_at)
VALUES (
uuid_generate_v4()::text,
'admin@observability.dev',
'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lW7VXCw6.K0S',  -- admin123
'Platform Administrator',
true,
true,
NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert sample topology nodes for demo
INSERT INTO topology_nodes (node_id, name, type, status, metadata, created_at)
VALUES
('node-api-gateway', 'API Gateway', 'service', 'healthy', '{"version": "1.0.0", "replicas": 3}', NOW()),
('node-auth-service', 'Auth Service', 'service', 'healthy', '{"version": "2.1.0", "replicas": 2}', NOW()),
('node-database-primary', 'Primary Database', 'database', 'healthy', '{"type": "postgresql", "size": "large"}', NOW()),
('node-cache-redis', 'Redis Cache', 'cache', 'healthy', '{"version": "7.0", "memory": "4GB"}', NOW()),
('node-message-queue', 'Message Queue', 'service', 'healthy', '{"type": "rabbitmq", "queues": 15}', NOW())
ON CONFLICT (node_id) DO NOTHING;

-- Insert sample topology edges
INSERT INTO topology_edges (id, source_node_id, target_node_id, edge_type, created_at)
VALUES
(uuid_generate_v4()::text, 'node-api-gateway', 'node-auth-service', 'depends_on', NOW()),
(uuid_generate_v4()::text, 'node-api-gateway', 'node-cache-redis', 'depends_on', NOW()),
(uuid_generate_v4()::text, 'node-auth-service', 'node-database-primary', 'depends_on', NOW()),
(uuid_generate_v4()::text, 'node-api-gateway', 'node-message-queue', 'depends_on', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample alert rules
INSERT INTO alert_rules (id, name, description, rule_type, condition, severity, is_active, created_at)
VALUES
(
uuid_generate_v4()::text,
'High CPU Usage',
'Alert when CPU usage exceeds 80%',
'threshold',
'{"metric": "cpu_usage", "operator": ">", "value": 80, "duration": "5m"}',
'high',
true,
NOW()
),
(
uuid_generate_v4()::text,
'Memory Pressure',
'Alert when memory usage exceeds 90%',
'threshold',
'{"metric": "memory_usage", "operator": ">", "value": 90, "duration": "3m"}',
'critical',
true,
NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create materialized view for metrics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_hourly AS
SELECT
date_trunc('hour', timestamp) as hour,
metric_name,
source,
AVG(value) as avg_value,
MAX(value) as max_value,
MIN(value) as min_value,
COUNT(*) as data_points
FROM metrics
GROUP BY date_trunc('hour', timestamp), metric_name, source;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_time ON metrics_hourly(hour);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_metrics_hourly()
RETURNS void AS $$
BEGIN
REFRESH MATERIALIZED VIEW CONCURRENTLY metrics_hourly;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE users IS 'Platform user accounts';
COMMENT ON TABLE metrics IS 'Time-series metrics data from all sources';
COMMENT ON TABLE incidents IS 'Incident tracking and management';
COMMENT ON TABLE agent_activities IS 'AI agent action audit trail';
COMMENT ON TABLE topology_nodes IS 'Infrastructure components in the knowledge graph';
COMMENT ON TABLE topology_edges IS 'Dependencies between infrastructure components';
COMMENT ON TABLE cost_records IS 'Cloud cost tracking data';
COMMENT ON TABLE predictions IS 'ML model predictions and forecasts';
COMMENT ON TABLE remediation_actions IS 'Automated remediation action queue';
