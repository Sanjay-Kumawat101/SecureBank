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
          Phase 3 adds input validation, XSS sanitization, and object-level authorization on top
          of the SQL Injection lab. Each implemented control can be switched between Secure Mode
          and Vulnerable Lab Mode for local testing.
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

        <Card
          title="SQL Injection Test Status"
          subtitle="Live status of the one control wired into the app so far."
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 dark:border-navy-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Current mode
              </p>
              <div className="flex items-center gap-2 mb-3">
                <SecurityStatus active={sqliOn} activeLabel="SECURE MODE" inactiveLabel="VULNERABLE LAB MODE" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {sqliOn
                  ? 'Login query: SELECT ... WHERE email = $1, with email passed as a bind parameter.'
                  : "Login query: SELECT ... WHERE email = '${email}', built by string concatenation."}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Expected result of a SQLi test right now:{' '}
                <span className={sqliOn ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                  {sqliOn ? 'BLOCKED — input treated as literal data' : 'VULNERABLE — input can alter query behavior'}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-navy-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                How to test it
              </p>
              <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside space-y-1">
                <li>Turn SQL Injection Protection OFF above (Vulnerable Lab Mode).</li>
                <li>
                  On the Login page, submit an email like{' '}
                  <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-navy-800 text-xs">
                    {"' OR '1'='1' --"}
                  </code>{' '}
                  with any password (or intercept the request in Burp Suite / your browser's dev
                  tools to inspect/modify it).
                </li>
                <li>Check the Attack Logs panel — a DETECTED / VULNERABLE event should appear.</li>
                <li>Turn the control back ON and repeat the exact same request.</li>
                <li>Confirm the Attack Logs now show a BLOCKED / SECURE event instead.</li>
              </ol>
            </div>
          </div>
        </Card>

        <Card
          title="Session Security Test"
          subtitle="Demonstrates session cookie protection using browser developer tools."
        >
          <div className="space-y-4">

            <div className="rounded-xl border border-gray-100 dark:border-navy-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                HttpOnly Protection
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    JavaScript Cookie Access
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {config.secureCookies
                      ? 'HttpOnly prevents JavaScript from directly accessing the session cookie.'
                      : 'HttpOnly is disabled, allowing JavaScript to access the session cookie.'}
                  </p>
                </div>

                <Badge variant={config.secureCookies ? 'success' : 'danger'}>
                  {config.secureCookies ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-navy-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                SameSite Protection
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    Cross-Site Cookie Protection
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {config.secureCookies
                      ? 'SameSite=Lax restricts cross-site transmission of the session cookie.'
                      : 'SameSite protection is disabled in Vulnerable Lab Mode.'}
                  </p>
                </div>

                <Badge variant={config.secureCookies ? 'success' : 'danger'}>
                  {config.secureCookies ? 'LAX' : 'DISABLED'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-navy-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Session Cookie
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    securebank.sid
                  </p>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {config.secureCookies
                      ? 'Session cookie is hardened with HttpOnly and SameSite protections.'
                      : 'Session cookie is intentionally exposed to demonstrate weaker session security.'}
                  </p>
                </div>

                <Badge variant={config.secureCookies ? 'success' : 'danger'}>
                  {config.secureCookies ? 'HARDENED' : 'VULNERABLE'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-navy-900/50 border border-gray-100 dark:border-navy-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Current Mode
              </p>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                {config.secureCookies
                  ? 'Secure Mode: HttpOnly and SameSite=Lax protections are enabled for the session cookie.'
                  : 'Vulnerable Lab Mode: HttpOnly and SameSite protections are disabled for demonstration.'}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">
                How to test it
              </p>

              <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside space-y-1">
                <li>Log in while Session Security is ON.</li>
                <li>Open F12 → Application → Cookies.</li>
                <li>Select the <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-xs">securebank.sid</code> cookie.</li>
                <li>Verify that HttpOnly is enabled and SameSite is set to Lax.</li>
                <li>Turn Session Security OFF and refresh the application.</li>
                <li>Check <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-xs">securebank.sid</code> again.</li>
                <li>Verify that HttpOnly and SameSite protections are disabled.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
                Local Testing Note
              </p>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                The Secure cookie flag is not enabled on localhost because the
                application is running over HTTP. In a production HTTPS deployment,
                Secure is enabled automatically in Secure Mode.
              </p>
            </div>

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
