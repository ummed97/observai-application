import React, { useState, useEffect } from 'react';
import { Layout } from '../components/common/Layout';
import { Building2, Users, Shield, Plus, Settings } from 'lucide-react';

const OrganizationSettings: React.FC = () => {
    const [orgName, setOrgName] = useState('');
    const [orgId, setOrgId] = useState('');
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, we might fetch fresh details from API
        // For now, load from localStorage
        setOrgName(localStorage.getItem('org_name') || 'Unknown Organization');
        setOrgId(localStorage.getItem('org_id') || '');
        setRole(localStorage.getItem('user_role') || 'viewer');
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
                        <p className="text-gray-500 mt-1">Manage your organization profile and members</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <Plus size={18} />
                        Invite Member
                    </button>
                </div>

                {/* Organization Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Organization Profile</h2>
                            <p className="text-sm text-gray-500">General information about your workspace</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                            <input
                                type="text"
                                value={orgName}
                                readOnly
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={orgId}
                                    readOnly
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                            <p className="text-sm text-gray-500">Manage access and roles</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="pb-3 font-medium text-gray-500 text-sm">User</th>
                                    <th className="pb-3 font-medium text-gray-500 text-sm">Role</th>
                                    <th className="pb-3 font-medium text-gray-500 text-sm">Status</th>
                                    <th className="pb-3 font-medium text-gray-500 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr className="group">
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                                                ME
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">You</p>
                                                <p className="text-sm text-gray-500">{localStorage.getItem('user_email')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                            <Shield size={12} />
                                            {role}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                            Active
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button className="text-gray-400 hover:text-gray-600">
                                            <Settings size={16} />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default OrganizationSettings;
