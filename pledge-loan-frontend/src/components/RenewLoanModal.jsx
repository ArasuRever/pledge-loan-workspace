import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { RefreshCw, ArrowDownLeft, ArrowUpRight, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';

export default function RenewLoanModal({ isOpen, onClose, loan, calculated, onSuccess }) {
  const [newBookLoanNumber, setNewBookLoanNumber] = useState('');
  const [bookNumberStatus, setBookNumberStatus] = useState(null);
  const [newInterestRate, setNewInterestRate] = useState('');
  
  // Section 1: Payments (Money In)
  const [interestPaid, setInterestPaid] = useState('');
  const [principalPaid, setPrincipalPaid] = useState('');

  // Section 2: Additional Top-up (Money Out)
  const [topUpAmount, setTopUpAmount] = useState('');

  // Deduction Checkbox
  const [deductFirstMonthInterest, setDeductFirstMonthInterest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentPrincipal = parseFloat(loan?.principal_amount || 0);
  const totalInterestDue = parseFloat(calculated?.outstandingInterest || 0);

  useEffect(() => {
    if (isOpen && loan) {
      setNewBookLoanNumber('');
      setBookNumberStatus(null);
      setNewInterestRate(loan.interest_rate?.toString() || '1.5');
      setInterestPaid('0');
      setPrincipalPaid('0');
      setTopUpAmount('0');
      setDeductFirstMonthInterest(false);
      setError('');
    }
  }, [isOpen, loan]);

  // Live duplicate checking on the new book number
  useEffect(() => {
    const trimmed = newBookLoanNumber.trim();
    if (!trimmed) {
      setBookNumberStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/loans/find-by-book-number/${encodeURIComponent(trimmed)}`);
        setBookNumberStatus(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setBookNumberStatus({ exists: false });
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newBookLoanNumber]);

  // Financial Calculations
  const intPaidNum = parseFloat(interestPaid) || 0;
  const prinPaidNum = parseFloat(principalPaid) || 0;
  const topUpNum = parseFloat(topUpAmount) || 0;
  const rateNum = parseFloat(newInterestRate) || 0;

  // Unpaid interest is rolled over into the new loan principal
  const unpaidInterest = Math.max(0, totalInterestDue - intPaidNum);
  
  // New Loan Principal = (Old Principal - Principal Paid) + Unpaid Interest + Top-up
  const newPrincipal = Math.max(0, (currentPrincipal - prinPaidNum) + unpaidInterest + topUpNum);

  // Upfront 1st month interest on new loan
  const firstMonthInt = deductFirstMonthInterest ? (newPrincipal * (rateNum / 100)) : 0;

  // Net Cash Settlement Today
  const totalMoneyIn = intPaidNum + prinPaidNum;
  const totalMoneyOut = topUpNum;
  const netCashFlow = totalMoneyIn - totalMoneyOut; // > 0 customer pays shop, < 0 shop pays customer

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newBookLoanNumber.trim()) {
      setError("Please enter a new Book Loan Number.");
      return;
    }
    if (bookNumberStatus?.exists) {
      setError(`Book Loan Number "${newBookLoanNumber}" already exists.`);
      return;
    }
    if (newPrincipal <= 0) {
      setError("New Loan Principal must be greater than 0.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post(`/api/loans/${loan.id}/renew`, {
        newBookLoanNumber: newBookLoanNumber.trim(),
        interestPaid: intPaidNum,
        principalPaid: prinPaidNum,
        topUpAmount: topUpNum,
        newPrincipal: newPrincipal,
        newInterestRate: rateNum,
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Renew Loan #${loan?.book_loan_number}`} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Current Loan Position */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <div>
            <p className="text-xs text-slate-400 font-medium">Current Principal</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">
              ₹{currentPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Interest Due</p>
            <p className="text-lg font-black text-amber-700 mt-0.5">
              ₹{totalInterestDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* New Book Loan # & Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                New Book Loan # *
              </label>
              {bookNumberStatus?.exists === true && (
                <span className="text-[10px] font-bold text-rose-600 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Already Exists</span>
                </span>
              )}
              {bookNumberStatus?.exists === false && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Available</span>
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 2026-A102"
              value={newBookLoanNumber}
              onChange={(e) => setNewBookLoanNumber(e.target.value)}
              className={`w-full px-3.5 py-2 bg-white border rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500 ${
                bookNumberStatus?.exists ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              New Monthly Rate (%) *
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 1.5"
              value={newInterestRate}
              onChange={(e) => setNewInterestRate(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* 1. Payments (Money In) */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-emerald-800">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>1. Payments (Money In)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Interest Paid by Customer (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={interestPaid}
                onChange={(e) => setInterestPaid(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Unpaid Interest: <strong className="text-amber-800">₹{unpaidInterest.toFixed(2)}</strong> (rolls over)
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Principal Reduction Paid (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={principalPaid}
                onChange={(e) => setPrincipalPaid(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Reduces old principal balance</p>
            </div>
          </div>
        </div>

        {/* 2. Additional Top-up (Money Out) */}
        <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-rose-800">
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>2. Additional Top-up (Money Out)</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Additional Top-up Cash Given to Customer (₹)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="w-full max-w-xs px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-sm font-bold text-slate-900"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Disburses extra cash to customer on new loan</p>
          </div>
        </div>

        {/* Deduct 1st Month Interest (Upfront Payment) */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="deductFirstMonthRenew"
            checked={deductFirstMonthInterest}
            onChange={(e) => setDeductFirstMonthInterest(e.target.checked)}
            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
          />
          <label htmlFor="deductFirstMonthRenew" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
            Deduct 1st Month Interest (Upfront Payment): {deductFirstMonthInterest && <span className="text-amber-700 font-bold">₹{firstMonthInt.toFixed(2)}</span>}
          </label>
        </div>

        {/* Calculation Breakdown Box */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800 border-b border-amber-200 pb-1.5">
            <span className="flex items-center space-x-1.5 text-amber-900 font-extrabold uppercase text-[11px]">
              <Calculator className="w-3.5 h-3.5 text-amber-700" />
              <span>Renewal Calculation Breakdown</span>
            </span>
          </div>

          <div className="space-y-1 font-medium text-slate-700">
            <div className="flex justify-between">
              <span>Old Principal:</span>
              <span>₹{currentPrincipal.toFixed(2)}</span>
            </div>
            {unpaidInterest > 0 && (
              <div className="flex justify-between text-amber-800 font-semibold">
                <span>+ Unpaid Interest:</span>
                <span>+₹{unpaidInterest.toFixed(2)}</span>
              </div>
            )}
            {topUpNum > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>+ Additional Top-up:</span>
                <span>+₹{topUpNum.toFixed(2)}</span>
              </div>
            )}
            {prinPaidNum > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>- Principal Paid by Customer:</span>
                <span>-₹{prinPaidNum.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-black text-sm pt-1.5 border-t border-amber-200">
              <span>New Loan Principal:</span>
              <span className="text-amber-900">₹{newPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Today's Cash Position */}
          <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">Today's Cash Settlement:</span>
            {netCashFlow > 0 ? (
              <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Customer Pays Cash: ₹{netCashFlow.toFixed(2)}
              </span>
            ) : netCashFlow < 0 ? (
              <span className="font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                Shop Disburses Cash: ₹{Math.abs(netCashFlow).toFixed(2)}
              </span>
            ) : (
              <span className="font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                No Cash Exchange
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || bookNumberStatus?.exists}
            className="flex items-center space-x-1.5 px-5 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{loading ? "Renewing..." : "Renew to New Loan"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}