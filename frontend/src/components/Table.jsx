import React from 'react';

export default function Table({ columns, data, onRowClick, emptyMessage = 'No records found' }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-navy-800">
            {columns.map((col) => (
              <th key={col.key} className="py-2 pr-4 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          )}
          {data.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-gray-50 dark:border-navy-800/60 ${
                onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800/50' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 pr-4 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
