import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import { TopologyView } from './pages/TopologyView'
import { NLQuery } from './pages/NLQuery'
import Incidents from './pages/Incidents'
import Security from './pages/Security'
import Uptime from './pages/Uptime'
import CostAnalytics from './pages/CostAnalytics'
import Login from './pages/Login'
import Signup3D from './pages/Signup3D'
import OrganizationSettings from './pages/OrganizationSettings'

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return !!localStorage.getItem('auth_token')
  })

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" /> : <Login />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to="/" /> : <Signup3D />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/topology"
          element={
            isAuthenticated ? <TopologyView /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/query"
          element={
            isAuthenticated ? <NLQuery /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/incidents"
          element={
            isAuthenticated ? <Incidents /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/security"
          element={
            isAuthenticated ? <Security /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/uptime"
          element={
            isAuthenticated ? <Uptime /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/cost"
          element={
            isAuthenticated ? <CostAnalytics /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? <OrganizationSettings /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </Router>
  )
}

export default App
