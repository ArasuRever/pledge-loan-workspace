import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Printer, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function DayBookPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dayBook, setDayBook] = useState({ openingBalance: 0, transactions: [] });
  const [loading, setLoading] = useState(false);

  const fetchDayBook = async (date) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/reports/day-book?date=${date}`);
      setDayBook(res.data);
    } catch (err) {
      console.error("Day book fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayBook(selectedDate);
  }, [selectedDate]);

  const totalInward = dayBook.transactions
    ?.filter(t => ['interest', 'principal', 'settlement', 'sale'].includes(t.payment_type))
    .reduce((s, t) => s + parseFloat(t.amount_paid), 0) || 0;

  const totalOutward = dayBook.transactions
    ?.filter(t => t.payment_type === 'disbursement')
    .reduce((s, t) => s + parseFloat(t.amount_paid), 0) || 0;

  const closingBalance = (dayBook.openingBalance || 0) + totalInward - totalOutward;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Cash Day Book</h2>
          <p className="text-sm text-slate-500">Chronological daily log of cash flows, collections, and disbursements.</p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-3.5 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <p className="text-xs text-slate-400 font-semibold uppercase">Opening Balance</p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            ₹{(dayBook.openingBalance || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <p className="text-xs text-emerald-600 font-semibold uppercase flex items-center justify-center space-x-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Total Inward</span>
          </p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            +₹{totalInward.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <p className="text-xs text-rose-600 font-semibold uppercase flex items-center justify-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Total Outward</span>
          </p>
          <p className="text-xl font-extrabold text-rose-600 mt-1">
            -₹{totalOutward.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <p className="text-xs text-slate-500 font-semibold uppercase">Closing Balance</p>
          <p className="text-xl font-black text-slate-900 mt-1">
            ₹{closingBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            Transactions for {new Date(selectedDate).toLocaleDateString()}
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {dayBook.transactions?.length || 0} entries
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading day book entries...</div>
        ) : !dayBook.transactions || dayBook.transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No cash transactions recorded for this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Loan #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Transaction Type</th>
                  <th className="p-3.5 text-right">Inward (+)</th>
                  <th className="p-3.5 text-right">Outward (-)</th>
                  <th className="p-3.5">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {dayBook.transactions.map((t) => {
                  const isInward = ['interest', 'principal', 'settlement', 'sale'].includes(t.payment_type);
                  const isOutward = t.payment_type === 'disbursement';
                  const amt = parseFloat(t.amount_paid);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-xs text-slate-500">
                        {new Date(t.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5 font-bold text-amber-700">#{t.book_loan_number}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{t.customer_name}</td>
                      <td className="p-3.5 uppercase text-xs">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          isInward ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.payment_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">
                        {isInward ? `+₹${amt.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-600">
                        {isOutward ? `-₹${amt.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500">{t.changed_by_username || 'Staff'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}