/**
 * Natural Language Query Interface
 * ChatOps-style interface for querying observability data
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, AlertCircle, BarChart3, TrendingUp, Trash2, History } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  visualizations?: any;
  sources?: string[];
  confidence?: number;
}

interface ChatHistoryItem {
  id: string;
  query: string;
  response: string;
  timestamp: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const EXAMPLE_QUERIES = [
  "Why did API latency increase in the last hour?",
  "Show me services with high CPU usage",
  "What incidents occurred this week?",
  "Predict storage capacity for next 7 days",
  "Which services are consuming most cost?",
  "Show dependencies for payment-service"
];

export const NLQuery: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI observability assistant. Ask me anything about your infrastructure, incidents, metrics, or predictions.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) setUserEmail(email);
    scrollToBottom();
    fetchChatHistory();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/v1/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const clearChatHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/v1/chat/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendQuery = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: input })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        visualizations: data.visualizations,
        sources: data.sources,
        confidence: data.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (query: string) => {
    setInput(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const renderVisualization = (viz: any) => {
    if (!viz) return null;

    switch (viz.type) {
      case 'line_chart':
        return (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={viz.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                {viz.lines.map((line: any, idx: number) => (
                  <Line
                    key={idx}
                    type="monotone"
                    dataKey={line.key}
                    stroke={line.color}
                    name={line.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'bar_chart':
        return (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={viz.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'table':
        return (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {viz.columns.map((col: string, idx: number) => (
                    <th
                      key={idx}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viz.rows.map((row: any[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Natural Language Query</h1>
                  <p className="text-gray-600 text-sm mt-1">Ask questions about your infrastructure in plain English</p>
                </div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <History className="w-5 h-5" />
                  <span className="text-sm font-medium">History</span>
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 ${message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white shadow border border-gray-200'
                        }`}
                    >
                      <div className={`prose ${message.type === 'user' ? 'prose-invert' : ''} max-w-none`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.visualizations && renderVisualization(message.visualizations)}


                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 font-medium mb-1">Sources:</p>
                          <div className="space-y-1">
                            {message.sources.map((source, idx) => (
                              <p key={idx} className="text-xs text-gray-500">• {source}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={`mt-2 text-xs ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}


                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white shadow border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Analyzing your query...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Example Queries */}
            {messages.length === 1 && (
              <div className="p-4 bg-gray-100 border-t border-gray-200">
                <div className="max-w-4xl mx-auto">
                  <p className="text-sm text-gray-600 mb-3">Try asking:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {EXAMPLE_QUERIES.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(query)}
                        className="text-left text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-3 transition-colors"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask a question..."
                      className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={1}
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={sendQuery}
                      disabled={!input.trim() || loading}
                      className="absolute right-2 bottom-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat History Sidebar */}
          {showHistory && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
                <button
                  onClick={clearChatHistory}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No chat history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMessages([
                            {
                              id: `query-${item.id}`,
                              type: 'user',
                              content: item.query,
                              timestamp: new Date(item.timestamp)
                            },
                            {
                              id: `response-${item.id}`,
                              type: 'assistant',
                              content: item.response,
                              timestamp: new Date(item.timestamp)
                            }
                          ]);
                          // On mobile/small screens, we might want to close the sidebar
                          // setShowHistory(false); 
                        }}
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{item.query}</p>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.response}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
