import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';

export default function SettleLoanModal({ isOpen, onClose, loan, calculated, onSuccess }) {
  const [discountAmount, setDiscountAmount] = useState('0');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const outstandingPrincipal = calculated?.outstandingPrincipal || 0;
  const outstandingInterest = calculated?.outstandingInterest || 0;
  const totalDue = calculated?.amountDue || (outstandingPrincipal + outstandingInterest);

  useEffect(() => {
    if (isOpen) {
      setDiscountAmount('0');
      setSettlementAmount(totalDue.toString());
      setError('');
    }
  }, [isOpen, totalDue]);

  const handleDiscountChange = (val) => {
    setDiscountAmount(val);
    const disc = parseFloat(val) || 0;
    setSettlementAmount(Math.max(0, totalDue - disc).toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const discount = parseFloat(discountAmount) || 0;
    const payment = parseFloat(settlementAmount) || 0;

    if (discount + payment < totalDue - 1.0) {
      setError(`Total settlement is insufficient. Total due is ₹${totalDue}`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post(`/api/loans/${loan.id}/settle`, {
        discountAmount: discount,
        settlementAmount: payment
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to settle loan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Settle & Close Loan #${loan?.book_loan_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <div>
            <p className="text-xs text-slate-500">Principal Due</p>
            <p className="text-base font-bold text-slate-800">₹{outstandingPrincipal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Interest Due</p>
            <p className="text-base font-bold text-amber-700">₹{outstandingInterest.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Due</p>
            <p className="text-base font-extrabold text-slate-900">₹{totalDue.toLocaleString()}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Interest Discount (₹)</label>
          <input
            type="number"
            step="any"
            value={discountAmount}
            onChange={(e) => handleDiscountChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Net Settlement Amount (₹) *</label>
          <input
            type="number"
            step="any"
            required
            value={settlementAmount}
            onChange={(e) => setSettlementAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs">
            {loading ? "Settling..." : "Confirm Settlement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}