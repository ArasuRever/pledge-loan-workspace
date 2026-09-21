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
  Clock,
  Sparkles,
  Scale
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

  const gold = stats?.metalBreakdown?.Gold || { loanCount: 0, totalPrincipal: 0, totalInterest: 0, totalGrossWeight: 0, totalNetWeight: 0 };
  const silver = stats?.metalBreakdown?.Silver || { loanCount: 0, totalPrincipal: 0, totalInterest: 0, totalGrossWeight: 0, totalNetWeight: 0 };
  const other = stats?.metalBreakdown?.Other || { loanCount: 0, totalPrincipal: 0, totalInterest: 0, totalGrossWeight: 0, totalNetWeight: 0 };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-slate-500">Live summary of active portfolio, disbursements, and collections.</p>
        </div>
        <Link
          to="/loans/new"
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-xs transition text-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Pledge Loan</span>
        </Link>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Principal Out</span>
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
            <span className="text-xs font-semibold uppercase tracking-wider">Total Interest Accrued</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            ₹{stats?.totalInterestAccrued ? stats.totalInterestAccrued.toLocaleString() : '0'}
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

      {/* Portfolio Breakdown by Metal Type (Separated Gross & Net Weights) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h3 className="text-base font-bold text-slate-900">Portfolio Breakdown by Metal Type</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gold Card */}
          <div className="bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  Au
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base leading-tight">Gold Portfolio</h4>
                  <p className="text-xs text-amber-700 font-semibold">{gold.loanCount} Active Loans</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Gold
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-100/60 text-sm">
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">Disbursed Principal</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  ₹{gold.totalPrincipal.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">Accrued Interest</p>
                <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                  ₹{gold.totalInterest.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Gold Gross & Net Weights */}
            <div className="space-y-1 text-xs text-slate-700 px-1 pt-1 border-t border-amber-100/60">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>Total Gold Gross:</span>
                </span>
                <span className="font-semibold text-slate-800">{gold.totalGrossWeight || 0} g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>Total Gold Net:</span>
                </span>
                <span className="font-black text-amber-900 text-sm">{gold.totalNetWeight || 0} g</span>
              </div>
            </div>
          </div>

          {/* Silver Card */}
          <div className="bg-gradient-to-br from-slate-100/70 via-white to-slate-50 p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-400 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  Ag
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base leading-tight">Silver Portfolio</h4>
                  <p className="text-xs text-slate-600 font-semibold">{silver.loanCount} Active Loans</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                Silver
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-sm">
              <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">Disbursed Principal</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  ₹{silver.totalPrincipal.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">Accrued Interest</p>
                <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                  ₹{silver.totalInterest.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Silver Gross & Net Weights */}
            <div className="space-y-1 text-xs text-slate-700 px-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Scale className="w-3.5 h-3.5 text-slate-500" />
                  <span>Total Silver Gross:</span>
                </span>
                <span className="font-semibold text-slate-800">{silver.totalGrossWeight || 0} g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Scale className="w-3.5 h-3.5 text-slate-500" />
                  <span>Total Silver Net:</span>
                </span>
                <span className="font-black text-slate-900 text-sm">{silver.totalNetWeight || 0} g</span>
              </div>
            </div>
          </div>

          {/* Other Articles Card */}
          <div className="bg-gradient-to-br from-blue-50/50 via-white to-blue-50/20 p-5 rounded-2xl border border-blue-200/70 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  Ot
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base leading-tight">Other Articles</h4>
                  <p className="text-xs text-blue-700 font-semibold">{other.loanCount} Active Loans</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                Other
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100/60 text-sm">
              <div className="bg-white/80 p-3 rounded-xl border border-blue-100 shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">Disbursed Principal</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  ₹{other.totalPrincipal.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-blue-100 shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">Accrued Interest</p>
                <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                  ₹{other.totalInterest.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-700 px-1 pt-1 border-t border-blue-100/60">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Scale className="w-3.5 h-3.5 text-blue-500" />
                  <span>Total Gross Weight:</span>
                </span>
                <span className="font-semibold text-slate-800">{other.totalGrossWeight || 0} g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Scale className="w-3.5 h-3.5 text-blue-500" />
                  <span>Total Net Weight:</span>
                </span>
                <span className="font-black text-slate-900 text-sm">{other.totalNetWeight || 0} g</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Status Breakdown */}
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

      {/* Recent Activity: Created vs Closed */}
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
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        #{loan.book_loan_number || loan.id}
                      </span>
                      <p className="text-sm font-semibold text-slate-800">{loan.customer_name}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pledged: {loan.event_date ? new Date(loan.event_date).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    ₹{parseFloat(loan.principal_amount || 0).toLocaleString()}
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
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        #{loan.book_loan_number || loan.id}
                      </span>
                      <p className="text-sm font-semibold text-slate-800">{loan.customer_name}</p>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      Settled: {loan.event_date ? new Date(loan.event_date).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">
                    ₹{parseFloat(loan.principal_amount || 0).toLocaleString()}
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