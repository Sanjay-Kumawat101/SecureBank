import React from 'react';
import Badge from './Badge';

export default function SecurityStatus({ active, activeLabel = 'ACTIVE', inactiveLabel = 'VULNERABLE' }) {
  return (
    <Badge variant={active ? 'success' : 'danger'} dot>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
