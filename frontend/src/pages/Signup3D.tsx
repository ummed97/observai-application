import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import ParticleBackground from '../components/3d/ParticleBackground';
import './Login3D.css'; // Reusing the same styles

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const Signup3D: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Basic validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/v1/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(data.detail || 'Signup failed. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login3d-container">
            <ParticleBackground />

            <div className="login3d-content">
                <div className="login3d-card">
                    {/* Logo */}
                    <div className="login3d-logo-container">
                        <img
                            src="/logo.png"
                            alt="ObservAI Logo"
                            className="login3d-logo"
                        />
                    </div>

                    {/* Title */}
                    <h1 className="login3d-title">Create Account</h1>
                    <p className="login3d-subtitle">Join the AI Observability Platform today!</p>

                    {/* Success Message */}
                    {success && (
                        <div className="login3d-success">
                            Account created successfully! Redirecting to login...
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="login3d-error">
                            {error}
                        </div>
                    )}

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit} className="login3d-form">
                        <div className="login3d-input-group">
                            <label htmlFor="email" className="login3d-label">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="login3d-input"
                                placeholder="Enter your email"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="login3d-input-group">
                            <label htmlFor="password" className="login3d-label">Password</label>
                            <div className="login3d-password-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="login3d-input"
                                    placeholder="Create a password (min. 6 characters)"
                                    required
                                    autoComplete="new-password"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="login3d-password-toggle"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="login3d-button"
                        >
                            {loading ? 'Creating Account...' : success ? 'Success!' : 'Sign Up'}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="login3d-footer">
                        <p>
                            Already have an account?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="login3d-link"
                            >
                                Login
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup3D;
