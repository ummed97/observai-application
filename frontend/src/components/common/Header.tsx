import React from ‘react’;
import { Bell, Settings, LogOut, User } from ‘lucide-react’;

interface HeaderProps {
onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
const userEmail = localStorage.getItem(‘user_email’) || ‘user@example.com’;

return (
<header className="bg-white shadow-sm border-b border-gray-200">
<div className="flex items-center justify-between px-6 py-4">
{/* Search / Breadcrumb */}
<div className="flex-1">
<div className="text-sm text-gray-600">
Welcome back! Monitor your infrastructure in real-time.
</div>
</div>

```
    {/* Actions */}
    <div className="flex items-center space-x-4">
      {/* Notifications */}
      <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      {/* Settings */}
      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <Settings className="w-5 h-5" />
      </button>

      {/* User Menu */}
      <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">Admin User</div>
          <div className="text-xs text-gray-500">{userEmail}</div>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          <User className="w-5 h-5" />
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</header>
```

);
};

export default Header;
