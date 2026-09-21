import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { 
  Save, 
  Plus, 
  Trash2, 
  Camera, 
  Upload, 
  X, 
  AlertCircle, 
  Clock
} from 'lucide-react';
import CameraCaptureModal from './CameraCaptureModal';

export default function EditLoanModal({ isOpen, onClose, loan, onSuccess }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'articles' | 'transactions'

  // Core Loan Parameters
  const [bookLoanNumber, setBookLoanNumber] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [pledgeDate, setPledgeDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [appraisedValue, setAppraisedValue] = useState('');

  // Articles List
  const [items, setItems] = useState([]);

  // Past / Missed Transactions to insert
  const [missedTransactions, setMissedTransactions] = useState([]);

  // Camera capture modal state
  const [activeCameraItemIndex, setActiveCameraItemIndex] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && loan) {
      setBookLoanNumber(loan.book_loan_number || '');
      setInterestRate(loan.interest_rate?.toString() || '1.5');
      setPledgeDate(loan.pledge_date ? loan.pledge_date.split('T')[0] : '');
      setDueDate(loan.due_date ? loan.due_date.split('T')[0] : '');
      setPrincipalAmount(loan.principal_amount?.toString() || '0');
      setAppraisedValue(loan.appraised_value?.toString() || '');

      const initialItems = (loan.items && loan.items.length > 0) ? loan.items.map(it => ({
        id: it.id,
        item_type: it.item_type || 'Gold',
        description: it.description || '',
        gross_weight: it.gross_weight || '',
        net_weight: it.net_weight || '',
        purity: it.purity || '22K (916)',
        quality: it.quality || 'Good',
        item_value: it.item_value || '',
        photoPreview: it.item_image_data_url || null,
        photoFile: null
      })) : [{
        id: null,
        item_type: loan.item_type || 'Gold',
        description: loan.description || '',
        gross_weight: loan.gross_weight || '',
        net_weight: loan.net_weight || '',
        purity: loan.purity || '22K (916)',
        quality: loan.quality || 'Good',
        item_value: loan.principal_amount || '',
        photoPreview: loan.item_image_data_url || null,
        photoFile: null
      }];

      setItems(initialItems);
      setMissedTransactions([]);
      setError('');
      setActiveTab('details');
    }
  }, [isOpen, loan]);

  // Multi-item manipulation
  const addItem = () => {
    setItems([
      ...items,
      {
        id: null,
        item_type: 'Gold',
        description: '',
        gross_weight: '',
        net_weight: '',
        purity: '22K (916)',
        quality: 'Good',
        item_value: '',
        photoPreview: null,
        photoFile: null
      }
    ]);
  };

  const removeItem = (idx) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    if (field === 'gross_weight' && !updated[idx].net_weight) {
      updated[idx].net_weight = value;
    }
    setItems(updated);
  };

  const updateItemPhoto = (idx, file, preview) => {
    const updated = [...items];
    updated[idx].photoFile = file;
    updated[idx].photoPreview = preview;
    setItems(updated);
  };

  // Missed past transactions
  const addMissedTransaction = () => {
    const today = new Date().toISOString().split('T')[0];
    setMissedTransactions([
      ...missedTransactions,
      {
        payment_type: 'interest',
        amount_paid: '',
        payment_date: today
      }
    ]);
  };

  const removeMissedTransaction = (idx) => {
    setMissedTransactions(missedTransactions.filter((_, i) => i !== idx));
  };

  const updateMissedTransaction = (idx, field, value) => {
    const updated = [...missedTransactions];
    updated[idx][field] = value;
    setMissedTransactions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookLoanNumber.trim()) {
      setError("Book Loan Number is required.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('book_loan_number', bookLoanNumber.trim());
      formData.append('interest_rate', interestRate);
      formData.append('pledge_date', pledgeDate);
      formData.append('due_date', dueDate);
      formData.append('principal_amount', principalAmount);
      formData.append('appraised_value', appraisedValue);

      // Serialize items
      const cleanItems = items.map(it => ({
        id: it.id,
        item_type: it.item_type,
        description: it.description,
        gross_weight: it.gross_weight,
        net_weight: it.net_weight,
        purity: it.purity,
        quality: it.quality,
        item_value: it.item_value,
        existingImage: it.photoFile ? null : it.photoPreview
      }));
      formData.append('items', JSON.stringify(cleanItems));

      // Append files
      items.forEach((it, idx) => {
        if (it.photoFile) {
          formData.append(`itemPhoto_${idx}`, it.photoFile);
        }
      });

      // Append missed transactions if any
      if (missedTransactions.length > 0) {
        formData.append('missedTransactions', JSON.stringify(missedTransactions));
      }

      await api.put(`/api/loans/${loan.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || "Failed to update loan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Loan #${loan?.book_loan_number}`} maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
              activeTab === 'details'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Core Loan Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('articles')}
            className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
              activeTab === 'articles'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Pledged Articles ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
              activeTab === 'transactions'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Record Past / Missed Transactions {missedTransactions.length > 0 && `(${missedTransactions.length})`}
          </button>
        </div>

        {/* TAB 1: Core Loan Details */}
        {activeTab === 'details' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Book Loan # *
                </label>
                <input
                  type="text"
                  required
                  value={bookLoanNumber}
                  onChange={(e) => setBookLoanNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Pledge Date (Backdate Support)
                </label>
                <input
                  type="date"
                  value={pledgeDate}
                  onChange={(e) => setPledgeDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Principal Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Monthly Rate (%)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Appraised Valuation (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={appraisedValue}
                  onChange={(e) => setAppraisedValue(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Pledged Articles Manager */}
        {activeTab === 'articles' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Edit, add, or replace pledged articles:</span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Article</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500">Article #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-xs text-rose-600 hover:text-rose-800 flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Metal</label>
                      <select
                        value={item.item_type}
                        onChange={(e) => updateItem(idx, 'item_type', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-amber-800"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Description</label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Gross (g)</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={item.gross_weight}
                        onChange={(e) => updateItem(idx, 'gross_weight', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Net (g)</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={item.net_weight}
                        onChange={(e) => updateItem(idx, 'net_weight', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-800 mb-0.5">Pledged (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={item.item_value}
                        onChange={(e) => updateItem(idx, 'item_value', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-extrabold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-500">Purity:</span>
                      <input
                        type="text"
                        value={item.purity}
                        onChange={(e) => updateItem(idx, 'purity', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs w-28"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveCameraItemIndex(idx)}
                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer"
                        title="Live Camera"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <label className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files[0];
                            if (f) updateItemPhoto(idx, f, URL.createObjectURL(f));
                          }}
                        />
                      </label>
                      {item.photoPreview && (
                        <div className="flex items-center space-x-1">
                          <img src={item.photoPreview} alt="Preview" className="w-6 h-6 object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => updateItemPhoto(idx, null, null)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Record Past / Missed Transactions */}
        {activeTab === 'transactions' && (
          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Add Forgotten / Past Transactions by Date:</span>
              </p>
              <p className="text-slate-600">
                If an earlier disbursement or interest/principal payment took place but was not recorded, add it below with the exact backdated date.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addMissedTransaction}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Historical Transaction</span>
              </button>
            </div>

            {missedTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No new past transactions added. Click "Add Historical Transaction" above if you need to insert an unnoted payment.
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {missedTransactions.map((tx, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Type</label>
                      <select
                        value={tx.payment_type}
                        onChange={(e) => updateMissedTransaction(idx, 'payment_type', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                      >
                        <option value="interest">Interest Payment (Money In)</option>
                        <option value="principal">Principal Reduction (Money In)</option>
                        <option value="disbursement">Additional Disbursement (Money Out)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Amount (₹) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 500"
                        value={tx.amount_paid}
                        onChange={(e) => updateMissedTransaction(idx, 'amount_paid', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Date of Event *</label>
                      <input
                        type="date"
                        required
                        value={tx.payment_date}
                        onChange={(e) => updateMissedTransaction(idx, 'payment_date', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => removeMissedTransaction(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 px-6 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Saving Changes..." : "Save Loan Edits"}</span>
          </button>
        </div>
      </form>

      <CameraCaptureModal
        isOpen={activeCameraItemIndex !== null}
        onClose={() => setActiveCameraItemIndex(null)}
        title={`Live Capture Article #${activeCameraItemIndex !== null ? activeCameraItemIndex + 1 : ''} Photo`}
        onCapture={(file, previewUrl) => {
          if (activeCameraItemIndex !== null) {
            updateItemPhoto(activeCameraItemIndex, file, previewUrl);
          }
        }}
      />
    </Modal>
  );
}