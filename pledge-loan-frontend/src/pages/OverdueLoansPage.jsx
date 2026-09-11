import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AlertTriangle, Phone, ArrowRight } from 'lucide-react';

export default function OverdueLoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/loans/overdue')
      .then((res) => setLoans(res.data || []))
      .catch((err) => console.error("Overdue fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overdue Loans ({loans.length})</h2>
          <p className="text-sm text-slate-500">Loans past maturity requiring notice, settlement, or renewal.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Checking overdue loans...</div>
        ) : loans.length === 0 ? (
          <div className="py-12 text-center text-emerald-600 text-sm font-medium">
            No overdue loans found! All accounts are up to date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-rose-50/50 border-b border-rose-100 text-xs font-semibold text-rose-800 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Loan #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5 text-right">Principal</th>
                  <th className="p-3.5">Pledge Date</th>
                  <th className="p-3.5">Maturity Date</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-rose-50/30 transition">
                    <td className="p-3.5 font-bold text-rose-700">#{l.book_loan_number}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{l.customer_name}</td>
                    <td className="p-3.5 text-xs text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{l.phone_number}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      ₹{parseFloat(l.principal_amount).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-xs text-slate-500">
                      {new Date(l.pledge_date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-rose-600">
                      {new Date(l.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/loans/${l.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                      >
                        <span>Open & Settle</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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