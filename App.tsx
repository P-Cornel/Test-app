
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, SheetRow, PlotPoint, ColumnMapping, StyleRule, ThemeMode } from './types';
import { fetchGoogleSheetData } from './services/sheetService';
import { identifyColumns, getSheetInsights } from './services/geminiService';
import MapDisplay from './components/MapDisplay';
import DataTable from './components/DataTable';

const PALETTE = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
];

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1RBeGX954Pebq-Vj8Z-La41zFkdxykV4tijpHclkHLCk/edit?usp=sharing';

const App: React.FC = () => {
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('last_sheet_url') || DEFAULT_SHEET_URL);
  const [state, setState] = useState<AppState>({
    isLoading: false,
    error: null,
    sheetData: [],
    headers: [],
    mapping: null,
    points: [],
    styleConfig: { activeColumn: null, rule: null },
    theme: (localStorage.getItem('theme') as ThemeMode) || 'light'
  });
  const [insights, setInsights] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<PlotPoint | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', state.theme);
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const toggleTheme = () => {
    setState(prev => ({ 
      ...prev, 
      theme: prev.theme === 'light' ? 'dark' : 'light' 
    }));
  };

  const cleanAndParse = (val: string): number | null => {
    let s = val.trim().toUpperCase();
    if (!s) return null;
    const isNegative = s.includes('S') || s.includes('W') || s.startsWith('-');
    if (s.includes(',') && !s.includes('.')) {
      const commaCount = (s.match(/,/g) || []).length;
      if (commaCount === 1) s = s.replace(',', '.');
    }
    const cleaned = s.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return isNegative ? -Math.abs(num) : Math.abs(num);
  };

  const processPoints = useCallback((rows: SheetRow[], mapping: ColumnMapping | null): PlotPoint[] => {
    if (!mapping || !mapping.latColumn || !mapping.lngColumn) return [];
    const validPoints: PlotPoint[] = [];
    const isSameColumn = mapping.latColumn === mapping.lngColumn;
    rows.forEach(row => {
      let lat: number | null = null;
      let lng: number | null = null;
      if (isSameColumn) {
        const combined = String(row[mapping.latColumn]);
        const parts = combined.split(/[,;]/);
        if (parts.length >= 2) {
          lat = cleanAndParse(parts[0]);
          lng = cleanAndParse(parts[1]);
        }
      } else {
        lat = cleanAndParse(String(row[mapping.latColumn]));
        lng = cleanAndParse(String(row[mapping.lngColumn]));
      }
      if (lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
        validPoints.push({ lat, lng, data: row });
      }
    });
    return validPoints;
  }, []);

  const handleFetch = useCallback(async (targetUrl: string = sheetUrl) => {
    if (!targetUrl) return;
    setState(prev => ({ ...prev, isLoading: true, error: null, points: [], sheetData: [], mapping: null }));
    setInsights(null);
    setSelectedPoint(null);
    localStorage.setItem('last_sheet_url', targetUrl);
    
    try {
      const { headers, rows } = await fetchGoogleSheetData(targetUrl);
      const mapping = await identifyColumns(headers, rows);
      const validPoints = processPoints(rows, mapping);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        sheetData: rows,
        headers,
        mapping,
        points: validPoints,
      }));
      getSheetInsights(rows).then(setInsights).catch(console.error);
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, [processPoints, sheetUrl]);

  useEffect(() => {
    // Initial fetch on mount
    handleFetch();
  }, []);

  const handleApplyStyle = (columnName: string) => {
    if (!columnName) {
      setState(prev => ({ ...prev, styleConfig: { activeColumn: null, rule: null } }));
      return;
    }
    const uniqueValues: string[] = Array.from(new Set(state.sheetData.map(r => String(r[columnName]))));
    const colorMap: Record<string, string> = {};
    uniqueValues.forEach((val, idx) => { colorMap[val] = PALETTE[idx % PALETTE.length]; });
    const rule: StyleRule = { column: columnName, type: 'categorical', colorMap };
    setState(prev => ({ ...prev, styleConfig: { activeColumn: columnName, rule } }));
  };

  const updateMapping = (type: 'lat' | 'lng', column: string) => {
    setState(prev => {
      const newMapping = prev.mapping ? { ...prev.mapping } : { latColumn: '', lngColumn: '' };
      if (type === 'lat') newMapping.latColumn = column;
      else newMapping.lngColumn = column;
      return { ...prev, mapping: newMapping, points: processPoints(prev.sheetData, newMapping) };
    });
  };

  const swapMapping = () => {
    setState(prev => {
      if (!prev.mapping) return prev;
      const newMapping = { latColumn: prev.mapping.lngColumn, lngColumn: prev.mapping.latColumn };
      return { ...prev, mapping: newMapping, points: processPoints(prev.sheetData, newMapping) };
    });
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-gray-50 dark:bg-slate-950 font-sans">
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 sticky top-0 z-[1000] shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between md:justify-start gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 hidden sm:block">SheetPlotter AI</h1>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-slate-400"
            aria-label="Toggle dark mode"
          >
            {state.theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>
            )}
          </button>
        </div>

        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Paste Google Sheet URL..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
            {state.isLoading && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2">
                 <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
               </div>
            )}
          </div>
          <button 
            onClick={() => handleFetch()}
            disabled={state.isLoading || !sheetUrl}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex-shrink-0"
          >
            Visualize
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">AI Context</h2>
            {state.isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded"></div>
                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            ) : (
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed italic">{insights || "Visualize your data by pasting a shared Google Sheet link above."}</p>
            )}
          </div>

          {selectedPoint && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border-2 border-indigo-500 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm">Location Details</h3>
                <button onClick={() => setSelectedPoint(null)} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 text-xl font-light">×</button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl mb-2">
                  <p className="text-[10px] font-bold text-indigo-400 mb-1">COORDINATES</p>
                  <p className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-300">{selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}</p>
                </div>
                {Object.entries(selectedPoint.data).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-50 dark:border-slate-800 pb-1.5 last:border-0">
                    <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">{key}</p>
                    <p className="text-xs text-gray-700 dark:text-slate-300">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="lg:col-span-9 flex flex-col gap-6">
          {state.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm shadow-sm flex items-start gap-3 animate-shake">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="font-bold">Error loading data</p>
                <p className="text-xs mt-1">{state.error}</p>
              </div>
            </div>
          )}
          
          <div className="h-[600px] bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden relative transition-colors">
            <MapDisplay points={state.points} styleConfig={state.styleConfig} theme={state.theme} onMarkerClick={setSelectedPoint} />
          </div>

          {state.sheetData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Map Configuration</h2>
                  <button onClick={swapMapping} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded text-xs font-bold transition-colors">Swap XY</button>
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] text-gray-500 dark:text-slate-400 leading-tight">If your coordinates are in one column, select it for both Lat and Lng.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">LATITUDE SOURCE</label>
                      <select 
                        value={state.mapping?.latColumn || ''}
                        onChange={(e) => updateMapping('lat', e.target.value)}
                        className="w-full text-sm border-gray-200 dark:border-slate-700 border rounded-lg p-2 bg-gray-50 dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                      >
                        {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">LONGITUDE SOURCE</label>
                      <select 
                        value={state.mapping?.lngColumn || ''}
                        onChange={(e) => updateMapping('lng', e.target.value)}
                        className="w-full text-sm border-gray-200 dark:border-slate-700 border rounded-lg p-2 bg-gray-50 dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                      >
                        {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <h2 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Marker Style</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">COLOR BY DATA</label>
                    <select 
                      value={state.styleConfig.activeColumn || ''}
                      onChange={(e) => handleApplyStyle(e.target.value)}
                      className="w-full text-sm border-gray-200 dark:border-slate-700 border rounded-lg p-2 bg-gray-50 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="">Solid Blue (Default)</option>
                      {state.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  {state.styleConfig.rule && (
                    <div className="mt-4 pt-4 border-t dark:border-slate-800 space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar grid grid-cols-2 gap-x-4">
                      {Object.entries(state.styleConfig.rule.colorMap).map(([val, color]) => (
                        <div key={val} className="flex items-center gap-2 text-[10px]">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate text-gray-600 dark:text-slate-400">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {state.sheetData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 transition-colors">
              <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Source Records</h2>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">{state.points.length} of {state.sheetData.length} rows plotted</p>
              </div>
              <DataTable headers={state.headers} rows={state.sheetData} theme={state.theme} latCol={state.mapping?.latColumn} lngCol={state.mapping?.lngColumn} />
            </div>
          )}
        </section>
      </main>

      <footer className="py-6 px-6 text-center flex flex-col items-center gap-2 border-t dark:border-slate-800 mt-auto bg-white dark:bg-slate-900 transition-colors">
        <p className="text-[9px] text-gray-400 dark:text-slate-500 uppercase tracking-widest">Supports WGS84, European Decimals, and Combined Lat/Lng Columns.</p>
        <p className="text-[8px] text-gray-300 dark:text-slate-600">Powered by Gemini AI Free Tier.</p>
      </footer>
    </div>
  );
};

export default App;
