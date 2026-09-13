import React from 'react';

export default function Card({ children, className = '', title, subtitle, actions, padded = true }) {
  return (
    <div className={`bg-white dark:bg-navy-900 rounded-2xl shadow-sm border border-gray-100 dark:border-navy-800 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
