import React from 'react';
import Layout from '../components/common/Layout';
import { Activity, Globe, Server, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Uptime: React.FC = () => {
    // Mock Data
    const monitors = [
        {
            id: '1',
            name: 'Main Website',
            url: 'https://observai.com',
            type: 'HTTP',
            status: 'UP',
            uptime: '99.99%',
            responseTime: 145,
            lastCheck: 'Just now',
            history: [
                { time: '10:00', value: 140 },
                { time: '10:05', value: 152 },
                { time: '10:10', value: 145 },
                { time: '10:15', value: 138 },
                { time: '10:20', value: 142 },
                { time: '10:25', value: 145 },
            ]
        },
        {
            id: '2',
            name: 'API Gateway',
            url: 'api.observai.com',
            type: 'HTTP',
            status: 'UP',
            uptime: '99.95%',
            responseTime: 85,
            lastCheck: '1 min ago',
            history: [
                { time: '10:00', value: 82 },
                { time: '10:05', value: 88 },
                { time: '10:10', value: 85 },
                { time: '10:15', value: 90 },
                { time: '10:20', value: 84 },
                { time: '10:25', value: 85 },
            ]
        },
        {
            id: '3',
            name: 'Database Primary',
            url: 'db-prod-01:5432',
            type: 'Port',
            status: 'DOWN',
            uptime: '98.50%',
            responseTime: 0,
            lastCheck: '2 mins ago',
            history: [
                { time: '10:00', value: 45 },
                { time: '10:05', value: 48 },
                { time: '10:10', value: 0 },
                { time: '10:15', value: 0 },
                { time: '10:20', value: 0 },
                { time: '10:25', value: 0 },
            ]
        }
    ];

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Uptime Monitor</h1>
                        <p className="text-gray-600">Monitor availability and performance of your services</p>
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus className="w-4 h-4" />
                        <span>Add Monitor</span>
                    </button>
                </div>

                {/* Global Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Overall Uptime</p>
                                <p className="text-2xl font-bold text-green-600">99.82%</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Activity className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Monitors Up</p>
                                <p className="text-2xl font-bold text-gray-900">2</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Monitors Down</p>
                                <p className="text-2xl font-bold text-red-600">1</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Avg Response</p>
                                <p className="text-2xl font-bold text-gray-900">115ms</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monitors List */}
                <div className="space-y-4">
                    {monitors.map((monitor) => (
                        <div key={monitor.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                                {/* Info */}
                                <div className="flex items-start space-x-4 min-w-[200px]">
                                    <div className={`p-3 rounded-lg ${monitor.status === 'UP' ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {monitor.type === 'HTTP' ? (
                                            <Globe className={`w-6 h-6 ${monitor.status === 'UP' ? 'text-green-600' : 'text-red-600'}`} />
                                        ) : (
                                            <Server className={`w-6 h-6 ${monitor.status === 'UP' ? 'text-green-600' : 'text-red-600'}`} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-semibold text-gray-900">{monitor.name}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${monitor.status === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {monitor.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{monitor.url}</p>
                                        <p className="text-xs text-gray-400 mt-1">Last check: {monitor.lastCheck}</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center space-x-8">
                                    <div>
                                        <p className="text-xs text-gray-500">Uptime (24h)</p>
                                        <p className="font-semibold text-gray-900">{monitor.uptime}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Response Time</p>
                                        <p className="font-semibold text-gray-900">{monitor.responseTime}ms</p>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="flex-1 h-16 min-w-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monitor.history}>
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke={monitor.status === 'UP' ? '#22c55e' : '#ef4444'}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Tooltip />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-2">
                                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg">
                                        Edit
                                    </button>
                                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg">
                                        Pause
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default Uptime;
