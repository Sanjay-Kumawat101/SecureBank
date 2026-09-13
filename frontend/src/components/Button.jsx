import React from 'react';

const VARIANTS = {
  primary: 'bg-navy-700 text-white hover:bg-navy-800 focus-visible:ring-navy-500',
  secondary: 'bg-white text-navy-700 border border-navy-200 hover:bg-navy-50 focus-visible:ring-navy-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400',
  ghost: 'bg-transparent text-navy-700 hover:bg-navy-50 focus-visible:ring-navy-300',
  security: 'bg-security text-white hover:bg-security-dark focus-visible:ring-security',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      )}
      {children}
    </button>
  );
}
