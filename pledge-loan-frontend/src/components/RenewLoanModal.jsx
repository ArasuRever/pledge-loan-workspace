import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';

export default function RenewLoanModal({ isOpen, onClose, loan, calculated, onSuccess }) {
  const [newBookLoanNumber, setNewBookLoanNumber] = useState('');
  const [interestPaid, setInterestPaid] = useState('');
  const [principalPaid, setPrincipalPaid] = useState('0');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newInterestRate, setNewInterestRate] = useState('');
  const [deductFirstMonthInterest, setDeductFirstMonthInterest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const outstandingInterest = calculated?.outstandingInterest || 0;
  const currentPrincipal = parseFloat(loan?.principal_amount || 0);

  useEffect(() => {
    if (isOpen && loan) {
      setNewBookLoanNumber('');
      setInterestPaid(outstandingInterest.toString());
      setPrincipalPaid('0');
      setNewPrincipal(currentPrincipal.toString());
      setNewInterestRate(loan.interest_rate?.toString() || '1.5');
      setDeductFirstMonthInterest(false);
      setError('');
    }
  }, [isOpen, loan, outstandingInterest, currentPrincipal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newBookLoanNumber.trim()) {
      setError("Please provide a new Book Loan Number.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/api/loans/${loan.id}/renew`, {
        newBookLoanNumber: newBookLoanNumber.trim(),
        interestPaid: parseFloat(interestPaid) || 0,
        principalPaid: parseFloat(principalPaid) || 0,
        newPrincipal: parseFloat(newPrincipal) || currentPrincipal,
        newInterestRate: parseFloat(newInterestRate) || loan.interest_rate,
        deductFirstMonthInterest
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to renew loan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Renew Loan #${loan?.book_loan_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">New Book Loan # *</label>
          <input
            type="text"
            required
            placeholder="e.g. 2026-A102"
            value={newBookLoanNumber}
            onChange={(e) => setNewBookLoanNumber(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Interest Cleared (₹)</label>
            <input
              type="number"
              step="any"
              value={interestPaid}
              onChange={(e) => setInterestPaid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Principal Reduction (₹)</label>
            <input
              type="number"
              step="any"
              value={principalPaid}
              onChange={(e) => {
                setPrincipalPaid(e.target.value);
                setNewPrincipal(Math.max(0, currentPrincipal - (parseFloat(e.target.value) || 0)).toString());
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">New Principal (₹) *</label>
            <input
              type="number"
              step="any"
              required
              value={newPrincipal}
              onChange={(e) => setNewPrincipal(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Rate (%) *</label>
            <input
              type="number"
              step="any"
              required
              value={newInterestRate}
              onChange={(e) => setNewInterestRate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="deductFirst"
            checked={deductFirstMonthInterest}
            onChange={(e) => setDeductFirstMonthInterest(e.target.checked)}
            className="w-4 h-4 text-amber-600 rounded"
          />
          <label htmlFor="deductFirst" className="text-sm text-slate-700 cursor-pointer">
            Deduct 1st month interest upfront
          </label>
        </div>
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs">
            {loading ? "Renewing..." : "Confirm Renewal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}