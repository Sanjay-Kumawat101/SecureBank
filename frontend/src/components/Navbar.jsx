import React from 'react';
import { initialsOf } from '../utils/format';

function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar({ user, onMenuClick, darkMode, onToggleDark }) {
  return (
    <header className="h-16 bg-white dark:bg-navy-900 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-gray-500 dark:text-gray-300">
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="font-semibold text-gray-700 dark:text-gray-100 hidden md:block">SecureBank</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onToggleDark}
          className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-navy-700 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800"
          title="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button className="relative text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <BellIcon className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-navy-700 text-white flex items-center justify-center text-sm font-semibold">
            {initialsOf(user?.name)}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-100">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
}
