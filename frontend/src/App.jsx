import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';
import Security from './pages/Security';

function AppRoutes() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('securebank-dark') === 'true';
    } catch {
      return false;
    }
  });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('securebank-dark', String(darkMode));
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  function withLayout(children) {
    return (
      <ProtectedRoute>
        <DashboardLayout darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)}>
          {children}
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route path="/dashboard" element={withLayout(<Dashboard />)} />
      <Route path="/accounts" element={withLayout(<Accounts />)} />
      <Route path="/transfer" element={withLayout(<Transfer />)} />
      <Route path="/transactions" element={withLayout(<Transactions />)} />
      <Route path="/profile" element={withLayout(<Profile />)} />
      <Route path="/security" element={withLayout(<Security />)} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
