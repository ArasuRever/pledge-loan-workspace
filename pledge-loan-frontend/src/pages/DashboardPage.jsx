import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Banknote, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  ArrowUpRight,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentCreated, setRecentCreated] = useState([]);
  const [recentClosed, setRecentClosed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, createdRes, closedRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/loans/recent/created'),
        api.get('/api/loans/recent/closed')
      ]);
      setStats(statsRes.data);
      setRecentCreated(createdRes.data || []);
      setRecentClosed(closedRes.data || []);
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading dashboard metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-slate-500">Live summary of active portfolio, disbursements, and collections.</p>
        </div>
        <Link
          to="/loans/new"
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-xs transition text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Pledge Loan</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Principal Outstanding</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            ₹{stats?.totalPrincipalOut ? stats.totalPrincipalOut.toLocaleString() : '0'}
          </p>
          <p className="text-xs text-slate-400">{stats?.totalActiveLoans || 0} active loans</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Interest Accrued</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            ₹{stats?.totalInterestAccrued ? Math.round(stats.totalInterestAccrued).toLocaleString() : '0'}
          </p>
          <p className="text-xs text-slate-400">Total expected collection</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Loans</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600">
            {stats?.totalOverdueLoans || 0}
          </p>
          <Link to="/loans/overdue" className="text-xs text-rose-500 hover:underline flex items-center space-x-1">
            <span>View overdue loans</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Customers</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats?.totalCustomers || 0}
          </p>
          <Link to="/customers" className="text-xs text-blue-600 hover:underline flex items-center space-x-1">
            <span>Manage customer list</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-base font-bold text-slate-800 mb-4">Portfolio Status Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-xl font-bold text-slate-900">{stats?.loansActive || 0}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <p className="text-xs text-rose-600 font-medium">Overdue</p>
            <p className="text-xl font-bold text-rose-700">{stats?.loansOverdue || 0}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <p className="text-xs text-emerald-600 font-medium">Paid & Settled</p>
            <p className="text-xl font-bold text-emerald-700">{stats?.loansPaid || 0}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-700 font-medium">Forfeited</p>
            <p className="text-xl font-bold text-amber-800">{stats?.loansForfeited || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-slate-800">Recently Disbursed Loans</h3>
            </div>
            <Link to="/loans" className="text-xs font-semibold text-amber-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCreated.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No recent disbursements.</p>
            ) : (
              recentCreated.map((loan) => (
                <Link
                  key={loan.id}
                  to={`/loans/${loan.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{loan.customer_name}</p>
                    <p className="text-xs text-slate-400">Loan ID: #{loan.id}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    ₹{parseFloat(loan.principal_amount).toLocaleString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Recently Settled Loans</h3>
            </div>
            <Link to="/loans" className="text-xs font-semibold text-emerald-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentClosed.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No recent settlements.</p>
            ) : (
              recentClosed.map((loan) => (
                <Link
                  key={loan.id}
                  to={`/loans/${loan.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{loan.customer_name}</p>
                    <p className="text-xs text-emerald-600 font-medium">Settled</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    ₹{parseFloat(loan.principal_amount).toLocaleString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}