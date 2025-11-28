import React, { useState, useEffect, useRef } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle, Calendar, LineChart as LineChartIcon, ChevronDown, Check } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type DateRangeType =
  | 'last7' | 'last30'
  | 'thisMonth' | 'lastMonth'
  | 'thisQuarter' | 'lastQuarter'
  | 'thisYear' | 'last3Months' | 'last6Months' | 'last12Months'
  | 'inception' | 'custom';

interface DateRangeOption {
  id: DateRangeType;
  label: string;
  group: 'relative' | 'calendar' | 'custom';
}

const DATE_OPTIONS: DateRangeOption[] = [
  { id: 'last7', label: 'Last 7 days', group: 'relative' },
  { id: 'last30', label: 'Last 30 days', group: 'relative' },
  { id: 'thisMonth', label: 'This month', group: 'calendar' },
  { id: 'thisQuarter', label: 'This quarter', group: 'calendar' },
  { id: 'thisYear', label: 'This year', group: 'calendar' },
  { id: 'lastMonth', label: 'Last month', group: 'calendar' },
  { id: 'lastQuarter', label: 'Last quarter', group: 'calendar' },
  { id: 'last3Months', label: 'Last 3 months', group: 'calendar' },
  { id: 'last6Months', label: 'Last 6 months', group: 'calendar' },
  { id: 'last12Months', label: 'Last 12 months', group: 'calendar' },
  { id: 'inception', label: 'Since Inception', group: 'custom' },
  { id: 'custom', label: 'Custom date range', group: 'custom' },
];

const CostAnalytics: React.FC = () => {
  const [costSummary, setCostSummary] = useState<any>(null);
  const [wasteData, setWasteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [dateRange, setDateRange] = useState<DateRangeType>('last30');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [optimizing, setOptimizing] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Only fetch if not custom, or if custom and both dates are set
    if (dateRange !== 'custom' || (customStart && customEnd)) {
      fetchCostData();
    }
  }, [dateRange, customStart, customEnd]);

  const getDateParams = () => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case 'last7':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30':
        start.setDate(end.getDate() - 30);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
      case 'thisQuarter':
        const currQuarter = Math.floor(start.getMonth() / 3);
        start.setMonth(currQuarter * 3);
        start.setDate(1);
        break;
      case 'lastQuarter':
        const prevQuarter = Math.floor(start.getMonth() / 3) - 1;
        if (prevQuarter < 0) {
          start.setFullYear(start.getFullYear() - 1);
          start.setMonth(9); // Oct
        } else {
          start.setMonth(prevQuarter * 3);
        }
        start.setDate(1);

        // End of last quarter
        end.setTime(start.getTime());
        end.setMonth(end.getMonth() + 3);
        end.setDate(0);
        break;
      case 'thisYear':
        start.setMonth(0, 1);
        break;
      case 'last3Months':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'last6Months':
        start.setMonth(start.getMonth() - 6);
        break;
      case 'last12Months':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'inception':
        start = new Date('2020-01-01');
        break;
      case 'custom':
        if (customStart) start = new Date(customStart);
        if (customEnd) {
          const e = new Date(customEnd);
          e.setHours(23, 59, 59, 999);
          return { start_date: start.toISOString(), end_date: e.toISOString() };
        }
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

  const getLabelForRange = (range: DateRangeType) => {
    return DATE_OPTIONS.find(o => o.id === range)?.label || 'Select Date Range';
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

            {/* Date Range Picker */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{getLabelForRange(dateRange)}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {/* Relative Dates */}
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Relative dates
                    </div>
                    {DATE_OPTIONS.filter(o => o.group === 'relative').map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDateRange(option.id);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between ${dateRange === option.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {option.label}
                        {dateRange === option.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Calendar Months */}
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Calendar months
                    </div>
                    {DATE_OPTIONS.filter(o => o.group === 'calendar').map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDateRange(option.id);
                          setShowDatePicker(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between ${dateRange === option.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {option.label}
                        {dateRange === option.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Custom Range */}
                    {DATE_OPTIONS.filter(o => o.group === 'custom').map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (option.id !== 'custom') {
                            setDateRange(option.id);
                            setShowDatePicker(false);
                          } else {
                            setDateRange('custom');
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between ${dateRange === option.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {option.label}
                        {dateRange === option.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}

                    {/* Custom Date Inputs */}
                    {dateRange === 'custom' && (
                      <div className="p-3 bg-gray-50 rounded-md mt-2 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">End Date</label>
                          <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          disabled={!customStart || !customEnd}
                          className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
