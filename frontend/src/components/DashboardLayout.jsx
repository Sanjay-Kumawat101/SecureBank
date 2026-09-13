import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DashboardLayout({ children, darkMode, onToggleDark }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    showToast('You have been logged out', 'success');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-navy-950">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          user={user}
          onMenuClick={() => setSidebarOpen((o) => !o)}
          darkMode={darkMode}
          onToggleDark={onToggleDark}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
