import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PlusCircle, Search, Filter, ArrowUpRight } from 'lucide-react';

export default function AllLoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.get('/api/loans')
      .then((res) => setLoans(res.data || []))
      .catch((err) => console.error("Loans fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLoans = loans.filter((l) => {
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesSearch =
      l.book_loan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone_number?.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Pledge Loans Directory</h2>
          <p className="text-sm text-slate-500">Track all active, overdue, and settled pawn pledge accounts.</p>
        </div>
        <Link
          to="/loans/new"
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-xs transition text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Pledge Loan</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by loan #, customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="overdue">Overdue Only</option>
            <option value="paid">Paid & Settled</option>
            <option value="forfeited">Forfeited</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading loans...</div>
        ) : filteredLoans.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No matching loan records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Loan #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5 text-right">Principal</th>
                  <th className="p-3.5">Pledge Date</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredLoans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-amber-700">#{l.book_loan_number}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{l.customer_name}</td>
                    <td className="p-3.5 text-xs text-slate-500">{l.phone_number}</td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      ₹{parseFloat(l.principal_amount).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-xs text-slate-500">
                      {new Date(l.pledge_date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-xs text-slate-500">
                      {new Date(l.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        l.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                        l.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/loans/${l.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}