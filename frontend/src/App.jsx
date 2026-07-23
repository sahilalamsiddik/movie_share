import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAppStore } from './store/appStore';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Placeholder pages to allow routing to succeed (will be implemented in Day 4)
const Browser = () => <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><h2 className="text-xl font-bold">File Browser (Coming in Day 4)</h2></div>;
const Settings = () => <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><h2 className="text-xl font-bold">Settings Panel (Coming in Day 4)</h2></div>;
const Logs = () => <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><h2 className="text-xl font-bold">Activity Terminal (Coming in Day 4)</h2></div>;

function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const role = useAppStore(state => state.role);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function SocketInitializer({ children }) {
  const token = useAppStore(state => state.token);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const setTunnel = useAppStore(state => state.setTunnel);
  const addLog = useAppStore(state => state.addLog);
  const setLogs = useAppStore(state => state.setLogs);
  const setClientsCount = useAppStore(state => state.setClientsCount);
  const setActiveStreams = useAppStore(state => state.setActiveStreams);
  const setLibrary = useAppStore(state => state.setLibrary);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io(window.location.origin);

    socket.on('connect', () => {
      console.log('Socket.IO connected to backend.');
      socket.emit('identify', { username: useAppStore.getState().username });
    });

    socket.on('tunnel-status', (data) => {
      setTunnel(data.status, data.url);
    });

    socket.on('new-log', (log) => {
      addLog(log);
    });

    socket.on('initial-logs', (logs) => {
      setLogs(logs);
    });

    socket.on('clients-count', (count) => {
      setClientsCount(count);
    });

    socket.on('active-streams-updated', (streams) => {
      setActiveStreams(streams);
    });

    socket.on('library-updated', (libraryData) => {
      setLibrary(libraryData);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketInitializer>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/browser" element={
            <ProtectedRoute>
              <Layout>
                <Browser />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <AdminRoute>
              <Layout>
                <Settings />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/logs" element={
            <AdminRoute>
              <Layout>
                <Logs />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SocketInitializer>
    </BrowserRouter>
  );
}
