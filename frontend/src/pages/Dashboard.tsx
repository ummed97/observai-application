/**

- AI-Agentic Observability Platform - Main Dashboard
- Real-time monitoring with AI agent insights
  */
import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Cpu, Database, Network, DollarSign } from 'lucide-react';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

interface SystemMetric {
  timestamp: string;
  cpu: number;
  memory: number;
  network: number;
  latency: number;
}

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  root_cause?: string;
  affected_services: string[];
}

interface AgentStatus {
  agent_id: string;
  agent_type: string;
  status: string;
  last_action?: string;
  success_rate: number;
  actions_taken: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [systemHealth, setSystemHealth] = useState<number>(100);
  const [wsConnected, setWsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) setUserEmail(email);
  }, []);

  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();

    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${API_BASE.replace('http', 'ws')}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    // Poll for updates every 30 seconds as backup
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch incidents
      const incidentsRes = await fetch(`${API_BASE}/api/v1/incidents?limit=10`, { headers });
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
      } else {
        console.error('Failed to fetch incidents:', incidentsRes.status);
        setIncidents([]);
      }

      // Fetch agent statuses
      const agentsRes = await fetch(`${API_BASE}/api/v1/agents`, { headers });
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(Array.isArray(agentsData) ? agentsData : []);
      } else {
        console.error('Failed to fetch agents:', agentsRes.status);
        setAgents([]);
      }

      // Calculate system health
      const health = calculateSystemHealth(incidents, agents);
      setSystemHealth(health);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'metric_update':
        setMetrics(prev => [...prev.slice(-19), data.metric]);
        break;
      case 'incident_update':
        setIncidents(prev => {
          const filtered = prev.filter(i => i.id !== data.incident.id);
          return [data.incident, ...filtered].slice(0, 10);
        });
        break;
      case 'agent_update':
        setAgents(prev =>
          prev.map(a => a.agent_id === data.agent.agent_id ? data.agent : a)
        );
        break;
    }
  };

  const calculateSystemHealth = (incidents: Incident[], agents: AgentStatus[]): number => {
    const criticalIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
    const highIncidents = incidents.filter(i => i.severity === 'high' && i.status !== 'resolved').length;

    const avgAgentSuccess = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.success_rate, 0) / agents.length
      : 100;

    let health = 100;
    health -= criticalIncidents * 20;
    health -= highIncidents * 10;
    health = (health + avgAgentSuccess) / 2;

    return Math.max(0, Math.min(100, health));
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-blue-600 bg-blue-100'
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    if (health >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const criticalCount = activeIncidents.filter(i => i.severity === 'critical').length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={userEmail} />
        <div className="flex-1 overflow-auto p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI-Agentic Observability Platform</h1>
                <p className="text-gray-600 mt-1">Unified monitoring with autonomous AI agents</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-600' : 'bg-red-600'} animate-pulse`}></div>
                  <span className="text-sm">{wsConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Health</p>
                  <p className={`text-3xl font-bold ${getHealthColor(systemHealth)} mt-2`}>
                    {systemHealth.toFixed(0)}%
                  </p>
                </div>
                <Activity className={`w-12 h-12 ${getHealthColor(systemHealth)}`} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Incidents</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{activeIncidents.length}</p>
                  {criticalCount > 0 && (
                    <p className="text-xs text-red-600 mt-1">{criticalCount} critical</p>
                  )}
                </div>
                <AlertTriangle className="w-12 h-12 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Agents Active</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {agents.filter(a => a.status === 'active').length}/{agents.length}
                  </p>
                </div>
                <Cpu className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Success Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {agents.length > 0
                      ? (agents.reduce((sum, a) => sum + a.success_rate, 0) / agents.length).toFixed(0)
                      : 0}%
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Incidents */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Incidents</h2>
              </div>
              <div className="p-6">
                {incidents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <p>No incidents detected. All systems operational!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidents.map(incident => (
                      <div key={incident.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(incident.severity)}`}>
                                {incident.severity.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(incident.created_at).toLocaleString()}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{incident.title}</h3>
                            {incident.root_cause && (
                              <p className="text-sm text-gray-600 mb-2">
                                <strong>Root Cause:</strong> {incident.root_cause}
                              </p>
                            )}
                            {incident.affected_services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {incident.affected_services.map((service, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                    {service}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                            {incident.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Agents Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">AI Agents</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {agents.map(agent => (
                    <div key={agent.agent_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {agent.agent_type} Agent
                        </h3>
                        <span className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span className="font-medium">{agent.success_rate.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Actions Taken:</span>
                          <span className="font-medium">{agent.actions_taken}</span>
                        </div>
                        {agent.last_action && (
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            Last: {agent.last_action}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Metrics Chart */}
          {metrics.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-time System Metrics</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" />
                  <Line type="monotone" dataKey="latency" stroke="#f59e0b" name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
