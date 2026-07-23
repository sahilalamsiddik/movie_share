import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { 
  FileText, 
  Video, 
  Folder, 
  HardDrive, 
  Radio, 
  QrCode, 
  Copy, 
  Check, 
  Users, 
  Play, 
  Clock, 
  RefreshCw, 
  Activity 
} from 'lucide-react';

export default function Dashboard() {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const token = useAppStore(state => state.token);
  const role = useAppStore(state => state.role);
  const library = useAppStore(state => state.library);
  const tunnelUrl = useAppStore(state => state.tunnelUrl);
  const tunnelStatus = useAppStore(state => state.tunnelStatus);
  const clientsCount = useAppStore(state => state.clientsCount);
  const activeStreams = useAppStore(state => state.activeStreams);
  const continueWatching = useAppStore(state => state.continueWatching);
  const systemStats = useAppStore(state => state.systemStats);
  
  const fetchStats = useAppStore(state => state.fetchStats);
  const fetchContinueWatching = useAppStore(state => state.fetchContinueWatching);
  const setActivePath = useAppStore(state => state.setActivePath);

  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchStats();
    fetchContinueWatching();
    
    const interval = setInterval(() => {
      fetchStats();
      fetchContinueWatching();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const copyTunnelUrl = () => {
    if (tunnelUrl) {
      navigator.clipboard.writeText(tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManualScan = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await axios.post('/api/files/scan', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1500);
    }
  };

  const toggleTunnelSharing = async () => {
    if (!isAdmin) return;
    try {
      const nextService = tunnelStatus === 'connected' ? 'none' : 'localtunnel';
      await axios.post('/api/config', { tunnelService: nextService }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Toggle tunnel failed:', err);
    }
  };

  const playFile = (file) => {
    const parts = file.relativePath.split('/');
    parts.pop();
    const parentFolder = parts.join('/');
    setActivePath(parentFolder);
    navigate(`/browser?play=${encodeURIComponent(file.relativePath)}`);
  };

  const disk = systemStats.diskSpace || { total: 0, free: 0, used: 0 };
  const diskPercentage = disk.total > 0 ? ((disk.used / disk.total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Media Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            System status, disk usage, active streams, and recent uploads.
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleManualScan}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4.5 w-4.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Library
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Radio className={`h-5 w-5 ${tunnelStatus === 'connected' ? 'text-brand-500 animate-pulse' : 'text-slate-400'}`} />
                <h3 className="font-display font-bold text-slate-950">Public Shareable Link</h3>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                tunnelStatus === 'connected' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : tunnelStatus === 'connecting'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {tunnelStatus === 'connected' ? 'Active' : tunnelStatus === 'connecting' ? 'Connecting...' : 'Disabled'}
              </span>
            </div>

            {tunnelUrl ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Send this link to your friends. They will be able to stream and download files securely from their browsers.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 select-all overflow-hidden truncate">
                    {tunnelUrl}
                  </div>
                  <button
                    onClick={copyTunnelUrl}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                    title="Copy Link"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-650" /> : <Copy className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className={`p-3.5 rounded-xl border border-slate-200 transition-colors shadow-sm ${showQr ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white hover:bg-slate-50 text-slate-600'}`}
                    title="Toggle QR Code"
                  >
                    <QrCode className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6">
                <p className="text-sm text-slate-500 mb-2">
                  Public tunnel sharing is currently offline. No public links are active.
                </p>
              </div>
            )}
          </div>

          {showQr && tunnelUrl && (
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6 border-t border-slate-100 pt-6 animate-slideDown">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <QRCodeSVG value={tunnelUrl} size={128} />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-bold text-slate-900">Scan QR Code</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Scan this code on your phone or tablet to open and test streaming from your mobile device immediately.
                </p>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="border-t border-slate-100 pt-5 mt-6 flex justify-end">
              <button
                onClick={toggleTunnelSharing}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                  tunnelStatus === 'connected'
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                    : 'bg-brand-500 hover:bg-brand-600 text-white'
                }`}
              >
                {tunnelStatus === 'connected' ? 'Disable Sharing' : 'Enable Sharing'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <HardDrive className="h-5 w-5 text-slate-500" />
              <h3 className="font-display font-bold text-slate-950">Storage Drive</h3>
            </div>
            
            {disk.total > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Used Space</span>
                  <span className="text-slate-900 font-bold">{diskPercentage}% ({formatBytes(disk.used)} of {formatBytes(disk.total)})</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${diskPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Free: {formatBytes(disk.free)}</span>
                  <span>Total size: {formatBytes(disk.total)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic py-6">
                Disk storage details unavailable.
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{systemStats.totalFiles || library.stats.totalFiles}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Files</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{systemStats.totalFolders || library.stats.totalFolders}</p>
              <p className="text-xs text-slate-500 mt-0.5">Folders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Video Files</p>
            <p className="text-xl font-bold text-slate-955 mt-0.5">{systemStats.totalVideos || library.stats.totalVideos}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Media Folder</p>
            <p className="text-sm font-bold text-slate-955 mt-0.5 truncate max-w-[150px]" title={systemStats.mediaRoot}>
              {systemStats.mediaRoot ? systemStats.mediaRoot.split('\\').pop() : 'Movies'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Used</p>
            <p className="text-xl font-bold text-slate-955 mt-0.5">{formatBytes(systemStats.totalStorage || library.stats.totalStorage)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Users</p>
            <p className="text-xl font-bold text-slate-955 mt-0.5">{clientsCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-brand-500" />
            <h3 className="font-display font-bold text-slate-950">Active Stream Sessions</h3>
          </div>
          
          {activeStreams.length > 0 ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {activeStreams.map((stream, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{stream.username}</span>
                    <span className="text-xs text-slate-500 font-mono">{stream.ip}</span>
                  </div>
                  <p className="text-slate-600 font-medium truncate" title={stream.file}>
                    {stream.file.split('/').pop()}
                  </p>
                  <p className="text-xs text-brand-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Streaming since {new Date(stream.startedAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Video className="h-8 w-8 stroke-[1.5] mb-2" />
              <p className="text-sm">No active media stream sessions.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-brand-500" />
            <h3 className="font-display font-bold text-slate-950">Continue Watching</h3>
          </div>

          {continueWatching.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {continueWatching.map((item, idx) => {
                const percent = ((item.time / item.duration) * 100).toFixed(0);
                const filename = item.relativePath.split('/').pop();
                return (
                  <div 
                    key={idx} 
                    onClick={() => playFile(item)}
                    className="group border border-slate-200 rounded-2xl overflow-hidden hover:border-brand-500 bg-slate-50 hover:bg-white cursor-pointer transition-all duration-200"
                  >
                    <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                      <img 
                        src={`/api/stream/thumbnail?path=${encodeURIComponent(item.relativePath)}&token=${token}`}
                        alt={filename}
                        className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                        <div className="p-3 bg-brand-500 rounded-full text-white shadow-lg">
                          <Play className="h-6 w-6 fill-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 text-white text-xs">
                        <span className="font-mono bg-black/55 px-1.5 py-0.5 rounded">
                          {Math.floor(item.time / 60)}m / {Math.floor(item.duration / 60)}m
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-slate-900 truncate" title={filename}>
                        {filename}
                      </p>
                      <div className="mt-2.5 space-y-1">
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-brand-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="flex justify-between text-xxs text-slate-500 font-medium">
                          <span>{percent}% watched</span>
                          <span>Resume</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <Play className="h-10 w-10 stroke-[1.5] mb-2" />
              <p className="text-sm">Your resume history is empty.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
