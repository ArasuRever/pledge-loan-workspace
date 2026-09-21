import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { User, Phone, MapPin, PlusCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, lRes] = await Promise.all([
          api.get(`/api/customers/${id}`),
          api.get(`/api/customers/${id}/loans`)
        ]);
        setCustomer(cRes.data);
        setLoans(lRes.data || []);
      } catch (err) {
        console.error("Failed to load customer profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading customer profile...</div>;
  }

  if (!customer) {
    return <div className="py-12 text-center text-rose-600 text-sm">Customer record not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Customer Directory</span>
      </Link>

      {/* Customer Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center space-x-4">
          {customer.customer_image_url ? (
            <img
              src={customer.customer_image_url}
              alt={customer.name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl border border-amber-200">
              {customer.name?.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.phone_number}</span>
              </span>
              {customer.address && (
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          to={`/loans/new?customerId=${customer.id}`}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Loan for Customer</span>
        </Link>
      </div>

      {/* KYC and Nominee Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>KYC & Identity Verification</span>
          </h3>
          <div className="text-sm divide-y divide-slate-100">
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">ID Document:</span>
              <span className="font-semibold text-slate-800">{customer.id_proof_type || "Aadhaar"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Document #:</span>
              <span className="font-semibold text-slate-800">{customer.id_proof_number || "-"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Nominee Information</span>
          </h3>
          <div className="text-sm divide-y divide-slate-100">
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Nominee Name:</span>
              <span className="font-semibold text-slate-800">{customer.nominee_name || "-"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Relationship:</span>
              <span className="font-semibold text-slate-800">{customer.nominee_relation || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loan History Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-800">Loans History ({loans.length})</h3>

        {loans.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No loans recorded for this customer yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Book Loan #</th>
                  <th className="p-3">Pledged Articles</th>
                  <th className="p-3 text-right">Principal</th>
                  <th className="p-3">Pledge Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loans.map((l) => (
                  <tr key={l.loan_id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-amber-700">#{l.book_loan_number}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">
                        {l.items_count > 1 ? `${l.items_count} Articles: ${l.description}` : (l.description || "Pledged Article")}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 space-x-2">
                        {parseFloat(l.gold_net_weight) > 0 && (
                          <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                            Au Net: {parseFloat(l.gold_net_weight).toFixed(3)} g
                          </span>
                        )}
                        {parseFloat(l.silver_net_weight) > 0 && (
                          <span className="text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            Ag Net: {parseFloat(l.silver_net_weight).toFixed(3)} g
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{parseFloat(l.principal_amount).toLocaleString()}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(l.pledge_date).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(l.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        l.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                        l.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/loans/${l.loan_id}`}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}