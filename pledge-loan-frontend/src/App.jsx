import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import AllLoansPage from './pages/AllLoansPage';
import LoanDetailPage from './pages/LoanDetailPage';
import NewLoanPage from './pages/NewLoanPage';
import OverdueLoansPage from './pages/OverdueLoansPage';
import DayBookPage from './pages/DayBookPage';
import ReportsPage from './pages/ReportsPage';
import ManageBranchesPage from './pages/ManageBranchesPage';
import ManageStaffPage from './pages/ManageStaffPage';
import BusinessSettingsPage from './pages/BusinessSettingsPage';
import RecycleBinPage from './pages/RecycleBinPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        Initializing application...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/loans" element={<AllLoansPage />} />
            <Route path="/loans/new" element={<NewLoanPage />} />
            <Route path="/loans/overdue" element={<OverdueLoansPage />} />
            <Route path="/loans/:id" element={<LoanDetailPage />} />
            <Route path="/day-book" element={<DayBookPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/branches" element={<ManageBranchesPage />} />
            <Route path="/staff" element={<ManageStaffPage />} />
            <Route path="/settings" element={<BusinessSettingsPage />} />
            <Route path="/recycle-bin" element={<RecycleBinPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}