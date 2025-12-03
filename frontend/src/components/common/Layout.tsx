import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 w-64 bg-gray-900">
                        <Sidebar />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header with Menu Button */}
                <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold text-gray-900">ObservAI</span>
                </div>

                {/* Desktop Header (hidden on mobile if we want a different mobile header, or shared) */}
                <div className="hidden md:block">
                    <Header />
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
