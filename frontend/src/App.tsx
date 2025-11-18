import React from ‘react’;
import { BrowserRouter as Router, Routes, Route, Navigate } from ‘react-router-dom’;
import Dashboard from ‘./pages/Dashboard’;
import TopologyView from ‘./pages/TopologyView’;
import NLQuery from ‘./pages/NLQuery’;
import Incidents from ‘./pages/Incidents’;
import CostAnalytics from ‘./pages/CostAnalytics’;
import Login from ‘./pages/Login’;
import { useAuth } from ‘./hooks/useAuth’;
import Sidebar from ‘./components/Common/Sidebar’;
import Header from ‘./components/Common/Header’;

const App: React.FC = () => {
const { isAuthenticated, logout } = useAuth();

if (!isAuthenticated) {
return (
<Router>
<Routes>
<Route path=”*” element={<Login />} />
</Routes>
</Router>
);
}

return (
<Router>
<div className="flex h-screen bg-gray-50">
<Sidebar />
<div className="flex-1 flex flex-col overflow-hidden">
<Header onLogout={logout} />
<main className="flex-1 overflow-x-hidden overflow-y-auto">
<Routes>
<Route path=”/” element={<Dashboard />} />
<Route path=”/topology” element={<TopologyView />} />
<Route path=”/query” element={<NLQuery />} />
<Route path=”/incidents” element={<Incidents />} />
<Route path=”/cost” element={<CostAnalytics />} />
<Route path=”*” element={<Navigate to="/" />} />
</Routes>
</main>
</div>
</div>
</Router>
);
};

export default App;
