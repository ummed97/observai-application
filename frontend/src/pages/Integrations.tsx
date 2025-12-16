import React, { useState, useEffect } from 'react';
import { Layout } from '../components/common/Layout';
import { Cloud, Plus, RefreshCw, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Connector {
    id: string;
    name: string;
    provider: string;
    is_active: boolean;
    last_sync_status: string | null;
    last_sync_time: string | null;
    created_at: string;
}

const Integrations: React.FC = () => {
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    // Form State
    const [newConnector, setNewConnector] = useState({
        name: '',
        provider: 'azure',
        client_id: '',
        client_secret: '',
        tenant_id: ''
    });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('auth_token');

    const fetchConnectors = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/v1/connectors/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setConnectors(data);
            }
        } catch (error) {
            console.error('Failed to fetch connectors:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnectors();
    }, []);

    const handleAddConnector = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);

        try {
            const response = await fetch(`${API_BASE}/api/v1/connectors/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newConnector)
            });

            if (response.ok) {
                setShowAddModal(false);
                setNewConnector({ name: '', provider: 'azure', client_id: '', client_secret: '', tenant_id: '' });
                fetchConnectors();
            } else {
                const data = await response.json();
                setFormError(data.detail || 'Failed to add connector');
            }
        } catch (error) {
            setFormError('Network error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this connector?')) return;

        try {
            await fetch(`${API_BASE}/api/v1/connectors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchConnectors();
        } catch (error) {
            console.error('Failed to delete connector:', error);
        }
    };

    const handleSync = async (id: string) => {
        setSyncingId(id);
        try {
            await fetch(`${API_BASE}/api/v1/connectors/${id}/sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Poll for status update after a few seconds
            setTimeout(fetchConnectors, 2000);
        } catch (error) {
            console.error('Failed to trigger sync:', error);
        } finally {
            setTimeout(() => setSyncingId(null), 1000);
        }
    };

    return (
        <Layout>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                        <p className="text-gray-500 mt-1">Manage your cloud provider connections</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Connection
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : connectors.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-xl border border-gray-200 border-dashed">
                        <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Integrations Configured</h3>
                        <p className="text-gray-500 mt-2 mb-6">Connect your Azure environment to start ingesting data.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Connect Azure
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {connectors.map((connector) => (
                            <div key={connector.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Cloud className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{connector.name}</h3>
                                            <p className="text-xs text-gray-500 uppercase">{connector.provider}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${connector.last_sync_status === 'success' ? 'bg-green-50 text-green-700' :
                                            connector.last_sync_status === 'failed' ? 'bg-red-50 text-red-700' :
                                                connector.last_sync_status === 'syncing' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                        }`}>
                                        {connector.last_sync_status || 'Pending'}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Status</span>
                                        <span className="text-gray-900 font-medium">{connector.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Last Sync</span>
                                        <span className="text-gray-900">
                                            {connector.last_sync_time ? new Date(connector.last_sync_time).toLocaleString() : 'Never'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => handleSync(connector.id)}
                                        disabled={syncingId === connector.id}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} className={syncingId === connector.id ? 'animate-spin' : ''} />
                                        Sync Now
                                    </button>
                                    <button
                                        onClick={() => handleDelete(connector.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Connector Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Add Integration</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddConnector} className="space-y-4">
                                {formError && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                        {formError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newConnector.name}
                                        onChange={(e) => setNewConnector({ ...newConnector, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Production Azure"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                    <select
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                    >
                                        <option value="azure">Azure</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={newConnector.client_id}
                                        onChange={(e) => setNewConnector({ ...newConnector, client_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        placeholder="Azure Service Principal Client ID"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                                    <input
                                        type="password"
                                        required
                                        value={newConnector.client_secret}
                                        onChange={(e) => setNewConnector({ ...newConnector, client_secret: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        placeholder="Azure Service Principal Secret"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={newConnector.tenant_id}
                                        onChange={(e) => setNewConnector({ ...newConnector, tenant_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        placeholder="Azure Tenant ID"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {submitting && <Loader2 size={16} className="animate-spin" />}
                                        {submitting ? 'Verifying...' : 'Connect'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Integrations;
