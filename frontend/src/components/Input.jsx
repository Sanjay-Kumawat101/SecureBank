import React from 'react';

export default function Input({ label, error, className = '', id, prefix, ...rest }) {
  const inputId = id || rest.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-navy-800 dark:text-gray-100 border-gray-300 dark:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent placeholder:text-gray-400 ${
            prefix ? 'pl-8' : ''
          } ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
