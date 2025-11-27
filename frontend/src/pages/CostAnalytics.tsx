import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle, Calendar, LineChart as LineChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type DateRange = 'last30' | 'currentMonth' | 'inception';

const CostAnalytics: React.FC = () => {
  const [costSummary, setCostSummary] = useState<any>(null);
  const [wasteData, setWasteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [optimizing, setOptimizing] = useState<string | null>(null);

  useEffect(() => {
    fetchCostData();
  }, [dateRange]);

  const getDateParams = () => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case 'last30':
        start.setDate(end.getDate() - 30);
        break;
      case 'currentMonth':
        start.setDate(1); // First day of current month
        break;
      case 'inception':
        start = new Date('2020-01-01'); // Arbitrary start date for inception
        break;
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    };
  };

  const fetchCostData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const { start_date, end_date } = getDateParams();

      // Fetch cost summary
      const summaryRes = await fetch(
        `${API_BASE}/api/v1/cost/summary?start_date=${start_date}&end_date=${end_date}&group_by=service`,
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

  const handleOptimize = async (type: string) => {
    setOptimizing(type);
    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert(`Optimization for ${type} initiated successfully!`);
    setOptimizing(null);
  };

  if (loading && !costSummary) {
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
  const savings = totalCost > 0 ? ((totalWaste / totalCost) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cost Analytics</h1>
              <p className="text-gray-600 mt-1">Track and optimize cloud spending</p>
            </div>

            <div className="flex bg-white rounded-lg shadow p-1">
              <button
                onClick={() => setDateRange('last30')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === 'last30' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('currentMonth')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === 'currentMonth' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setDateRange('inception')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === 'inception' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Since Inception
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spend</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ₹{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                    ₹{totalWaste.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                  <p className={`text-3xl font-bold mt-2 ${(costSummary?.change_percent || 0) > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                    {costSummary?.change_percent > 0 ? '+' : ''}{costSummary?.change_percent || 0}%
                  </p>
                </div>
                <TrendingUp className={`w-12 h-12 ${(costSummary?.change_percent || 0) > 0 ? 'text-orange-500' : 'text-green-500'
                  }`} />
              </div>
            </div>
          </div>

          {/* Charts Row 1: Trend & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Cost Trend */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-blue-500" />
                Cost Trend
              </h2>
              {costSummary?.history && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costSummary.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Breakdown</h2>
              {costSummary?.breakdown && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const sorted = [...costSummary.breakdown].sort((a: any, b: any) => b.cost - a.cost);
                        if (sorted.length <= 6) return sorted;
                        const top5 = sorted.slice(0, 5);
                        const others = sorted.slice(5);
                        const otherCost = others.reduce((sum: number, item: any) => sum + item.cost, 0);
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
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Charts Row 2: Top Services */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Services by Cost</h2>
            {costSummary?.breakdown && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[...costSummary.breakdown]
                    .sort((a: any, b: any) => b.cost - a.cost)
                    .slice(0, 10)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="service" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="cost" name="Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                            ₹{opportunity.savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-sm text-gray-600">Potential Savings</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOptimize(opportunity.type)}
                        disabled={optimizing === opportunity.type}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {optimizing === opportunity.type ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Optimizing...
                          </>
                        ) : (
                          'Optimize Now'
                        )}
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
