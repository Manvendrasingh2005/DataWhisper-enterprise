import { useState } from 'react';
import { Search, Database, AlertCircle, Loader2, Code2, BarChart2, Download, Sparkles, ChevronRight, Table, Lock, User, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function App() {

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard State
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [showSql, setShowSql] = useState(false);

  const SUGGESTED_PROMPTS = [
    "Calculate the net profit margin by product category.",
    "Show me the top 5 corporate clients by total order volume.",
    "Which suppliers have inventory dropping below 50 units?",
    "What is the failure rate of our UPI transactions?"
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/`, {
// ...
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Invalid credentials');
      
      localStorage.setItem('access_token', data.access);
      setToken(data.access);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setResults(null);
  };

  const askDataWhisper = async (queryToRun) => {
    const textToSearch = typeof queryToRun === 'string' ? queryToRun : prompt;
    if (!textToSearch.trim()) return;
    
    setPrompt(textToSearch);
    setLoading(true);
    setError(null);
    setShowSql(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ask/`, {
// ...// Ensure this URL matches your setup
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // The secure JWT header
        },
        body: JSON.stringify({ question: textToSearch }),
      });
      
      const data = await response.json();
      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch data');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rest of your helper functions (downloadCSV, getNumericColumn) remain the same
  const downloadCSV = () => {
    if (!results || !results.rows.length) return;
    const headers = results.columns.join(',');
    const csvData = results.rows.map(row => 
      results.columns.map(col => `"${row[col] || ''}"`).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvData}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'datawhisper_report.csv';
    a.click();
  };

  const getNumericColumn = (columns, rows) => {
    if (!rows || rows.length === 0) return null;
    return columns.find(col => typeof rows[0][col] === 'number') || columns[1];
  };

  // --- LOGIN SCREEN RENDER ---
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-slate-900/80 border border-slate-800/60 rounded-2xl shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-lg shadow-emerald-500/10 mb-4">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">DataWhisper Login</h1>
            <p className="text-slate-400 text-sm mt-1">Enterprise Analytics Portal</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm text-center">
                {authError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-medium transition-all shadow-lg shadow-emerald-600/20 mt-4">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD RENDER (Same as before, just adding a logout button to the header) ---
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-lg shadow-emerald-500/10">
              <Database className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                DataWhisper <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 tracking-wider uppercase border border-emerald-500/30">Enterprise</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">AI-Powered Business Intelligence Platform</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center space-x-2 text-sm text-slate-400 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Search Engine */}
        <div className="space-y-4">
          <form onSubmit={askDataWhisper} className="relative group">
            <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-xl group-hover:bg-emerald-500/10 transition-all duration-500"></div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask your database a question..."
              className="relative w-full bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl py-5 pl-6 pr-16 text-lg focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-600 shadow-2xl"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !prompt.trim()} className="absolute right-4 top-4 p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>

          {!results && !loading && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="flex items-center text-sm text-slate-500 font-medium mr-2">
                <Sparkles className="w-4 h-4 mr-1.5 text-emerald-500" /> Try asking:
              </span>
              {SUGGESTED_PROMPTS.map((suggestion, idx) => (
                <button key={idx} onClick={() => askDataWhisper(suggestion)} className="text-xs px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 rounded-full transition-colors">
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start space-x-3 p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Analytics Display (Charts and Tables identical to previous code) */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800/60 p-4 rounded-xl backdrop-blur-sm">
              <button onClick={() => setShowSql(!showSql)} className="flex items-center space-x-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors group">
                <Code2 className="w-4 h-4" />
                <span className="font-medium">View Execution Logic</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showSql ? 'rotate-90' : ''}`} />
              </button>
              <button onClick={downloadCSV} className="flex items-center space-x-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg border border-slate-700 transition-all shadow-sm">
                <Download className="w-4 h-4" />
                <span className="font-medium">Export CSV</span>
              </button>
            </div>

            {showSql && (
              <div className="p-5 bg-[#0d1527] border border-slate-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Generated PostgreSQL</div>
                <code className="text-emerald-400/90 font-mono text-sm break-all">{results.sql}</code>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {results.rows.length > 0 && results.columns.length >= 2 && (
                <div className="lg:col-span-2 p-6 bg-slate-900/50 border border-slate-800/60 rounded-xl backdrop-blur-sm h-[400px] flex flex-col shadow-xl">
                  <div className="flex items-center space-x-2 mb-6 text-slate-400">
                    <BarChart2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Visual Analytics</h3>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results.rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey={results.columns[0]} stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} />
                        <Tooltip cursor={{fill: '#1e293b', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} itemStyle={{ color: '#34d399', fontWeight: 600 }} />
                        <Bar dataKey={getNumericColumn(results.columns, results.rows)} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className={`${(results.rows.length > 0 && results.columns.length >= 2) ? 'lg:col-span-1' : 'col-span-1 lg:col-span-3'} overflow-hidden border border-slate-800/60 rounded-xl bg-slate-900/50 backdrop-blur-sm shadow-xl flex flex-col max-h-[400px]`}>
                <div className="p-4 border-b border-slate-800/60 bg-slate-900/80 flex items-center space-x-2">
                  <Table className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Data Records</h3>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/80 sticky top-0 backdrop-blur-md z-10">
                      <tr>
                        {results.columns.map((col, index) => (
                          <th key={index} className="px-5 py-3 font-semibold text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800">{col.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {results.rows.length === 0 ? (
                        <tr>
                          <td colSpan={results.columns.length} className="px-5 py-8 text-center text-slate-500 italic">No records found.</td>
                        </tr>
                      ) : (
                        results.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-slate-800/40 transition-colors group">
                            {results.columns.map((col, colIndex) => {
                              const val = row[col];
                              return (
                                <td key={colIndex} className="px-5 py-3 whitespace-nowrap text-slate-300 group-hover:text-white transition-colors">
                                  {typeof val === 'number' ? val.toLocaleString() : (val?.toString() || '-')}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;