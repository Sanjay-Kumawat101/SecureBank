import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function SecurityText({ value, className }) {
  const { xssProtection } = useAuth();

  if (value === null || value === undefined) return null;

  if (xssProtection) {
    return <span className={className}>{value}</span>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: String(value) }} />;
}
