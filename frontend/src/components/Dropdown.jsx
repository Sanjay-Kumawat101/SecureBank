import React, { useEffect, useRef, useState } from 'react';

export default function Dropdown({ trigger, items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2">
        {trigger}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-navy-800 rounded-lg shadow-lg border border-gray-100 dark:border-navy-700 py-1 z-50">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-navy-700"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
