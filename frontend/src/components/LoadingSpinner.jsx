import React from 'react';

export default function LoadingSpinner({ size = 'md', className = '', label }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2';
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <span className={`rounded-full border-navy-200 border-t-navy-700 animate-spin ${sizeClass}`} />
      {label && <span className="text-sm text-gray-400">{label}</span>}
    </div>
  );
}
