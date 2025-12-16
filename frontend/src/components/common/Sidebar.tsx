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
  HelpCircle,
  User,
  ChevronRight,
  Shield
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/topology', icon: Network, label: 'Topology' },
    { path: '/query', icon: MessageSquare, label: 'AI Query' },
    { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
    { path: '/security', icon: Shield, label: 'Security' },
    { path: '/uptime', icon: Activity, label: 'Uptime Monitor' },
    { path: '/cost', icon: DollarSign, label: 'Cost Analytics' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const userEmail = localStorage.getItem('user_email') || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const orgName = localStorage.getItem('org_name') || 'Personal Workspace';

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Activity className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold">ObservAI</h1>
            <p className="text-xs text-gray-400">{orgName}</p>
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

      {/* User Profile Menu */}
      <div className="p-4 border-t border-gray-800 relative">
        {/* User Profile Button */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white w-full"
        >
          <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">{userEmail.split('@')[0]}</p>
            <p className="text-xs text-gray-400 truncate">@{userEmail.split('@')[0]}</p>
          </div>
        </button>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-white">{userInitial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{userEmail.split('@')[0]}</p>
                  <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="py-1">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  // Add personalization handler here
                }}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white w-full text-left"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Personalization</span>
              </button>

              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white w-full text-left"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </Link>

              {/* Help */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  // Add help handler here
                }}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white w-full text-left"
              >
                <div className="flex items-center space-x-3">
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-medium">Help</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="border-t border-gray-700 my-1"></div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-red-600 transition-colors text-gray-300 hover:text-white w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
