import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { Calendar, User } from 'lucide-react';

export default function LoanHistoryModal({ isOpen, onClose, loanId, bookLoanNumber }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && loanId) {
      setLoading(true);
      api.get(`/api/loans/${loanId}/history`)
        .then((res) => setHistory(res.data || []))
        .catch((err) => console.error("History fetch error:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, loanId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Audit Trail - Loan #${bookLoanNumber}`} maxWidth="max-w-2xl">
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading audit history...</div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">No activity recorded yet.</div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-5 my-2">
          {history.map((item, idx) => (
            <div key={idx} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                item.event_type === 'transaction' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(item.changed_at).toLocaleString()}</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-600 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{item.changed_by_username || 'System'}</span>
                  </span>
                </div>
                {item.event_type === 'transaction' ? (
                  <p className="text-sm font-semibold text-slate-800">
                    Payment: <span className="text-emerald-600">₹{parseFloat(item.amount_paid || 0).toLocaleString()}</span> ({item.payment_type})
                  </p>
                ) : (
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-800">{item.field_changed}</span> changed from{' '}
                    <span className="line-through text-slate-400">{item.old_value || 'null'}</span> to{' '}
                    <span className="font-medium text-amber-700">{item.new_value}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}