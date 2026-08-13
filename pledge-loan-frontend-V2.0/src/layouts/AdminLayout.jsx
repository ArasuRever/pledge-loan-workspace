// src/layouts/AdminLayout.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800">
      
      {/* Collapsible Sidebar */}
      <aside 
        className={`bg-white shadow-lg transition-all duration-300 flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="h-16 border-b flex items-center justify-between px-4">
          {isSidebarOpen && <span className="font-bold text-xl text-amber-600 truncate">Sri Kubera</span>}
          {/* Hamburger Icon */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          <Link to="/" className="flex items-center space-x-3 p-2 hover:bg-amber-50 text-gray-700 rounded-md transition-colors">
            <span className="text-xl">📊</span>
            {isSidebarOpen && <span className="font-medium">Dashboard</span>}
          </Link>
          <Link to="/customers" className="flex items-center space-x-3 p-2 hover:bg-amber-50 text-gray-700 rounded-md transition-colors">
            <span className="text-xl">👥</span>
            {isSidebarOpen && <span className="font-medium">Customers</span>}
          </Link>
          <Link to="/loans" className="flex items-center space-x-3 p-2 hover:bg-amber-50 text-gray-700 rounded-md transition-colors">
            <span className="text-xl">💰</span>
            {isSidebarOpen && <span className="font-medium">Loans</span>}
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center px-6">
          <h1 className="text-xl font-semibold text-gray-800">Management Console</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
      
    </div>
  );
}