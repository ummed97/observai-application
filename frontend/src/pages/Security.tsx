import React, { useState } from 'react';
import Layout from '../components/common/Layout';
import { Shield, AlertTriangle, CheckCircle, Lock, Server, Globe, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Security: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    // Mock Data
    const securityScore = 85;
    const activeThreats = 2;
    const vulnerabilities = 5;

    const alerts = [
        {
            id: 1,
            severity: 'high',
            type: 'Brute Force',
            description: 'Multiple failed SSH login attempts detected from IP 203.0.113.42',
            source: 'Auth Logs',
            timestamp: '2 mins ago',
            status: 'Active'
        },
        {
            id: 2,
            severity: 'critical',
            type: 'Vulnerability',
            description: 'Critical vulnerability detected in payment-service: Log4Shell',
            source: 'Dependency Scanner',
            timestamp: '1 hour ago',
            status: 'Investigating'
        },
        {
            id: 3,
            severity: 'medium',
            type: 'Suspicious Access',
            description: 'Access to sensitive database from non-production subnet',
            source: 'Network Logs',
            timestamp: '3 hours ago',
            status: 'Resolved'
        }
    ];

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
                        <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
                        <p className="text-gray-600">Real-time threat detection and compliance monitoring</p>
                    </div>
                    <div className="flex space-x-3">
                        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Generate Report
                        </button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Run Scan
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Security Score</p>
                                <p className="text-2xl font-bold text-green-600">{securityScore}/100</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Shield className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${securityScore}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Active Threats</p>
                                <p className="text-2xl font-bold text-red-600">{activeThreats}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                        <p className="text-sm text-red-600 mt-2 flex items-center">
                            <Activity className="w-4 h-4 mr-1" /> +2 from yesterday
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Vulnerabilities</p>
                                <p className="text-2xl font-bold text-orange-600">{vulnerabilities}</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <Lock className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">3 Critical, 2 High</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Monitored Assets</p>
                                <p className="text-2xl font-bold text-blue-600">142</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Server className="w-6 h-6 text-blue-600" />
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
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Activity (24h)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Compliance Status */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700">SOC 2</span>
                                </div>
                                <span className="text-sm text-green-600 font-medium">Compliant</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700">GDPR</span>
                                </div>
                                <span className="text-sm text-green-600 font-medium">Compliant</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700">ISO 27001</span>
                                </div>
                                <span className="text-sm text-yellow-600 font-medium">Review Needed</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="font-medium text-gray-700">PCI DSS</span>
                                </div>
                                <span className="text-sm text-red-600 font-medium">Failed</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Security Alerts</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {alert.severity.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {alert.type}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                                            {alert.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {alert.source}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {alert.timestamp}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alert.status === 'Active' ? 'bg-red-100 text-red-800' :
                                                    alert.status === 'Investigating' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-green-100 text-green-800'}`}>
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button className="text-blue-600 hover:text-blue-900 font-medium">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Security;
