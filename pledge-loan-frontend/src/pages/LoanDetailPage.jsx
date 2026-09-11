import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowLeft, 
  CreditCard, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Trash2, 
  History,
  Scale,
  RotateCcw
} from 'lucide-react';
import AddPrincipalModal from '../components/AddPrincipalModal';
import SettleLoanModal from '../components/SettleLoanModal';
import RenewLoanModal from '../components/RenewLoanModal';
import ForfeitLoanModal from '../components/ForfeitLoanModal';
import LoanHistoryModal from '../components/LoanHistoryModal';
import PrintableInvoice from '../components/PrintableInvoice';

export default function LoanDetailPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('interest');
  const [customDate, setCustomDate] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [isAddPrincipalOpen, setIsAddPrincipalOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isForfeitOpen, setIsForfeitOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchLoanData = async () => {
    try {
      const res = await api.get(`/api/loans/${id}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load loan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [id]);

  const handlePayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return alert("Enter valid payment amount");

    setPaymentLoading(true);
    try {
      await api.post('/api/transactions', {
        loan_id: id,
        amount_paid: amt,
        payment_type: paymentType,
        custom_date: customDate || undefined
      });
      setPaymentAmount('');
      setCustomDate('');
      fetchLoanData();
    } catch (err) {
      alert(err.response?.data?.error || "Payment recording failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm("Undo/Delete this transaction record?")) return;
    try {
      await api.delete(`/api/transactions/${txId}`);
      fetchLoanData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete transaction.");
    }
  };

  const handleUndoForfeit = async () => {
    if (!window.confirm("Revert forfeiture and re-open this loan?")) return;
    try {
      await api.post(`/api/loans/${id}/undo-forfeit`);
      fetchLoanData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to undo forfeiture.");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading loan details...</div>;
  }

  if (!data?.loanDetails) {
    return <div className="py-12 text-center text-rose-600 text-sm">Loan not found.</div>;
  }

  const { loanDetails, transactions, interestBreakdown, calculated } = data;
  const isClosed = ['paid', 'forfeited'].includes(loanDetails.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link to="/loans" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Loans</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History</span>
          </button>

          {!isClosed ? (
            <>
              <button
                onClick={() => setIsAddPrincipalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Add Principal</span>
              </button>
              <button
                onClick={() => setIsRenewOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>Renew</span>
              </button>
              <button
                onClick={() => setIsSettleOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settle & Close</span>
              </button>
              <button
                onClick={() => setIsForfeitOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Forfeit</span>
              </button>
            </>
          ) : (
            loanDetails.status === 'forfeited' && (
              <button
                onClick={handleUndoForfeit}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Forfeiture</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-black text-slate-900">
              Loan #{loanDetails.book_loan_number}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              loanDetails.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
              loanDetails.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
              loanDetails.status === 'paid' ? 'bg-blue-100 text-blue-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {loanDetails.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <Link to={`/customers/${loanDetails.customer_id}`} className="font-semibold text-slate-700 hover:text-amber-600 underline">
              {loanDetails.customer_name} ({loanDetails.phone_number})
            </Link>
            <span>Pledged: {loanDetails.pledge_date}</span>
            <span>Due Date: {loanDetails.due_date}</span>
          </div>
        </div>

        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div>
            <p className="text-xs text-slate-400">Principal Due</p>
            <p className="text-xl font-black text-slate-900">
              ₹{calculated?.outstandingPrincipal ? calculated.outstandingPrincipal.toLocaleString() : '0'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Interest Accrued</p>
            <p className="text-xl font-black text-amber-700">
              ₹{calculated?.outstandingInterest ? calculated.outstandingInterest.toLocaleString() : '0'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Amount Due</p>
            <p className="text-xl font-black text-emerald-700">
              ₹{calculated?.amountDue ? calculated.amountDue.toLocaleString() : '0'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pledged Article & Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeTab === 'transactions'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Transactions ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeTab === 'breakdown'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Accrual Breakdown
        </button>
        <button
          onClick={() => setActiveTab('print')}
          className={`pb-3 px-4 border-b-2 transition ${
            activeTab === 'print'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Print Voucher
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-800">Article Specifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400">Item</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{loanDetails.item_type || "Gold"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400">Purity</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{loanDetails.purity || "22K"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400">Gross Weight</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{loanDetails.gross_weight || loanDetails.weight || 0} g</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400">Net Weight</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{loanDetails.net_weight || 0} g</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
                <p className="text-sm text-slate-800">{loanDetails.description || "No description provided."}</p>
              </div>
            </div>

            {!isClosed && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>Record Inward Payment</span>
                </h3>

                <form onSubmit={handlePayment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 1500"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    >
                      <option value="interest">Interest (Auto-Split)</option>
                      <option value="principal">Principal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Backdate (Optional)</label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-2xs disabled:opacity-50"
                    >
                      {paymentLoading ? "Saving..." : "Record Payment"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Article Image Proof</h3>
              {loanDetails.item_image_data_url ? (
                <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={loanDetails.item_image_data_url}
                    alt="Pledged Item"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center text-xs">
                  <Scale className="w-8 h-8 mb-2 stroke-1" />
                  <span>No photo attached to this loan.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Transaction Receipts</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No transaction records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Staff / Cashier</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-xs text-slate-500">
                        {new Date(t.payment_date).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold uppercase text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          t.payment_type === 'disbursement' ? 'bg-amber-100 text-amber-800' :
                          t.payment_type === 'interest' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {t.payment_type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900">
                        ₹{parseFloat(t.amount_paid).toLocaleString()}
                      </td>
                      <td className="p-3 text-xs text-slate-600">{t.changed_by_username || 'Staff'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Undo Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'breakdown' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800">Cumulative Interest Accrual History</h3>
            <p className="text-xs text-slate-500">Calculated on principal tranches with 15-day split rule.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">Period / Event</th>
                  <th className="p-3">Principal (₹)</th>
                  <th className="p-3 text-center">Months</th>
                  <th className="p-3 text-right">Interest (₹)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
                {interestBreakdown?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-medium">
                      {row.label}
                      <span className="block text-[10px] text-slate-400">
                        {row.date ? new Date(row.date).toLocaleDateString() : ''} 
                        {row.endDate ? ` to ${new Date(row.endDate).toLocaleDateString()}` : ''}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{row.amount ? `₹${row.amount.toLocaleString()}` : '-'}</td>
                    <td className="p-3 text-center">{row.months !== undefined ? row.months.toFixed(1) : '-'}</td>
                    <td className="p-3 text-right font-bold text-amber-700">
                      {row.interest !== undefined ? `₹${row.interest.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 uppercase font-bold text-[10px] text-slate-500">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'print' && (
        <PrintableInvoice
          loan={loanDetails}
          customer={{ name: loanDetails.customer_name, phone_number: loanDetails.phone_number, address: loanDetails.address }}
          pledgedItem={{
            item_type: loanDetails.item_type,
            description: loanDetails.description,
            quality: loanDetails.quality,
            gross_weight: loanDetails.gross_weight,
            net_weight: loanDetails.net_weight,
            purity: loanDetails.purity
          }}
          calculated={calculated}
        />
      )}

      <AddPrincipalModal
        isOpen={isAddPrincipalOpen}
        onClose={() => setIsAddPrincipalOpen(false)}
        loan={loanDetails}
        onSuccess={fetchLoanData}
      />

      <SettleLoanModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        loan={loanDetails}
        calculated={calculated}
        onSuccess={fetchLoanData}
      />

      <RenewLoanModal
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
        loan={loanDetails}
        calculated={calculated}
        onSuccess={fetchLoanData}
      />

      <ForfeitLoanModal
        isOpen={isForfeitOpen}
        onClose={() => setIsForfeitOpen(false)}
        loan={loanDetails}
        onSuccess={fetchLoanData}
      />

      <LoanHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        loanId={loanDetails.id}
        bookLoanNumber={loanDetails.book_loan_number}
      />
    </div>
  );
}