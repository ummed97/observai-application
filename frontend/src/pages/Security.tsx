import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import { Shield, AlertTriangle, CheckCircle, Lock, Server, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SecurityAlert {
    id: string;
    severity: string;
    type: string;
    description: string;
    source: string;
    timestamp: string;
    status: string;
    context: any;
}

interface SecurityStatus {
    status: string;
    active_alerts: number;
    total_alerts: number;
    last_scan: string | null;
    success_rate: number;
    actions_taken: number;
}

const Security: React.FC = () => {
    const [status, setStatus] = useState<SecurityStatus | null>(null);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch security data
    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statusRes, alertsRes] = await Promise.all([
                fetch('http://localhost:8000/api/v1/security/status', { headers }),
                fetch('http://localhost:8000/api/v1/security/alerts', { headers })
            ]);

            const statusData = await statusRes.json();
            const alertsData = await alertsRes.json();

            setStatus(statusData);
            setAlerts(alertsData);
        } catch (error) {
            console.error("Failed to fetch security data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleScan = async () => {
        try {
            await fetch('http://localhost:8000/api/v1/security/scan', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchData();
        } catch (error) {
            console.error("Failed to trigger scan", error);
        }
    };

    // Mock chart data for now as backend doesn't provide history yet
    const chartData = [
        { time: '00:00', threats: 2 },
        { time: '04:00', threats: 1 },
        { time: '08:00', threats: 5 },
        { time: '12:00', threats: 3 },
        { time: '16:00', threats: 8 },
        { time: '20:00', threats: 2 },
        { time: '24:00', threats: 1 },
    ];

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Center</h1>
                        <p className="text-gray-600 dark:text-gray-400">Real-time threat detection and compliance monitoring</p>
                    </div>
                    <div className="flex space-x-3">
                        <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            Generate Report
                        </button>
                        <button
                            onClick={handleScan}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Run Scan
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Security Score</p>
                                <p className="text-2xl font-bold text-green-600">85/100</p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Active Threats</p>
                                <p className="text-2xl font-bold text-red-600">{status?.active_alerts || 0}</p>
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <p className="text-sm text-red-600 mt-2 flex items-center">
                            <Activity className="w-4 h-4 mr-1" /> Real-time
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Alerts</p>
                                <p className="text-2xl font-bold text-orange-600">{status?.total_alerts || 0}</p>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">All time</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Monitored Assets</p>
                                <p className="text-2xl font-bold text-blue-600">142</p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <p className="text-sm text-green-600 mt-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> All systems online
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Threat Timeline */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Threat Activity (24h)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                    <XAxis dataKey="time" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Compliance Status */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compliance Status</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">SOC 2</span>
                                </div>
                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Compliant</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">GDPR</span>
                                </div>
                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Compliant</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">ISO 27001</span>
                                </div>
                                <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Review Needed</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">PCI DSS</span>
                                </div>
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium">Failed</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Alerts */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Security Alerts</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                                                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' :
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                                {alert.severity.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {alert.type}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                                            {alert.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {alert.source}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(alert.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alert.status === 'active' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                                                    alert.status === 'investigating' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                                                        'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium">View</button>
                                        </td>
                                    </tr>
                                ))}
                                {alerts.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                            No active threats detected. System is secure.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Security;
