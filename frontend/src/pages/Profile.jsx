import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, refreshProfile, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
      setLoading(false);
    }
  }, [user]);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/user/profile', form);
      await refreshProfile();
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await api.post('/user/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      showToast('Password changed successfully', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err?.response?.data?.error || 'Could not change password');
    } finally {
      setChangingPw(false);
    }
  }

  async function handleLogoutAll() {
    setLoggingOutAll(true);
    try {
      await api.post('/user/logout-all-sessions');
      showToast('All other sessions have been logged out', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not log out other sessions', 'error');
    } finally {
      setLoggingOutAll(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" label="Loading your profile..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Profile</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your personal information and security settings.</p>
      </div>

      <Card title="Personal Information">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input label="Email address" value={user?.email || ''} disabled readOnly className="opacity-70" />
            <Input
              label="Phone number"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street, City, State"
            />
          </div>
          <Button type="submit" loading={savingProfile}>
            Save Changes
          </Button>
        </form>
      </Card>

      <Card title="Change Password">
        {pwError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2">
            {pwError}
          </div>
        )}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New password"
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              required
              minLength={8}
            />
            <Input
              label="Confirm new password"
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" variant="secondary" loading={changingPw}>
            Change Password
          </Button>
        </form>
      </Card>

      <Card title="Session Security">
        <p className="text-sm text-gray-500 mb-4">
          If you suspect your account is logged in on another device, you can log out of all other
          active sessions immediately.
        </p>
        <Button variant="danger" onClick={handleLogoutAll} loading={loggingOutAll}>
          Logout All Other Sessions
        </Button>
      </Card>
    </div>
  );
}
