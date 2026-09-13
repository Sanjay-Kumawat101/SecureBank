import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      showToast('Account created! You can now log in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-navy-300 to-navy-500 flex items-center justify-center font-bold text-white text-lg">
            S
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">SecureBank</span>
        </div>

        <Card className="!rounded-2xl">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Create your account</h1>
          <p className="text-sm text-gray-400 mb-6">
            A Savings account with a ₹10,000.00 starting balance is created automatically.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              name="name"
              required
              value={form.name}
              onChange={update('name')}
              placeholder="Jane Doe"
            />
            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Re-enter your password"
            />
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-navy-700 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
