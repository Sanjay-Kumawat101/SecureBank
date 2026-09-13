import React from 'react';
import Badge from './Badge';

const SEVERITY_VARIANT = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

const GOOD_STATUSES = new Set(['BLOCKED', 'SECURED']);

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function SecurityEvent({ event }) {
  const isGood = GOOD_STATUSES.has(event.status);

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-navy-800 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            {(event.type || '').replace(/_/g, ' ')}
          </span>
          <Badge variant={SEVERITY_VARIANT[event.severity] || 'neutral'}>{event.severity}</Badge>
          {event.mode && (
            <Badge variant={event.mode === 'VULNERABLE' ? 'danger' : 'success'}>{event.mode}</Badge>
          )}
        </div>
        {event.endpoint && <p className="text-xs text-gray-400 mt-1 font-mono">{event.endpoint}</p>}
        {event.detail && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{event.detail}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <Badge variant={isGood ? 'success' : 'danger'}>{event.status}</Badge>
        <p className="text-[11px] text-gray-400 mt-1">{formatTime(event.created_at || event.timestamp)}</p>
      </div>
    </div>
  );
}
