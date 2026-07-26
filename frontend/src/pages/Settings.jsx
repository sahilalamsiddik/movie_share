import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, FolderCog, Loader2, Network, RefreshCw, Save, Settings2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const defaults = {
  mediaRoot: '',
  port: 3001,
  tunnelService: 'cloudflare',
  cloudflareBinaryPath: '',
  allowGuestAccess: true,
  autoScan: true
};

function Field({ label, children, helper }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
      {helper && <span className="mt-1 block text-xs font-medium text-slate-500">{helper}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left"
    >
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

export default function Settings() {
  const token = useAppStore(state => state.token);
  const fetchStats = useAppStore(state => state.fetchStats);
  const [config, setConfig] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await axios.get('/api/config', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConfig({ ...defaults, ...response.data });
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load settings.');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [token]);

  const updateValue = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await axios.post('/api/config', {
        ...config,
        port: Number(config.port)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig({ ...defaults, ...response.data.config });
      setNotice(response.data.message || 'Settings saved.');
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    setError('');
    setNotice('');

    try {
      const response = await axios.post('/api/files/scan', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotice(response.data.message || 'Library scan started.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start scan.');
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Settings</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage library scanning and sharing behavior.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-bold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {(notice || error) && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          <CheckCircle2 className="h-4 w-4" />
          {error || notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FolderCog className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900">Library</h2>
                <p className="text-sm font-medium text-slate-500">Choose the folder CinemaShare indexes.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <Field label="Media Root" helper="Use an absolute path that exists on this machine.">
                <input
                  value={config.mediaRoot}
                  onChange={(event) => updateValue('mediaRoot', event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                />
              </Field>
              <Toggle checked={!!config.autoScan} onChange={(value) => updateValue('autoScan', value)} label="Automatically scan for library changes" />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                <Network className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900">Network</h2>
                <p className="text-sm font-medium text-slate-500">Configure local port and public tunnel provider.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Server Port">
                <input
                  type="number"
                  min="1024"
                  max="65535"
                  value={config.port}
                  onChange={(event) => updateValue('port', event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                />
              </Field>
              <Field label="Tunnel Service">
                <select
                  value={config.tunnelService}
                  onChange={(event) => updateValue('tunnelService', event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                >
                  <option value="cloudflare">Cloudflare Tunnel</option>
                  <option value="none">Disabled</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Cloudflare Binary Path" helper="Leave blank when cloudflared is available from PATH.">
                  <input
                    value={config.cloudflareBinaryPath || ''}
                    onChange={(event) => updateValue('cloudflareBinaryPath', event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Settings2 className="h-5 w-5" />
              </span>
              <h2 className="text-base font-black text-slate-900">Access</h2>
            </div>
            <Toggle checked={!!config.allowGuestAccess} onChange={(value) => updateValue('allowGuestAccess', value)} label="Allow guest read-only access" />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-900">Library Scan</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Refresh metadata, folders, and thumbnails after changing your media files.</p>
            <button
              type="button"
              onClick={runScan}
              disabled={scanning}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run Scan
            </button>
          </section>
        </aside>
      </div>
    </form>
  );
}
