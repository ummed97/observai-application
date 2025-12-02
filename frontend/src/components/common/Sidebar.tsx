import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Activity,
  LogOut,
  Settings,
  History
} from 'lucide-react';
import ChatHistoryModal from '../chat/ChatHistoryModal';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/topology', icon: Network, label: 'Topology' },
    { path: '/query', icon: MessageSquare, label: 'AI Query' },
    { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
    { path: '/cost', icon: DollarSign, label: 'Cost Analytics' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Activity className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold">ObservAI</h1>
            <p className="text-xs text-gray-400">Platform v1.0</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile & Settings */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-3 px-4 py-3 mb-2 text-gray-300">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">
              {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white break-all" title={localStorage.getItem('user_email') || 'User'}>
              {localStorage.getItem('user_email') || 'User'}
            </p>
          </div>
        </div>

        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white w-full"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
              <button
                onClick={() => {
                  setShowChatHistory(true);
                  setShowSettings(false);
                }}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white w-full"
              >
                <History className="w-5 h-5" />
                <span className="font-medium">Chat History</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-red-600 transition-colors text-gray-300 hover:text-white w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat History Modal */}
      <ChatHistoryModal
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
      />
    </div>
  );
};

export default Sidebar;

