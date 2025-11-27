import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CostAnalytics: React.FC = () => {
  const [costSummary, setCostSummary] = useState<any>(null);
  const [wasteData, setWasteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) setUserEmail(email);
    fetchCostData();
  }, []);

  const fetchCostData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch cost summary
      const summaryRes = await fetch(
        `${API_BASE}/api/v1/cost/summary?start_date=2024-01-01T00:00:00Z&end_date=2024-12-31T23:59:59Z&group_by=service`,
        { headers }
      );
      const summary = await summaryRes.json();
      setCostSummary(summary);

      // Fetch waste detection
      const wasteRes = await fetch(`${API_BASE}/api/v1/cost/waste`, { headers });
      const waste = await wasteRes.json();
      setWasteData(waste);
    } catch (error) {
      console.error('Error fetching cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalCost = costSummary?.total_cost || 0;
  const totalWaste = wasteData?.total_waste || 0;
  const savings = ((totalWaste / totalCost) * 100).toFixed(1);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Cost Analytics</h1>
            <p className="text-gray-600 mt-1">Track and optimize cloud spending</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spend</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ₹{totalCost.toLocaleString()}
                  </p>
                </div>
                <IndianRupee className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Waste Detected</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    ₹{totalWaste.toLocaleString()}
                  </p>
                </div>
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Potential Savings</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{savings}%</p>
                </div>
                <TrendingDown className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Trend</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {costSummary?.change_percent || 0}%
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Cost Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Breakdown</h2>
              {costSummary?.breakdown && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        // Group small items into "Other"
                        const sorted = [...costSummary.breakdown].sort((a, b) => b.cost - a.cost);
                        if (sorted.length <= 6) return sorted;

                        const top5 = sorted.slice(0, 5);
                        const others = sorted.slice(5);
                        const otherCost = others.reduce((sum, item) => sum + item.cost, 0);

                        return [...top5, { service: 'Other', cost: otherCost }];
                      })()}
                      dataKey="cost"
                      nameKey="service"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {costSummary.breakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Service Costs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Services by Cost</h2>
              {costSummary?.breakdown && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[...costSummary.breakdown]
                      .sort((a: any, b: any) => b.cost - a.cost)
                      .slice(0, 10) // Show top 10 only
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="service" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="cost" name="Cost" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Waste Opportunities */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Optimization Opportunities</h2>
            </div>
            <div className="p-6">
              {wasteData?.opportunities && wasteData.opportunities.length > 0 ? (
                <div className="space-y-4">
                  {wasteData.opportunities.map((opportunity: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{opportunity.description}</h3>
                          <p className="text-sm text-gray-600 capitalize">Type: {opportunity.type.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ₹{opportunity.savings.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">Potential Savings</p>
                        </div>
                      </div>
                      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Optimize Now
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <IndianRupee className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p>No optimization opportunities found. Your infrastructure is well-optimized!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalytics;
