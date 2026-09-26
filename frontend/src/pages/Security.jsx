import React, { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Toggle from '../components/Toggle';
import SecurityStatus from '../components/SecurityStatus';
import SecurityEvent from '../components/SecurityEvent';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

// implemented: true -> actually wired into a backend route right now.
const CONTROLS = [
  {
    key: 'sqlInjection',
    label: 'SQL Injection Protection',
    description:
      'Controls how POST /api/auth/login builds its database query: a parameterized query (ON) vs. raw string concatenation (OFF).',
    implemented: true,
  },
  {
    key: 'inputValidation',
    label: 'Input Validation',
    description: 'Validates profile, transfer, search, date, and account-number inputs.',
    implemented: true,
  },
  {
    key: 'xssProtection',
    label: 'XSS Protection',
    description: 'Strips markup and control characters from user-controlled text before storage.',
    implemented: true,
  },
  {
    key: 'authorization',
    label: 'Authorization / IDOR Protection',
    description: 'Restricts account and transaction lookups to objects owned by the logged-in user.',
    implemented: true,
  },
  {
    key: 'csrfProtection',
    label: 'CSRF Protection',
    description:
      'Requires a session-bound CSRF token on state-changing transfer requests.',
    implemented: true,
  },
  {
    key: 'secureCookies',
    label: 'Session Security',
    description:
      'Protects sessions using HttpOnly cookies, SameSite protection, and session ID regeneration.',
    implemented: true,
  },
  {
    key: 'rateLimiting',
    label: 'Rate Limiting',
    description:
      'Limits repeated login requests to reduce brute-force and automated attacks.',
    implemented: true,
  },
  {
    key: 'securityHeaders',
    label: 'Security Headers',
    description:
      'Adds browser security headers such as CSP, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy.',
    implemented: true,
  },
];

export default function Security() {
  const [config, setConfig] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState(null);
  const { showToast } = useToast();
  const { refreshSecurityConfig } = useAuth();

  const loadConfig = useCallback(async () => {
    const { data } = await api.get('/security/config');
    setConfig(data.config);
  }, []);

  const loadEvents = useCallback(async () => {
    const { data } = await api.get('/security/events', { params: { limit: 25 } });
    setEvents(data.events || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadConfig(), loadEvents()]);
      } catch (err) {
        showToast('Could not load Security Center data', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(key, nextValue) {
    setTogglingKey(key);
    try {
      const { data } = await api.put('/security/config', { key, value: nextValue });
      setConfig(data.config);
      await refreshSecurityConfig();
      showToast(
        nextValue
          ? `${key} switched to Secure Mode`
          : `${key} switched to Vulnerable Lab Mode — for local testing only`,
        nextValue ? 'success' : 'warning'
      );
      loadEvents();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not update security control', 'error');
    } finally {
      setTogglingKey(null);
    }
  }

  if (loading || !config) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" label="Loading Security Center..." />
      </div>
    );
  }

  const sqliOn = config.sqlInjection;
  const csrfOn = config.csrfProtection;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-security-dark to-security text-white p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <LockIcon className="h-7 w-7" />
          <h1 className="text-2xl font-bold">Security Center</h1>
        </div>
        <p className="text-security-light/90 max-w-2xl">
          Centralized security controls for SecureBank. Enable or disable individual protections, switch between Secure Mode and Vulnerable Mode, and test how each control protects the application against common web security threats.
        </p>
      </div>

      {!sqliOn && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm font-medium dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
          Vulnerable Lab Mode is ON for SQL Injection. /api/auth/login currently builds its query
          by concatenating raw input. Use this only against your own local/test database.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Security Controls" subtitle="Toggle a control to switch its Secure vs. Vulnerable Lab Mode.">
          <div className="divide-y divide-gray-100 dark:divide-navy-800">
            {CONTROLS.map((control) => (
              <div key={control.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{control.label}</span>
                    <SecurityStatus active={config[control.key]} />
                    {!control.implemented && (
                      <Badge variant="neutral">Coming soon</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{control.description}</p>
                </div>
                <Toggle
                  checked={config[control.key]}
                  disabled={!control.implemented || togglingKey === control.key}
                  onChange={(next) => handleToggle(control.key, next)}
                  ariaLabel={`Toggle ${control.label}`}
                />
              </div>
            ))}
          </div>
        </Card>

        

        

      </div>


      <Card
        title="Attack Logs"
        subtitle="Recent security events recorded by the lab."
        actions={
          <Button variant="secondary" onClick={loadEvents}>
            Refresh
          </Button>
        }
      >
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No security events yet. Try the SQL injection test above.
          </p>
        ) : (
          <div>
            {events.map((event) => (
              <SecurityEvent key={event.id} event={event} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
