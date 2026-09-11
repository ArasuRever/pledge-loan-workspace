import React, { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';

export default function AddPrincipalModal({ isOpen, onClose, loan, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/api/loans/${loan.id}/add-principal`, { additionalAmount: val });
      setAmount('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add principal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Principal - Loan #${loan?.book_loan_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
          <p className="text-slate-500">Current Principal Balance:</p>
          <p className="text-lg font-bold text-slate-800">₹{parseFloat(loan?.principal_amount || 0).toLocaleString()}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            Additional Amount (₹) *
          </label>
          <input
            type="number"
            step="any"
            required
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-amber-500 text-base"
          />
        </div>
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl">
            {loading ? "Adding..." : "Disburse Principal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}