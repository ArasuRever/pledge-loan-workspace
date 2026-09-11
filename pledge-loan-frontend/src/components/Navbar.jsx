import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, LogOut, Building2, User, Menu } from 'lucide-react';
import api from '../services/api';
import QuickSearchModal from './QuickSearchModal';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({ business_name: 'Sri KuberaLakshmi Bankers' });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    api.get('/api/settings')
      .then((res) => { if (res.data) setSettings(res.data); })
      .catch((err) => console.error("Settings load error:", err));

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-9 h-9 object-contain rounded-md" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold">
                SK
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">
                {settings.business_name || "Sri KuberaLakshmi Bankers"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Pledge Loan System</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 rounded-xl text-sm transition"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Search loans or customers...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded border border-slate-300">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-xs font-medium text-amber-800">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>{user?.branchName || "Main Branch"}</span>
          </div>

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="flex items-center space-x-2 text-sm text-slate-700">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold border border-slate-200">
                {user?.username?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
              </div>
              <span className="hidden sm:inline font-medium">{user?.username}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {user?.role}
              </span>
            </div>

            <button onClick={logout} title="Logout" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <QuickSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}