import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RecycleBinPage() {
  const [items, setItems] = useState({ customers: [], loans: [] });
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  const fetchDeleted = async () => {
    try {
      const res = await api.get('/api/recycle-bin/deleted');
      setItems(res.data);
    } catch (err) {
      console.error("Recycle bin error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const handleRestoreCustomer = async (id) => {
    try {
      await api.post(`/api/customers/${id}/restore`);
      fetchDeleted();
    } catch (err) {
      alert("Failed to restore customer.");
    }
  };

  const handlePermanentDeleteCustomer = async (id) => {
    if (!window.confirm("PERMANENT DELETE: This will delete the customer and all related history irreversibly. Continue?")) return;
    try {
      await api.delete(`/api/customers/${id}/permanent-delete`);
      fetchDeleted();
    } catch (err) {
      alert("Failed to permanently delete.");
    }
  };

  const handleRestoreLoan = async (id) => {
    try {
      await api.post(`/api/loans/${id}/restore`);
      fetchDeleted();
    } catch (err) {
      alert("Failed to restore loan.");
    }
  };

  const handlePermanentDeleteLoan = async (id) => {
    if (!window.confirm("PERMANENT DELETE: This will remove this loan and its items permanently. Continue?")) return;
    try {
      await api.delete(`/api/loans/${id}/permanent-delete`);
      fetchDeleted();
    } catch (err) {
      alert("Failed to permanently delete.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recycle Bin</h2>
          <p className="text-sm text-slate-500">Restore soft-deleted records or purge permanently.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading recycled items...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-800">
              Deleted Customers ({items.customers?.length || 0})
            </div>
            {!items.customers || items.customers.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No deleted customers.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.customers.map((c) => (
                  <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone_number}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestoreCustomer(c.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handlePermanentDeleteCustomer(c.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                        >
                          Purge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-800">
              Deleted Loans ({items.loans?.length || 0})
            </div>
            {!items.loans || items.loans.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No deleted loans.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.loans.map((l) => (
                  <div key={l.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Loan #{l.book_loan_number}</p>
                      <p className="text-xs text-slate-400">{l.customer_name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestoreLoan(l.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handlePermanentDeleteLoan(l.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                        >
                          Purge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}