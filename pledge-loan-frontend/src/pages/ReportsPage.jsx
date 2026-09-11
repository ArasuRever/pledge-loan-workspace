import React, { useState } from 'react';
import api from '../services/api';
import { TrendingUp, DollarSign, ArrowDownLeft } from 'lucide-react';

export default function ReportsPage() {
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/api/reports/financial-summary?startDate=${startDate}&endDate=${endDate}`);
      setReport(res.data);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Performance Reports</h2>
        <p className="text-sm text-slate-500">Analyze interest earnings, principal turnover, and net profit over any date range.</p>
      </div>

      <form onSubmit={fetchReport} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm shadow-xs transition"
        >
          {loading ? "Calculating..." : "Generate Summary"}
        </button>
      </form>

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Interest Earnings</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600">
                ₹{report.totalInterest?.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">Gross interest collected</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Concessions / Discounts</span>
                <ArrowDownLeft className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-extrabold text-rose-600">
                ₹{report.totalDiscount?.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">Discounts allowed to clients</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Net Realized Profit</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">
                ₹{report.netProfit?.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">Interest minus discounts</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-800">Portfolio Capital Activity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Disbursed</p>
                <p className="text-xl font-bold text-rose-600 mt-1">
                  ₹{report.totalDisbursed?.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-semibold uppercase">Principal Repaid</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  ₹{report.totalPrincipalRepaid?.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-semibold uppercase">Loans Created</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {report.loansCreatedCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}