import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import Layout from '../components/common/Layout';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  root_cause?: string;
  affected_services: string[];
  remediation_steps?: string[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) setUserEmail(email);
    fetchIncidents();
  }, [filter]);

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const url = filter === 'all'
        ? `${API_BASE}/api/v1/incidents`
        : `${API_BASE}/api/v1/incidents?status=${filter}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setIncidents(data);
        } else {
          setIncidents([]);
          console.error('Received non-array data for incidents:', data);
        }
      } else {
        console.error('Failed to fetch incidents:', response.statusText);
        setIncidents([]);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[severity as keyof typeof colors];
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'resolved': <CheckCircle className="w-5 h-5 text-green-600" />,
      'investigating': <Clock className="w-5 h-5 text-yellow-600" />,
      'open': <AlertTriangle className="w-5 h-5 text-red-600" />,
      'closed': <XCircle className="w-5 h-5 text-gray-600" />
    };
    return icons[status as keyof typeof icons] || icons.open;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (

    <Layout>
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Incidents</h1>
          <p className="text-gray-600 mt-1">Track and manage infrastructure incidents</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-2">
          {['all', 'open', 'investigating', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Incidents List */}
        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Incidents</h3>
              <p className="text-gray-600">All systems are operating normally!</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div key={incident.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(incident.status)}
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(incident.severity)}`}>
                          {incident.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(incident.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">{incident.title}</h3>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </div>
                  </div>

                  {/* Root Cause */}
                  {incident.root_cause && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-1">Root Cause</h4>
                      <p className="text-sm text-blue-800">{incident.root_cause}</p>
                    </div>
                  )}

                  {/* Affected Services */}
                  {incident.affected_services.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Affected Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {incident.affected_services.map((service, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remediation Steps */}
                  {incident.remediation_steps && incident.remediation_steps.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Remediation Steps</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        {incident.remediation_steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );

};

export default Incidents;
