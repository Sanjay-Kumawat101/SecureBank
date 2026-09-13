import React from 'react';

const NAV = ['Security Overview', 'Vulnerability Tests', 'Attack Logs', 'Security Controls', 'Reports'];

const CARDS = [
  {
    title: 'Security Overview',
    desc: 'A live risk score and posture summary for your account will appear here.',
  },
  {
    title: 'Vulnerability Tests',
    desc: 'Run guided vulnerability demonstrations against a sandboxed copy of this app.',
  },
  {
    title: 'Attack Logs',
    desc: 'Inspect simulated attack attempts and how SecureBank responded to them.',
  },
  {
    title: 'Security Controls',
    desc: 'Toggle security controls on/off to see their effect in later phases.',
  },
  {
    title: 'Reports',
    desc: 'Export findings and remediation guidance as shareable reports.',
  },
];

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export default function Security() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-security-dark to-security text-white p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <LockIcon className="h-7 w-7" />
          <h1 className="text-2xl font-bold">Security Center</h1>
        </div>
        <p className="text-security-light/90 max-w-xl">
          This area is reserved for upcoming security-education modules. Phase 1 ships the secure
          banking baseline only &mdash; the tools below are placeholders for later phases.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {NAV.map((item, idx) => (
          <span
            key={item}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              idx === 0
                ? 'bg-security/10 border-security/30 text-security-dark'
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map((card) => (
          <div
            key={card.title}
            className="relative rounded-2xl border border-security/20 bg-white dark:bg-navy-900 p-5 opacity-80"
          >
            <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wide bg-security/10 text-security-dark px-2 py-0.5 rounded-full">
              Coming soon
            </span>
            <div className="h-9 w-9 rounded-lg bg-security/10 text-security-dark flex items-center justify-center mb-3">
              <LockIcon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-400">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
