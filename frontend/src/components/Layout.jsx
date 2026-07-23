import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Settings, 
  Terminal, 
  LogOut, 
  Menu, 
  X, 
  Radio, 
  Copy, 
  Check, 
  User, 
  Users, 
  ShieldAlert 
} from 'lucide-react';

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const role = useAppStore(state => state.role);
  const username = useAppStore(state => state.username);
  const logout = useAppStore(state => state.logout);
  const tunnelUrl = useAppStore(state => state.tunnelUrl);
  const tunnelStatus = useAppStore(state => state.tunnelStatus);
  const clientsCount = useAppStore(state => state.clientsCount);

  const isAdmin = role === 'admin';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'File Browser', path: '/browser', icon: FolderOpen, show: true },
    { name: 'Activity Logs', path: '/logs', icon: Terminal, show: isAdmin },
    { name: 'Settings', path: '/settings', icon: Settings, show: isAdmin },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const copyUrl = () => {
    if (tunnelUrl) {
      navigator.clipboard.writeText(tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
              <span className="font-display font-black text-lg">🎬</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 font-display">
              CinemaShare
            </span>
          </div>
          
          <nav className="mt-5 flex-1 px-4 space-y-1">
            {menuItems.filter(item => item.show).map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    active 
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-shrink-0 flex border-t border-slate-200 p-4 bg-slate-50/50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-955 truncate max-w-[120px]">{username}</p>
                <p className="text-xs text-slate-500 capitalize">{role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
              <span className="font-display font-black text-lg">🎬</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 font-display">
              CinemaShare
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-650 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.filter(item => item.show).map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                  active 
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/10' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="mr-4 h-6 w-6" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-6 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-955">{username}</p>
                <p className="text-xs text-slate-500 capitalize">{role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-all"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden md:pl-64">
        <header className="flex h-16 md:h-20 items-center justify-between px-6 md:px-8 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4 pl-12 md:pl-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                tunnelStatus === 'connected' 
                  ? 'bg-green-500 pulse-online' 
                  : tunnelStatus === 'connecting'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`} />
              <span className="hidden sm:inline text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {tunnelStatus === 'connected' ? 'Server Online' : tunnelStatus === 'connecting' ? 'Connecting Tunnel...' : 'Tunnel Offline'}
              </span>
            </div>

            {tunnelUrl && (
              <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50/40 py-1.5 px-3">
                <Radio className="h-4.5 w-4.5 text-brand-500 animate-pulse" />
                <span className="text-sm font-medium text-brand-600 select-all truncate max-w-[280px]">
                  {tunnelUrl}
                </span>
                <button
                  onClick={copyUrl}
                  className="p-1 rounded-md text-brand-400 hover:bg-brand-100 hover:text-brand-600 transition-colors"
                  title="Copy shareable link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-500" title="Connected Users">
              <Users className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-semibold">{clientsCount}</span>
            </div>
            
            {!isAdmin && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-100 text-xs font-medium" title="Read Only Mode">
                <ShieldAlert className="h-4 w-4" />
                <span className="hidden sm:inline">Guest Mode</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
