import { create } from 'zustand';
import axios from 'axios';

const storedToken = localStorage.getItem('token');
const storedRole = localStorage.getItem('role');
const storedUsername = localStorage.getItem('username');
const storedViewMode = localStorage.getItem('viewMode') || 'grid';

export const useAppStore = create((set, get) => ({
  token: storedToken,
  role: storedRole,
  username: storedUsername,
  isAuthenticated: !!storedToken,
  
  activePath: '',
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: storedViewMode,
  library: {
    files: {},
    stats: {
      totalFiles: 0,
      totalStorage: 0,
      totalVideos: 0,
      totalFolders: 0,
      recentlyAdded: []
    }
  },
  browseData: {
    currentPath: '',
    breadcrumbs: [],
    items: []
  },
  continueWatching: [],

  tunnelUrl: null,
  tunnelStatus: 'disconnected',
  clientsCount: 0,
  activeStreams: [],
  systemLogs: [],
  systemStats: {
    diskSpace: { total: 0, free: 0, used: 0 }
  },

  setAuth: (token, role, username) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username);
    set({ token, role, username, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    set({ token: null, role: null, username: null, isAuthenticated: false, browseData: { currentPath: '', breadcrumbs: [], items: [] } });
  },

  setActivePath: (activePath) => {
    set({ activePath });
    get().fetchFolderContents();
  },
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().fetchFolderContents();
  },
  setSort: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder });
    get().fetchFolderContents();
  },
  setViewMode: (viewMode) => {
    localStorage.setItem('viewMode', viewMode);
    set({ viewMode });
  },
  
  fetchFolderContents: async () => {
    const { token, activePath, searchQuery, sortBy, sortOrder } = get();
    if (!token) return;
    
    try {
      const response = await axios.get('/api/files/browse', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: activePath,
          search: searchQuery,
          sortBy,
          sortOrder
        }
      });
      set({ browseData: response.data });
    } catch (err) {
      console.error('Failed to fetch folder contents:', err);
      if (err.response && err.response.status === 401) {
        get().logout();
      }
    }
  },

  fetchStats: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await axios.get('/api/files/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ systemStats: response.data });
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    }
  },

  fetchContinueWatching: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await axios.get('/api/stream/continue-watching', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ continueWatching: response.data });
    } catch (err) {
      console.error('Failed to fetch continue watching list:', err);
    }
  },

  setLibrary: (library) => set({ library }),
  addLog: (log) => set((state) => ({ systemLogs: [log, ...state.systemLogs].slice(0, 300) })),
  setLogs: (systemLogs) => set({ systemLogs }),
  setTunnel: (tunnelStatus, tunnelUrl) => set({ tunnelStatus, tunnelUrl }),
  setClientsCount: (clientsCount) => set({ clientsCount }),
  setActiveStreams: (activeStreams) => set({ activeStreams })
}));
