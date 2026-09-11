import React, { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';

export default function ForfeitLoanModal({ isOpen, onClose, loan, onSuccess }) {
  const [salePrice, setSalePrice] = useState('');
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    if (salePrice) formData.append('salePrice', salePrice);
    if (signatureFile) formData.append('signature', signatureFile);
    if (photoFile) formData.append('photo', photoFile);

    try {
      await api.post(`/api/loans/${loan.id}/forfeit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to forfeit loan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Forfeit Loan #${loan?.book_loan_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          Warning: Forfeiting closes this loan and logs the article as auctioned.
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Realized Sale Price (₹)</label>
          <input
            type="number"
            step="any"
            placeholder="e.g. 40000"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Signature Proof</label>
            <input type="file" accept="image/*" onChange={(e) => setSignatureFile(e.target.files[0] || null)} className="w-full text-xs text-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Photo Proof</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0] || null)} className="w-full text-xs text-slate-500" />
          </div>
        </div>
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs">
            {loading ? "Processing..." : "Confirm Forfeiture"}
          </button>
        </div>
      </form>
    </Modal>
  );
}