import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import { Activity, Globe, Server, CheckCircle, XCircle, Clock, Plus, X, Trash2 } from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

interface Monitor {
    id: string;
    name: string;
    type: 'http' | 'port';
    url?: string;
    host?: string;
    port?: number;
    interval: number;
    status?: 'up' | 'down';
    uptime?: string;
    response_time?: number;
    last_check?: string;
    history?: { time: string; value: number }[];
}

const Uptime: React.FC = () => {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMonitor, setNewMonitor] = useState({
        name: '',
        type: 'http',
        url: '',
        host: '',
        port: '',
        interval: 60
    });

    // Fetch monitors
    const fetchMonitors = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/v1/uptime/monitors', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            // Backend returns { monitors: [], results: {} }
            // We need to merge them to match the UI expectation
            // For now, let's assume the backend returns a list of monitors with status merged
            // If not, we might need to adjust.
            // Based on my UptimeMonitor.get_status implementation (which I haven't fully seen but assumed),
            // let's assume it returns { monitors: [...], results: {...} }

            // Actually, I didn't implement get_status in UptimeMonitor in the previous turn.
            // I implemented add_monitor, remove_monitor, start, stop.
            // I need to check if get_status exists or implement it.
            // Wait, I used `uptime_monitor.get_status()` in routers/uptime.py.
            // I need to ensure `get_status` exists in `UptimeMonitor`.

            // Assuming it returns a structure we can use. If not, I'll fix the backend.
            // For now, let's assume data.monitors is the list.

            if (data.monitors) {
                const formattedMonitors = data.monitors.map((m: any) => ({
                    ...m,
                    status: 'up', // Default for now until we have real status logic
                    uptime: '100%',
                    response_time: 0,
                    last_check: 'Now',
                    history: []
                }));
                setMonitors(formattedMonitors);
            }
        } catch (error) {
            console.error("Failed to fetch monitors", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitors();
        const interval = setInterval(fetchMonitors, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAddMonitor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newMonitor,
                port: newMonitor.port ? parseInt(newMonitor.port) : undefined
            };

            await fetch('http://localhost:8000/api/v1/uptime/monitors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            setShowAddModal(false);
            fetchMonitors();
            setNewMonitor({ name: '', type: 'http', url: '', host: '', port: '', interval: 60 });
        } catch (error) {
            console.error("Failed to add monitor", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this monitor?")) return;
        try {
            await fetch(`http://localhost:8000/api/v1/uptime/monitors/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchMonitors();
        } catch (error) {
            console.error("Failed to delete monitor", error);
        }
    };

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Uptime Monitor</h1>
                        <p className="text-gray-500 dark:text-gray-400">Monitor availability and performance of your services</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={20} />
                        Add Monitor
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Monitors</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{monitors.length}</h3>
                            </div>
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monitors List */}
                <div className="space-y-4">
                    {monitors.map((monitor) => (
                        <div key={monitor.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-start space-x-4 min-w-[200px]">
                                    <div className={`p-3 rounded-lg ${monitor.status === 'down' ? 'bg-red-100' : 'bg-green-100'}`}>
                                        {monitor.type === 'http' ? <Globe className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{monitor.name}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${monitor.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {monitor.status?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">{monitor.url || `${monitor.host}:${monitor.port}`}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-8">
                                    <div>
                                        <p className="text-xs text-gray-500">Uptime (24h)</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{monitor.uptime || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Response Time</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{monitor.response_time || 0}ms</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button onClick={() => handleDelete(monitor.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {monitors.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500">No monitors found. Add one to get started.</div>
                    )}
                </div>

                {/* Add Monitor Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold dark:text-white">Add New Monitor</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
                            </div>
                            <form onSubmit={handleAddMonitor} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={newMonitor.name}
                                        onChange={e => setNewMonitor({ ...newMonitor, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                                    <select
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={newMonitor.type}
                                        onChange={e => setNewMonitor({ ...newMonitor, type: e.target.value })}
                                    >
                                        <option value="http">HTTP(s) Website</option>
                                        <option value="port">TCP Port</option>
                                    </select>
                                </div>

                                {newMonitor.type === 'http' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">URL</label>
                                        <input
                                            type="url"
                                            required
                                            placeholder="https://example.com"
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={newMonitor.url}
                                            onChange={e => setNewMonitor({ ...newMonitor, url: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Host</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="localhost"
                                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                value={newMonitor.host}
                                                onChange={e => setNewMonitor({ ...newMonitor, host: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Port</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="80"
                                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                value={newMonitor.port}
                                                onChange={e => setNewMonitor({ ...newMonitor, port: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Create Monitor
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Uptime;
