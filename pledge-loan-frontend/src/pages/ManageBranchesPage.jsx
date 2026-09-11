import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building, Plus, Edit2, Phone, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function ManageBranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    phone_number: '',
    license_number: '',
    is_active: true
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches');
      setBranches(res.data || []);
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      branch_name: '',
      branch_code: '',
      address: '',
      phone_number: '',
      license_number: '',
      is_active: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (b) => {
    setEditingBranch(b);
    setFormData({
      branch_name: b.branch_name || '',
      branch_code: b.branch_code || '',
      address: b.address || '',
      phone_number: b.phone_number || '',
      license_number: b.license_number || '',
      is_active: b.is_active ?? true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      if (editingBranch) {
        await api.put(`/api/branches/${editingBranch.id}`, formData);
      } else {
        await api.post('/api/branches', formData);
      }
      setIsModalOpen(false);
      fetchBranches();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to save branch.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Branch Management</h2>
          <p className="text-sm text-slate-500">Configure multi-branch locations, licensing, and access.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading branches...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-slate-900 text-base">{b.branch_name}</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                    Code: {b.branch_code}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                {b.phone_number && (
                  <p className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.phone_number}</span>
                  </p>
                )}
                {b.address && (
                  <p className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.address}</span>
                  </p>
                )}
                {b.license_number && (
                  <p className="text-slate-600 font-medium">License: {b.license_number}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className={`inline-flex items-center space-x-1 font-bold ${
                  b.is_active ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  {b.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{b.is_active ? "Active Branch" : "Disabled"}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? `Edit Branch: ${editingBranch.branch_name}` : "Create New Branch"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Branch Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Main Branch"
              value={formData.branch_name}
              onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Branch Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. BR-01"
              value={formData.branch_code}
              onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Address</label>
            <textarea
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">License #</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="branchActive"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-amber-600 rounded"
            />
            <label htmlFor="branchActive" className="text-sm text-slate-700 cursor-pointer">
              Branch is Active
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs"
            >
              {formLoading ? "Saving..." : "Save Branch"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}