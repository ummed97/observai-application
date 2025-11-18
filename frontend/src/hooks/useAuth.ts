import { useState, useEffect } from ‘react’;

export const useAuth = () => {
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
checkAuth();
}, []);

const checkAuth = () => {
const token = localStorage.getItem(‘auth_token’);
setIsAuthenticated(!!token);
setLoading(false);
};

const login = (token: string, email: string) => {
localStorage.setItem(‘auth_token’, token);
localStorage.setItem(‘user_email’, email);
setIsAuthenticated(true);
};

const logout = () => {
localStorage.removeItem(‘auth_token’);
localStorage.removeItem(‘user_email’);
setIsAuthenticated(false);
window.location.href = ‘/login’;
};

return {
isAuthenticated,
loading,
login,
logout,
checkAuth
};
};
