import React from 'react';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  userEmail?: string;
}

export const Header: React.FC<HeaderProps> = ({ userEmail }) => {
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    window.location.href = '/login';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Connected</span>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>

        {userEmail && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <User className="w-4 h-4" />
              <span>{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
