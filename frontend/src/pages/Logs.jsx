import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Download, Filter, RefreshCw, Search, Terminal } from 'lucide-react';
import { useAppStore } from '../store/appStore';

function normalizeLog(log, index) {
  if (typeof log === 'string') {
    return {
      id: `${index}-${log}`,
      timestamp: null,
      source: 'System',
      message: log,
      level: 'info'
    };
  }

  return {
    id: log.id || `${index}-${log.timestamp || ''}-${log.message || ''}`,
    timestamp: log.timestamp || log.time || null,
    source: log.source || log.type || 'System',
    message: log.message || log.text || JSON.stringify(log),
    level: log.level || 'info'
  };
}

function formatTimestamp(value) {
  if (!value) return 'Live';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function levelClass(level) {
  if (level === 'error') return 'bg-red-50 text-red-700 border-red-100';
  if (level === 'warn' || level === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function Logs() {
  const token = useAppStore(state => state.token);
  const systemLogs = useAppStore(state => state.systemLogs);
  const setLogs = useAppStore(state => state.setLogs);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const logs = useMemo(() => systemLogs.map(normalizeLog), [systemLogs]);
  const sources = useMemo(() => ['all', ...Array.from(new Set(logs.map(log => log.source))).sort()], [logs]);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter(log => {
      const matchesSource = source === 'all' || log.source === source;
      const matchesQuery = !needle || `${log.source} ${log.level} ${log.message}`.toLowerCase().includes(needle);
      return matchesSource && matchesQuery;
    });
  }, [logs, query, source]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get('/api/files/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to refresh logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (logs.length === 0) {
      loadLogs();
    }
  }, []);

  const exportLogs = () => {
    const payload = filteredLogs
      .map(log => `[${formatTimestamp(log.timestamp)}] ${log.source} ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cinemashare-logs.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Activity Logs</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Monitor scanner, tunnel, streaming, and admin events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            title="Export logs"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity"
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-medium outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none focus:border-brand-300"
          >
            {sources.map(item => (
              <option key={item} value={item}>{item === 'all' ? 'All Sources' : item}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="h-4 w-4 text-brand-300" />
            System Activity
          </div>
          <span className="text-xs font-semibold text-slate-400">{filteredLogs.length} entries</span>
        </div>

        <div className="max-h-[calc(100vh-280px)] min-h-[360px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm font-semibold text-slate-400">
              No log entries match the current filters.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <div key={log.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[150px_110px_80px_minmax(0,1fr)]">
                  <span className="font-mono text-xs text-slate-500">{formatTimestamp(log.timestamp)}</span>
                  <span className="font-semibold text-slate-300">{log.source}</span>
                  <span className={`w-fit rounded-md border px-2 py-0.5 text-xs font-black uppercase ${levelClass(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="break-words font-medium text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
