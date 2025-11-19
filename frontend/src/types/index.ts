// Type definitions for the platform

export interface User {
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    is_superuser: boolean;
}

export interface Metric {
    id: string;
    timestamp: string;
    source: string;
    metric_name: string;
    value: number;
    labels: Record<string, string>;
}

export interface Incident {
    id: string;
    title: string;
    description?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    root_cause?: string;
    affected_services: string[];
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    anomaly_data?: any;
    agent_analysis?: any;
    predicted_impact?: any;
    remediation_steps?: string[];
    remediation_executed?: boolean;
    remediation_result?: any;
}

export interface AgentStatus {
    agent_id: string;
    agent_type: string;
    status: string;
    last_action?: string;
    success_rate: number;
    actions_taken: number;
}

export interface TopologyNode {
    node_id: string;
    name: string;
    type: string;
    status: string;
    metadata: Record<string, any>;
    dependencies: string[];
}

export interface TopologyEdge {
    source: string;
    target: string;
    type: string;
}

export interface TopologyGraph {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
}

export interface NLQueryRequest {
    query: string;
    context?: Record<string, any>;
}

export interface NLQueryResponse {
    query: string;
    answer: string;
    sources: string[];
    confidence: number;
    visualizations?: any;
}

export interface CostSummary {
    total_cost: number;
    breakdown: Array<{
        service: string;
        cost: number;
    }>;
    trend: string;
    change_percent: number;
}

export interface CostWaste {
    total_waste: number;
    opportunities: Array<{
        type: string;
        description: string;
        savings: number;
    }>;
}

export interface Prediction {
    id: string;
    prediction_type: string;
    target: string;
    timestamp: string;
    prediction_time: string;
    predicted_value?: number;
    confidence: number;
    actual_value?: number;
    metadata?: any;
}

export interface RemediationAction {
    id: string;
    incident_id: string;
    action_type: string;
    target: string;
    parameters: any;
    status: string;
    approval_required: boolean;
    approved_by?: string;
    approved_at?: string;
    executed_at?: string;
    result?: any;
    estimated_impact: string;
    created_at: string;
}

export interface WebSocketMessage {
    type: 'metric_update' | 'incident_update' | 'agent_update' | 'topology_update';
    data: any;
    timestamp: string;
}
