/**
 * Natural Language Query Interface
 * ChatOps-style interface for querying observability data
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, AlertCircle, BarChart3, TrendingUp, Trash2, History, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/common/Layout';

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
  session_id?: string;
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
  const [sessionId, setSessionId] = useState<string>(Math.random().toString(36).substring(7));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery();
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
        body: JSON.stringify({
          query: input,
          session_id: sessionId
        })
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

  // Group history by session_id
  const sessions = React.useMemo(() => {
    const groups: { [key: string]: ChatHistoryItem[] } = {};
    chatHistory.forEach(item => {
      const sessionId = item.session_id || 'legacy'; // Handle items without session_id
      if (!groups[sessionId]) {
        groups[sessionId] = [];
      }
      groups[sessionId].push(item);
    });

    // Sort sessions by most recent message timestamp
    return Object.entries(groups).sort(([, aItems], [, bItems]) => {
      const aLatest = Math.max(...aItems.map(i => new Date(i.timestamp).getTime()));
      const bLatest = Math.max(...bItems.map(i => new Date(i.timestamp).getTime()));
      return bLatest - aLatest;
    });
  }, [chatHistory]);

  const formatTime = (dateString: string) => {
    // Ensure we treat the timestamp as UTC by appending 'Z' if missing
    const date = new Date(dateString.endsWith('Z') ? dateString : `${dateString}Z`);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', // Explicitly set IST as requested
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${showHistory ? 'sm:mr-80' : 'mr-0'}`}>
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 p-4">
            <div className="flex items-center justify-between px-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Natural Language Query</h1>
                <p className="text-gray-600 text-sm mt-1 hidden sm:block">Ask questions about your infrastructure in plain English</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setMessages([{
                      id: '1',
                      type: 'assistant',
                      content: 'Hello! I\'m your AI observability assistant. Ask me anything about your infrastructure, incidents, metrics, or predictions.',
                      timestamp: new Date()
                    }]);
                    const newSessionId = Math.random().toString(36).substring(7);
                    setSessionId(newSessionId);
                    setShowHistory(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium whitespace-nowrap">New Chat</span>
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <History className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-6 px-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-lg p-4 ${msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 shadow-sm'
                      }`}
                  >
                    <div className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</div>
                    {msg.visualizations && (
                      <div className="mt-4 bg-gray-50 rounded p-2 sm:p-4 overflow-x-auto">
                        {renderVisualization(msg.visualizations)}
                      </div>
                    )}
                    <div
                      className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                        }`}
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-gray-500 text-sm">Processing query...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="w-full px-4">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <div className="mt-4 hidden sm:block">
                <p className="text-sm text-gray-500 mb-3">Try asking:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "Why did API latency increase in the last hour?",
                    "Show me services with high CPU usage",
                    "What incidents occurred this week?",
                    "Predict storage capacity for next 7 days",
                    "Which services are consuming most cost?",
                    "Show dependencies for payment-service"
                  ].map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(query)}
                      className="text-left px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar - Fixed on desktop, overlay on mobile */}
        {showHistory && (
          <div className="fixed sm:absolute inset-y-0 right-0 w-full sm:w-80 bg-white shadow-xl border-l border-gray-200 z-20 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="font-semibold text-gray-900">Chat History</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={clearChatHistory}
                  className="text-red-600 hover:text-red-700 text-sm flex items-center space-x-1 px-2 py-1 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sessions.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No chat history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(([sessId, items]) => {
                    // Sort items in this session by timestamp ASC for display in chat
                    const sortedItems = [...items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    // Use the first query as the session title
                    const firstQuery = sortedItems[0]?.query || 'New Chat';
                    const lastActive = sortedItems[sortedItems.length - 1]?.timestamp;

                    return (
                      <button
                        key={sessId}
                        onClick={() => {
                          // Reconstruct the full conversation for this session
                          const sessionMessages: Message[] = [];
                          // Add initial greeting if desired, or just start with history
                          // sessionMessages.push(initialGreeting); 

                          sortedItems.forEach(item => {
                            sessionMessages.push({
                              id: `query-${item.id}`,
                              type: 'user',
                              content: item.query,
                              timestamp: new Date(item.timestamp.endsWith('Z') ? item.timestamp : `${item.timestamp}Z`)
                            });
                            sessionMessages.push({
                              id: `response-${item.id}`,
                              type: 'assistant',
                              content: item.response,
                              timestamp: new Date(item.timestamp.endsWith('Z') ? item.timestamp : `${item.timestamp}Z`)
                            });
                          });

                          setMessages(sessionMessages);
                          setSessionId(sessId);
                          // On mobile, close sidebar after selection
                          if (window.innerWidth < 640) {
                            setShowHistory(false);
                          }
                        }}
                        className={`w-full text-left rounded-lg p-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${sessionId === sessId
                          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                          }`}
                      >
                        <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{firstQuery}</p>
                        <p className="text-xs text-gray-500">
                          {formatTime(lastActive)}
                        </p>
                        <div className="mt-1 flex items-center space-x-1">
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {items.length} prompts
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

