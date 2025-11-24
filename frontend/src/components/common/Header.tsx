import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Status indicator moved to Dashboard */}
        </div>
      </div>
    </div>
  );
};

export default Header;
