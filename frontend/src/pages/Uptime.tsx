import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import { Activity, Globe, Server, CheckCircle, XCircle, Clock, Plus, X, Trash2 } from 'lucide-react';

interface Monitor {
    id: string;
    name: string;
    url: string;
    monitor_type: 'http' | 'ping' | 'port';
    interval_seconds: number;
    is_active: boolean;
    last_status?: 'up' | 'down';
    last_checked?: string;
    response_time?: number;
}

const Uptime: React.FC = () => {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMonitor, setNewMonitor] = useState({
        name: '',
        url: '',
        monitor_type: 'http',
        interval_seconds: 600
    });

    // Fetch monitors
    const fetchMonitors = async () => {
        try {
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8000'
                : `http://${window.location.hostname}:8000`;
            const response = await fetch(`${apiUrl}/api/v1/monitors`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setMonitors(data);
            }
        } catch (error) {
            console.error('Failed to fetch monitors:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitors();
        // Refresh every 30 seconds
        const interval = setInterval(fetchMonitors, 30000);
        return () => clearInterval(interval);
    }, []);

    // Add monitor
    const handleAddMonitor = async () => {
        try {
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8000'
                : `http://${window.location.hostname}:8000`;
            const response = await fetch(`${apiUrl}/api/v1/monitors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newMonitor)
            });

            if (response.ok) {
                setShowAddModal(false);
                setNewMonitor({ name: '', url: '', monitor_type: 'http', interval_seconds: 600 });
                fetchMonitors();
            }
        } catch (error) {
            console.error('Failed to add monitor:', error);
        }
    };

    // Delete monitor
    const handleDeleteMonitor = async (id: string) => {
        if (!confirm('Are you sure you want to delete this monitor?')) return;

        try {
            const apiUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8000'
                : `http://${window.location.hostname}:8000`;
            const response = await fetch(`${apiUrl}/api/v1/monitors/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                fetchMonitors();
            }
        } catch (error) {
            console.error('Failed to delete monitor:', error);
        }
    };

    const getStatusColor = (status?: string) => {
        if (!status) return 'text-gray-400';
        return status === 'up' ? 'text-green-400' : 'text-red-400';
    };

    const getStatusIcon = (status?: string) => {
        if (!status) return <Clock className="w-5 h-5 text-gray-400" />;
        return status === 'up'
            ? <CheckCircle className="w-5 h-5 text-green-400" />
            : <XCircle className="w-5 h-5 text-red-400" />;
    };

    return (
        <Layout>
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Uptime Monitoring</h1>
                        <p className="text-white">Monitor your websites and APIs</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Monitor
                    </button>
                </div>

                {/* Monitors Grid */}
                {loading ? (
                    <div className="text-center text-white py-12">Loading monitors...</div>
                ) : monitors.length === 0 ? (
                    <div className="text-center text-white py-12">
                        <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl mb-2">No monitors configured</p>
                        <p className="text-sm">Click "Add Monitor" to start monitoring your services</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {monitors.map((monitor) => (
                            <div
                                key={monitor.id}
                                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(monitor.last_status)}
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{monitor.name}</h3>
                                            <p className="text-sm text-gray-400">{monitor.monitor_type.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteMonitor(monitor.id)}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">URL:</span>
                                        <span className="text-white truncate ml-2 max-w-[200px]" title={monitor.url}>
                                            {monitor.url}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Status:</span>
                                        <span className={getStatusColor(monitor.last_status)}>
                                            {monitor.last_status?.toUpperCase() || 'PENDING'}
                                        </span>
                                    </div>
                                    {monitor.response_time && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Response Time:</span>
                                            <span className="text-white">{monitor.response_time.toFixed(0)}ms</span>
                                        </div>
                                    )}
                                    {monitor.last_checked && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Last Check:</span>
                                            <span className="text-white">
                                                {new Date(monitor.last_checked).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Check Interval:</span>
                                        <span className="text-white">{monitor.interval_seconds / 60} min</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Monitor Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Add Monitor</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Monitor Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newMonitor.name}
                                        onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="My Website"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        URL
                                    </label>
                                    <input
                                        type="text"
                                        value={newMonitor.url}
                                        onChange={(e) => setNewMonitor({ ...newMonitor, url: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Monitor Type
                                    </label>
                                    <select
                                        value={newMonitor.monitor_type}
                                        onChange={(e) => setNewMonitor({ ...newMonitor, monitor_type: e.target.value as any })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="http">HTTP/HTTPS</option>
                                        <option value="ping">Ping</option>
                                        <option value="port">Port</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Check Interval (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={newMonitor.interval_seconds / 60}
                                        onChange={(e) => setNewMonitor({
                                            ...newMonitor,
                                            interval_seconds: parseInt(e.target.value) * 60
                                        })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        min="1"
                                    />
                                </div>

                                <button
                                    onClick={handleAddMonitor}
                                    disabled={!newMonitor.name || !newMonitor.url}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Add Monitor
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Uptime;
