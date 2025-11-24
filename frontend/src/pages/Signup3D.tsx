import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import NetworkBackground from '../components/common/NetworkBackground';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const Signup3D: React.FC = () => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!fullName.trim()) {
            setError('Full name is required');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    email,
                    password
                }),
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
        <div className="flex h-screen w-full overflow-hidden bg-white">
            {/* Left Panel - Branding & Animation */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-[#0F111A] text-white overflow-hidden">
                <NetworkBackground />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Activity className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">ObservAI</span>
                    </div>

                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Join the <span className="text-blue-500">Future of Observability</span>
                    </h1>

                    <p className="text-gray-400 text-lg max-w-md">
                        Create an account to start monitoring your infrastructure with autonomous AI agents.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-[#0F111A]" />
                        ))}
                    </div>
                    <p>Join 500+ DevOps engineers</p>
                </div>
            </div>

            {/* Right Panel - Signup Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-gray-50 overflow-y-auto">
                <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl my-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                        <p className="mt-2 text-gray-600">Get started with ObservAI today</p>
                    </div>

                    {success ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <h3 className="text-lg font-medium text-green-800">Account Created!</h3>
                            <p className="text-green-600">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none [&::-ms-reveal]:hidden"
                                        placeholder="Create a password (min. 6 chars)"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none [&::-ms-reveal]:hidden"
                                        placeholder="Confirm your password"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Account...' : 'Sign up'}
                            </button>

                            <div className="text-center mt-4">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="font-medium text-blue-600 hover:text-blue-500 hover:underline transition-all"
                                    >
                                        Sign in
                                    </button>
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup3D;
