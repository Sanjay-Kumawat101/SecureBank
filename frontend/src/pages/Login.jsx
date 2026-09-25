import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back!', 'success');
      const dest = location.state?.from || '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-300 to-navy-500 flex items-center justify-center font-bold text-white text-lg">
            S
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">SecureBank</span>
        </div>

        <Card className="!rounded-2xl">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-6">Log in to access your account</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {/* Email field is intentionally type="text", not type="email": Phase 2's
              SQL injection lab needs to submit payloads (e.g. ' OR '1'='1' --)
              that don't look like a real email address, and the browser's
              built-in type="email" validation would block that submission
              client-side before it ever reached the server. */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="text"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full" loading={loading}>
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-navy-700 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </Card>
        
      </div>
    </div>
  );
}
