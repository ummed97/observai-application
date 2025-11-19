import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TopologyView from './pages/TopologyView'
import NLQuery from './pages/NLQuery'
import Login from './pages/Login'

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
            isAuthenticated ? <Navigate to="/" /> : <Login onLogin={() => setIsAuthenticated(true)} />
          } 
        />
        <Route
          path="/"
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
      </Routes>
    </Router>
  )
}

export default App
