
import React from 'react';
import { SheetRow, ThemeMode } from '../types';

interface DataTableProps {
  headers: string[];
  rows: SheetRow[];
  theme: ThemeMode;
  latCol?: string;
  lngCol?: string;
}

const DataTable: React.FC<DataTableProps> = ({ headers, rows, theme, latCol, lngCol }) => {
  return (
    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 transition-colors">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-sm">
        <thead className="bg-gray-50 dark:bg-slate-800/50 transition-colors">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={`px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider ${
                  h === latCol || h === lngCol ? 'bg-blue-50 dark:bg-indigo-900/30 text-blue-700 dark:text-indigo-400' : ''
                }`}
              >
                {h}
                {(h === latCol || h === lngCol) && (
                  <span className="ml-1 text-[10px] bg-blue-100 dark:bg-indigo-900 px-1 rounded">COORD</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800 transition-colors">
          {rows.slice(0, 50).map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              {headers.map((h) => (
                <td key={h} className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-slate-400">
                  {String(row[h])}
                </td>
              ))}
            </tr>
          ))}
          {rows.length > 50 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-2 text-center text-gray-400 dark:text-slate-500 italic">
                ... and {rows.length - 50} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
