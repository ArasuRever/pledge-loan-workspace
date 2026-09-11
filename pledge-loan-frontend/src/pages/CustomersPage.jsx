import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { User, Plus, Search, Phone, MapPin, Trash2, Edit2, ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    address: '',
    id_proof_type: 'Aadhaar',
    id_proof_number: '',
    nominee_name: '',
    nominee_relation: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/api/customers');
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      phone_number: '',
      address: '',
      id_proof_type: 'Aadhaar',
      id_proof_number: '',
      nominee_name: '',
      nominee_relation: ''
    });
    setPhotoFile(null);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      phone_number: c.phone_number || '',
      address: c.address || '',
      id_proof_type: c.id_proof_type || 'Aadhaar',
      id_proof_number: c.id_proof_number || '',
      nominee_name: c.nominee_name || '',
      nominee_relation: c.nominee_relation || ''
    });
    setPhotoFile(null);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone_number.trim()) {
      setFormError("Name and Phone Number are required.");
      return;
    }

    setFormLoading(true);
    setFormError('');

    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    if (photoFile) data.append('photo', photoFile);

    try {
      if (editingCustomer) {
        await api.put(`/api/customers/${editingCustomer.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setIsEditModalOpen(false);
      } else {
        await api.post('/api/customers', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setIsAddModalOpen(false);
      }
      fetchCustomers();
    } catch (err) {
      setFormError(err.response?.data?.error || "Operation failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Move this customer to recycle bin?")) return;
    try {
      await api.delete(`/api/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || "Cannot delete customer with active loans.");
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-sm text-slate-500">Manage client profiles, KYC information, and history.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-xs transition text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Filter by customer name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading customers...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
          No customers found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition flex flex-col justify-between"
            >
              <div className="flex items-start space-x-3.5">
                {c.customer_image_url ? (
                  <img
                    src={c.customer_image_url}
                    alt={c.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shrink-0">
                    {c.name?.charAt(0).toUpperCase() || <User className="w-6 h-6" />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{c.name}</h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone_number}</span>
                  </div>
                  {c.address && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 mt-4 border-t border-slate-100 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium">
                  {c.active_loan_count || 0} Active
                </span>
                {c.overdue_loan_count > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium">
                    {c.overdue_loan_count} Overdue
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                  {c.paid_loan_count || 0} Settled
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link
                  to={`/customers/${c.id}`}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  <span>View Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : "Add New Customer"}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Primary Phone Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 9876543210"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Address
            </label>
            <textarea
              rows="2"
              placeholder="Street, locality, city"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                ID Proof Type
              </label>
              <select
                value={formData.id_proof_type}
                onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving License">Driving License</option>
                <option value="Ration Card">Ration Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                ID Proof Number
              </label>
              <input
                type="text"
                placeholder="ID Number"
                value={formData.id_proof_number}
                onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Nominee Name
              </label>
              <input
                type="text"
                placeholder="Nominee"
                value={formData.nominee_name}
                onChange={(e) => setFormData({ ...formData, nominee_name: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Relationship
              </label>
              <input
                type="text"
                placeholder="e.g. Spouse, Son"
                value={formData.nominee_relation}
                onChange={(e) => setFormData({ ...formData, nominee_relation: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Customer Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl shadow-xs transition"
            >
              {formLoading ? "Saving..." : editingCustomer ? "Update Customer" : "Create Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}