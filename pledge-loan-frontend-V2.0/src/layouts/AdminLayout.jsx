// src/layouts/AdminLayout.jsx
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* Collapsible Sidebar */}
      <aside 
        className={`bg-white shadow-md transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        } flex flex-col`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {isSidebarOpen && <span className="font-bold text-xl text-gray-800">Pledge Loan</span>}
          {/* Hamburger Icon */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {/* Navigation Links will go here */}
          <a href="#" className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <span>🏠</span>
            {isSidebarOpen && <span>Dashboard</span>}
          </a>
          <a href="#" className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <span>👥</span>
            {isSidebarOpen && <span>Customers</span>}
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-xl font-semibold">Management Console</h1>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
      
    </div>
  );
}