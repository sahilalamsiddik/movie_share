import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  FileVideo,
  Folder,
  Grid3X3,
  List,
  Play,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import VideoPlayer from '../components/VideoPlayer';

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (value) => {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
};

function Toolbar() {
  const searchQuery = useAppStore(state => state.searchQuery);
  const sortBy = useAppStore(state => state.sortBy);
  const sortOrder = useAppStore(state => state.sortOrder);
  const viewMode = useAppStore(state => state.viewMode);
  const setSearchQuery = useAppStore(state => state.setSearchQuery);
  const setSort = useAppStore(state => state.setSort);
  const setViewMode = useAppStore(state => state.setViewMode);
  const fetchFolderContents = useAppStore(state => state.fetchFolderContents);

  const toggleSortOrder = () => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search videos and folders"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sortBy}
          onChange={(event) => setSort(event.target.value, sortOrder)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none focus:border-brand-300"
        >
          <option value="name">Name</option>
          <option value="mtime">Modified</option>
          <option value="size">Size</option>
          <option value="type">Type</option>
        </select>
        <button
          onClick={toggleSortOrder}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${viewMode === 'grid' ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-500'}`}
          title="Grid view"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${viewMode === 'list' ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-500'}`}
          title="List view"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={fetchFolderContents}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const browseData = useAppStore(state => state.browseData);
  const setActivePath = useAppStore(state => state.setActivePath);

  const crumbs = browseData.breadcrumbs || [];

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-500">
      <button onClick={() => setActivePath('')} className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900">
        Library
      </button>
      {crumbs.map((crumb, index) => {
        const nextPath = crumbs.slice(0, index + 1).join('/');
        return (
          <React.Fragment key={nextPath}>
            <span className="text-slate-300">/</span>
            <button onClick={() => setActivePath(nextPath)} className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900">
              {crumb}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ItemActions({ item, onPlay }) {
  const token = useAppStore(state => state.token);
  const role = useAppStore(state => state.role);
  const fetchFolderContents = useAppStore(state => state.fetchFolderContents);

  const downloadUrl = item.isDirectory
    ? `/api/download/folder?path=${encodeURIComponent(item.relativePath)}&token=${token}`
    : `/api/download/file?path=${encodeURIComponent(item.relativePath)}&token=${token}`;

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${item.name}" from the library?`);
    if (!confirmed) return;

    await axios.delete('/api/files/delete', {
      headers: { Authorization: `Bearer ${token}` },
      params: { path: item.relativePath }
    });
    fetchFolderContents();
  };

  return (
    <div className="flex items-center gap-1">
      {!item.isDirectory && item.type === 'video' && (
        <button onClick={() => onPlay(item)} className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50" title="Play">
          <Play className="h-4 w-4" />
        </button>
      )}
      <a href={downloadUrl} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Download">
        <Download className="h-4 w-4" />
      </a>
      {role === 'admin' && (
        <button onClick={handleDelete} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function GridItem({ item, onOpen, onPlay }) {
  const isVideo = item.type === 'video';

  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <button onClick={() => onOpen(item)} className="mb-4 flex aspect-video w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="h-full w-full rounded-lg object-cover" />
        ) : item.isDirectory ? (
          <Folder className="h-12 w-12 text-amber-500" />
        ) : (
          <FileVideo className="h-12 w-12 text-brand-500" />
        )}
      </button>
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => onOpen(item)} className="min-w-0 text-left">
          <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {item.isDirectory ? 'Folder' : `${isVideo ? 'Video' : 'File'} - ${formatBytes(item.size)}`}
          </p>
        </button>
        <ItemActions item={item} onPlay={onPlay} />
      </div>
    </div>
  );
}

function ListItem({ item, onOpen, onPlay }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_110px_110px_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <button onClick={() => onOpen(item)} className="flex min-w-0 items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          {item.isDirectory ? <Folder className="h-5 w-5 text-amber-500" /> : <FileVideo className="h-5 w-5 text-brand-500" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-900">{item.name}</span>
          <span className="block truncate text-xs font-medium text-slate-500">{item.relativePath}</span>
        </span>
      </button>
      <span className="text-sm font-semibold text-slate-500">{item.isDirectory ? 'Folder' : formatBytes(item.size)}</span>
      <span className="text-sm font-semibold text-slate-500">{formatDate(item.mtime)}</span>
      <ItemActions item={item} onPlay={onPlay} />
    </div>
  );
}

export default function Browser() {
  const browseData = useAppStore(state => state.browseData);
  const viewMode = useAppStore(state => state.viewMode);
  const setActivePath = useAppStore(state => state.setActivePath);
  const fetchFolderContents = useAppStore(state => state.fetchFolderContents);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchFolderContents();
  }, [fetchFolderContents]);

  const items = useMemo(() => browseData.items || [], [browseData.items]);

  const handleOpen = (item) => {
    if (item.isDirectory) {
      setActivePath(item.relativePath);
    } else if (item.type === 'video') {
      setSelectedFile(item);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">File Browser</h1>
        <Breadcrumbs />
      </div>

      <Toolbar />

      {items.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center">
          <Folder className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No files found</p>
          <p className="mt-1 text-sm text-slate-500">Try a different folder or search term.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => (
            <GridItem key={item.relativePath} item={item} onOpen={handleOpen} onPlay={setSelectedFile} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {items.map((item) => (
            <ListItem key={item.relativePath} item={item} onOpen={handleOpen} onPlay={setSelectedFile} />
          ))}
        </div>
      )}

      {selectedFile && <VideoPlayer file={selectedFile} onClose={() => setSelectedFile(null)} />}
    </div>
  );
}
