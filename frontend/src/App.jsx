import { useState, useEffect, useMemo } from 'react';
import {
  Search, Database, AlertCircle, Loader2, Code2, BarChart2,
  LineChart as LineIcon, PieChart as PieIcon, Table as TableIcon,
  Download, Sparkles, ChevronRight, Lock, User, LogOut,
  History, Play, CheckCircle2, X, FileJson,
  Layers, ArrowUpRight, TrendingUp, ShieldAlert, Cpu,
  Server, Link as LinkIcon, Unlink
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

const CHART_COLORS = [
  '#10b981', '#6366f1', '#ec4899', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'
];

export default function App() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // --- Auth State ---
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- External DB Connection State ---
  const [activeDbUri, setActiveDbUri] = useState(() => localStorage.getItem('active_db_uri') || '');
  const [showDbModal, setShowDbModal] = useState(false);
  const [inputDbUri, setInputDbUri] = useState(activeDbUri);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // --- Query & Dashboard State ---
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [activeChartType, setActiveChartType] = useState('bar');
  
  // --- Modals & Panels ---
  const [showHistory, setShowHistory] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [schemaData, setSchemaData] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // --- SQL Workbench State ---
  const [showSqlWorkbench, setShowSqlWorkbench] = useState(false);
  const [editableSql, setEditableSql] = useState('');
  const [workbenchLoading, setWorkbenchLoading] = useState(false);
  const [workbenchError, setWorkbenchError] = useState(null);

  // --- History & Table Filters ---
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('query_history') || '[]');
    } catch {
      return [];
    }
  });
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 10;

  // Domain Quick Prompts
  const PROMPT_CATEGORIES = [
    {
      category: "Revenue & Finance",
      prompts: [
        "Calculate the net profit margin by product category.",
        "What is the total revenue of all completed orders?",
        "What is the failure rate of our UPI transactions?"
      ]
    },
    {
      category: "Supply Chain & Catalog",
      prompts: [
        "Which suppliers have inventory dropping below 50 units?",
        "Top 5 most expensive products by selling price.",
        "List total inventory movements by movement type."
      ]
    },
    {
      category: "Clients & Demographics",
      prompts: [
        "Show me the top 5 corporate clients by total order volume.",
        "How many active vs churned corporate clients are there per city?",
        "Find the user who placed the highest value single order."
      ]
    }
  ];

  // Save query history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('query_history', JSON.stringify(queryHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [queryHistory]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Invalid username or password');

      localStorage.setItem('access_token', data.access);
      setToken(data.access);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setResults(null);
    setShowHistory(false);
    setShowSchema(false);
    setShowDbModal(false);
  };

  // Fetch Database Schema
  const fetchSchema = async () => {
    if (!token) return;
    setSchemaLoading(true);
    try {
      const url = activeDbUri
        ? `${API_BASE_URL}/api/schema/?db_uri=${encodeURIComponent(activeDbUri)}`
        : `${API_BASE_URL}/api/schema/`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) setSchemaData(data);
    } catch (e) {
      console.error("Error fetching schema", e);
    } finally {
      setSchemaLoading(false);
    }
  };

  // Open Schema Modal
  const handleOpenSchema = () => {
    setShowSchema(true);
    if (!schemaData) fetchSchema();
  };

  // Test External DB Connection
  const handleTestConnection = async () => {
    if (!inputDbUri.trim()) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-db/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ db_uri: inputDbUri.trim() })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setTestResult({ success: true, ...data });
      } else {
        setTestResult({ success: false, error: data.error || 'Connection failed' });
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  // Apply External DB Connection
  const handleApplyConnection = () => {
    const trimmed = inputDbUri.trim();
    setActiveDbUri(trimmed);
    localStorage.setItem('active_db_uri', trimmed);
    setSchemaData(null);
    setShowDbModal(false);
  };

  // Reset to Default Demo DB
  const handleResetConnection = () => {
    setActiveDbUri('');
    setInputDbUri('');
    localStorage.removeItem('active_db_uri');
    setTestResult(null);
    setSchemaData(null);
    setShowDbModal(false);
  };

  // Main Ask Function (Natural Language to SQL)
  const askDataWhisper = async (queryToRun) => {
    const textToSearch = typeof queryToRun === 'string' ? queryToRun : prompt;
    if (!textToSearch.trim()) return;

    setPrompt(textToSearch);
    setLoading(true);
    setError(null);
    setWorkbenchError(null);
    setTablePage(1);
    setTableSearch('');

    // Prepare conversational history (last 3 questions)
    const historyPayload = queryHistory.slice(0, 3).map(h => ({
      question: h.question,
      sql: h.sql
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/ask/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: textToSearch,
          history: historyPayload,
          db_uri: activeDbUri || undefined
        }),
      });

      const data = await response.json();
      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to execute query');

      setResults(data);
      setEditableSql(data.sql || '');

      // Set best chart type based on AI recommendation
      if (data.suggested_chart) {
        if (data.suggested_chart === 'metric_card') {
          setActiveChartType('metric');
        } else if (['bar_chart', 'line_chart', 'area_chart', 'pie_chart', 'table'].includes(data.suggested_chart)) {
          setActiveChartType(data.suggested_chart.replace('_chart', ''));
        }
      } else {
        setActiveChartType(data.columns.length >= 2 ? 'bar' : 'table');
      }

      // Append to history
      const newHistoryItem = {
        id: Date.now(),
        question: textToSearch,
        sql: data.sql,
        timestamp: new Date().toLocaleTimeString(),
        rowCount: data.row_count || data.rows?.length || 0,
        executionTime: data.execution_time_ms || 0
      };
      setQueryHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Execute Custom SQL from Workbench
  const runCustomSql = async () => {
    if (!editableSql.trim()) return;
    setWorkbenchLoading(true);
    setWorkbenchError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/execute-raw/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: editableSql,
          db_uri: activeDbUri || undefined
        }),
      });

      const data = await response.json();
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Failed to execute custom SQL');

      setResults(prev => ({
        ...prev,
        sql: data.sql,
        columns: data.columns,
        rows: data.rows,
        row_count: data.row_count,
        execution_time_ms: data.execution_time_ms
      }));
    } catch (err) {
      setWorkbenchError(err.message);
    } finally {
      setWorkbenchLoading(false);
    }
  };

  // Export CSV
  const downloadCSV = () => {
    if (!results || !results.rows.length) return;
    const headers = results.columns.join(',');
    const csvData = results.rows.map(row =>
      results.columns.map(col => `"${row[col] !== undefined && row[col] !== null ? row[col] : ''}"`).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvData}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datawhisper_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export JSON
  const downloadJSON = () => {
    if (!results || !results.rows.length) return;
    const blob = new Blob([JSON.stringify(results.rows, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datawhisper_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Helpers for chart detection
  const numericColumns = useMemo(() => {
    if (!results || !results.rows || results.rows.length === 0) return [];
    return results.columns.filter(col => typeof results.rows[0][col] === 'number');
  }, [results]);

  const primaryNumericCol = numericColumns[0] || (results?.columns?.[1]);
  const primaryCategoryCol = results?.columns?.[0] || 'category';

  // Filtered & Paginated Table Rows
  const filteredRows = useMemo(() => {
    if (!results || !results.rows) return [];
    if (!tableSearch.trim()) return results.rows;
    const q = tableSearch.toLowerCase();
    return results.rows.filter(row =>
      Object.values(row).some(val => val !== null && val !== undefined && val.toString().toLowerCase().includes(q))
    );
  }, [results, tableSearch]);

  const paginatedRows = useMemo(() => {
    const start = (tablePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, tablePage]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  // Single metric extraction
  const singleMetric = useMemo(() => {
    if (!results || !results.rows || results.rows.length !== 1) return null;
    const firstRow = results.rows[0];
    const firstCol = results.columns[0];
    const val = firstRow[firstCol];
    return {
      label: firstCol.replace(/_/g, ' '),
      value: typeof val === 'number' ? (val >= 1000 ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val) : val
    };
  }, [results]);

  // --- LOGIN SCREEN ---
  if (!token) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient gradient glow */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md p-8 bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl shadow-xl shadow-emerald-500/10 mb-4">
              <Database className="w-9 h-9 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              DataWhisper <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest font-semibold">Enterprise</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 text-center">AI Conversational Business Intelligence Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {authError && (
              <div className="p-3.5 bg-red-950/40 border border-red-900/60 rounded-xl text-red-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500/60 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500/60 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 font-semibold transition-all shadow-lg shadow-emerald-600/25 mt-2 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Dashboard'}
            </button>

            <div className="pt-2 text-center text-xs text-slate-500">
              Protected by Enterprise JWT Authentication & AST Sandboxing
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-7">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl shadow-lg shadow-emerald-500/10">
              <Database className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">DataWhisper</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 tracking-wider uppercase border border-emerald-500/30">
                  Enterprise 2.0
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  <Cpu className="w-3 h-3" /> Self-Healing SQL
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">Conversational Natural Language Database Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Database Switcher Button */}
            <button
              onClick={() => { setInputDbUri(activeDbUri); setTestResult(null); setShowDbModal(true); }}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border transition-all shadow-sm ${
                activeDbUri
                  ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Connect external PostgreSQL or SQLite database"
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeDbUri ? 'Custom DB' : 'Default DB'}</span>
              <span className={`w-2 h-2 rounded-full ${activeDbUri ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            </button>

            <button
              onClick={handleOpenSchema}
              className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-800 transition-all shadow-sm"
              title="Explore database tables and fields"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explore Schema</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border transition-all shadow-sm ${
                showHistory ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Toggle query history log"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>History ({queryHistory.length})</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 px-3.5 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Natural Language Search Input */}
        <div className="space-y-4">
          <form onSubmit={askDataWhisper} className="relative group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-2xl blur-xl transition-all duration-500"></div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything about your data... (e.g. 'Show total sales by category this month')"
              className="relative w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-slate-700/80 rounded-2xl py-4.5 pl-6 pr-28 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 shadow-2xl transition-all"
              disabled={loading}
            />
            <div className="absolute right-3 top-2.5 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-40 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-sm font-semibold cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="hidden sm:inline">Query</span>
              </button>
            </div>
          </form>

          {/* Prompt Suggestions Grouped by Category */}
          {!results && !loading && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Suggested Business Intelligence Queries</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PROMPT_CATEGORIES.map((cat, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {cat.category}
                    </span>
                    <div className="space-y-1.5">
                      {cat.prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => askDataWhisper(p)}
                          className="w-full text-left text-xs p-2 rounded-xl bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800/60 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all flex items-center justify-between group"
                        >
                          <span className="line-clamp-1">{p}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-900/60 rounded-2xl text-red-300 backdrop-blur-md">
            <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-sm">Query Execution Halted</p>
              <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results Analytics Section */}
        {results && (
          <div className="space-y-6">

            {/* AI Executive Insight Card */}
            {results.insight && (
              <div className="p-4.5 bg-gradient-to-r from-emerald-950/30 via-slate-900/70 to-indigo-950/30 border border-emerald-500/20 rounded-2xl shadow-xl flex items-start gap-3.5 backdrop-blur-sm">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">AI Executive Takeaway</span>
                    {results.healed && (
                      <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Auto-Healed by AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{results.insight}</p>
                </div>
              </div>
            )}

            {/* Action Bar: Visual Switcher, Workbench Toggle, Exports */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl backdrop-blur-md">
              
              {/* Chart Switcher Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-slate-400 mr-1 hidden md:inline">View As:</span>
                
                {singleMetric && (
                  <button
                    onClick={() => setActiveChartType('metric')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      activeChartType === 'metric' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    KPI Card
                  </button>
                )}

                {results.columns.length >= 2 && results.rows.length > 0 && (
                  <>
                    <button
                      onClick={() => setActiveChartType('bar')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        activeChartType === 'bar' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> Bar
                    </button>
                    <button
                      onClick={() => setActiveChartType('line')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        activeChartType === 'line' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <LineIcon className="w-3.5 h-3.5" /> Line
                    </button>
                    <button
                      onClick={() => setActiveChartType('area')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        activeChartType === 'area' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Area
                    </button>
                    <button
                      onClick={() => setActiveChartType('pie')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        activeChartType === 'pie' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <PieIcon className="w-3.5 h-3.5" /> Donut
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveChartType('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeChartType === 'table' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" /> Table
                </button>
              </div>

              {/* Utility Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlWorkbench(!showSqlWorkbench)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    showSqlWorkbench ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>SQL Workbench</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showSqlWorkbench ? 'rotate-90' : ''}`} />
                </button>

                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Export raw data as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={downloadJSON}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Export raw data as JSON"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Interactive SQL Workbench Drawer */}
            {showSqlWorkbench && (
              <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interactive SQL Workbench</span>
                    {results.execution_time_ms && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        ⚡ {results.execution_time_ms} ms
                      </span>
                    )}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      📊 {results.row_count || results.rows.length} rows
                    </span>
                  </div>

                  <button
                    onClick={runCustomSql}
                    disabled={workbenchLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {workbenchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Run Query</span>
                  </button>
                </div>

                <textarea
                  value={editableSql}
                  onChange={(e) => setEditableSql(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500/50 leading-relaxed resize-y"
                  placeholder="Enter or modify SQL query..."
                />

                {workbenchError && (
                  <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-xl border border-red-900/50">
                    {workbenchError}
                  </p>
                )}
              </div>
            )}

            {/* Visual Analytics Display Area */}
            {activeChartType === 'metric' && singleMetric && (
              <div className="p-8 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-sm">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">
                  {singleMetric.label}
                </span>
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-tight">
                  {singleMetric.value}
                </span>
                <span className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Database Aggregate Validated
                </span>
              </div>
            )}

            {['bar', 'line', 'area', 'pie'].includes(activeChartType) && results.rows.length > 0 && (
              <div className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm h-[430px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Visualizing {primaryNumericCol.replace(/_/g, ' ')} by {primaryCategoryCol.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{results.rows.length} Data Points</span>
                </div>

                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {activeChartType === 'bar' && (
                      <BarChart data={results.rows} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey={primaryCategoryCol} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" />
                        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip cursor={{ fill: '#1e293b', opacity: 0.3 }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} itemStyle={{ color: '#34d399', fontWeight: 600 }} />
                        <Bar dataKey={primaryNumericCol} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    )}

                    {activeChartType === 'line' && (
                      <LineChart data={results.rows} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey={primaryCategoryCol} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                        <Line type="monotone" dataKey={primaryNumericCol} stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    )}

                    {activeChartType === 'area' && (
                      <AreaChart data={results.rows} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey={primaryCategoryCol} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey={primaryNumericCol} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGradient)" />
                      </AreaChart>
                    )}

                    {activeChartType === 'pie' && (
                      <PieChart>
                        <Pie
                          data={results.rows}
                          dataKey={primaryNumericCol}
                          nameKey={primaryCategoryCol}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {results.rows.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Interactive Data Table */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Records Table ({filteredRows.length} rows)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                    placeholder="Search within records..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 w-48 sm:w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-4 py-3 text-slate-500 font-mono w-12">#</th>
                      {results.columns.map((col, idx) => (
                        <th key={idx} className="px-4 py-3 font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={results.columns.length + 1} className="px-4 py-10 text-center text-slate-500 italic">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, rIdx) => {
                        const globalIndex = (tablePage - 1) * pageSize + rIdx + 1;
                        return (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-500">{globalIndex}</td>
                            {results.columns.map((col, cIdx) => {
                              const val = row[col];
                              return (
                                <td key={cIdx} className="px-4 py-3 whitespace-nowrap text-slate-300">
                                  {typeof val === 'number'
                                    ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                    : (val !== null && val !== undefined ? val.toString() : '-')}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Page {tablePage} of {totalPages}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                      disabled={tablePage === totalPages}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Slide-out Query History Drawer */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl p-6 z-50 overflow-y-auto backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Query History</h3>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {queryHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No queries recorded yet.</p>
            ) : (
              queryHistory.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    askDataWhisper(item.question);
                    setShowHistory(false);
                  }}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl cursor-pointer group transition-all space-y-1.5"
                >
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    {item.question}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{item.timestamp}</span>
                    <span>{item.rowCount} rows</span>
                  </div>
                  <code className="text-[10px] text-slate-400 font-mono block truncate bg-slate-900 p-1 rounded">
                    {item.sql}
                  </code>
                </div>
              ))
            )}
          </div>

          {queryHistory.length > 0 && (
            <button
              onClick={() => setQueryHistory([])}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-red-400 text-xs rounded-xl transition-colors border border-slate-700/50 cursor-pointer"
            >
              Clear History
            </button>
          )}
        </div>
      )}

      {/* Database Schema Explorer Modal */}
      {showSchema && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Database Schema Explorer</h3>
                  <p className="text-xs text-slate-400">
                    Engine: <span className="uppercase text-emerald-400 font-mono">{schemaData?.vendor || 'SQL'}</span> • {activeDbUri ? 'Connected to External DB' : 'Default Enterprise DB'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSchema(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {schemaLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Introspecting database structure...</span>
                </div>
              )}

              {schemaData?.tables && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(schemaData.tables).map(([tableName, tableInfo]) => (
                    <div key={tableName} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                        <span className="font-mono text-xs font-bold text-emerald-400">{tableName}</span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                          {tableInfo.columns.length} columns
                        </span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-[11px]">
                        {tableInfo.columns.map((col, cIdx) => (
                          <div key={cIdx} className="flex items-center justify-between py-0.5 font-mono text-slate-300">
                            <span className="text-slate-200">{col.name}</span>
                            <span className="text-slate-500 text-[10px]">{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* External Database Connection Modal */}
      {showDbModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Connect External Database</h3>
                  <p className="text-xs text-slate-400">Query your own PostgreSQL or SQLite database</p>
                </div>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Database Connection URI</label>
                <input
                  type="text"
                  value={inputDbUri}
                  onChange={(e) => setInputDbUri(e.target.value)}
                  placeholder="postgresql://user:password@host:5432/dbname"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl p-3 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              {/* Sample URI Pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500">Supported Connection Formats:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    postgresql://username:password@host:port/database
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    sqlite:///path/to/database.db
                  </span>
                </div>
              </div>

              {/* Test Connection Button */}
              <button
                onClick={handleTestConnection}
                disabled={testingConnection || !inputDbUri.trim()}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Test Connectivity</span>
              </button>

              {/* Test Result Display */}
              {testResult && (
                <div className={`p-3.5 rounded-xl text-xs border ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/30 border-red-500/40 text-red-300'
                }`}>
                  {testResult.success ? (
                    <div className="space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Connection Successful!
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Vendor: <span className="uppercase font-mono text-emerald-400">{testResult.vendor}</span> • Found <span className="font-bold">{testResult.table_count}</span> tables.
                      </p>
                      {testResult.tables && (
                        <p className="text-[10px] text-slate-400 truncate">
                          Tables: {testResult.tables.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{testResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleApplyConnection}
                  disabled={!inputDbUri.trim()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Connect & Use Database
                </button>

                {activeDbUri && (
                  <button
                    onClick={handleResetConnection}
                    className="py-3 px-3.5 bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-900/50 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Switch back to default bundled demo database"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Reset to Default</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}