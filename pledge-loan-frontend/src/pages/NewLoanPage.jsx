import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { User, Shield, Sparkles, AlertCircle } from 'lucide-react';

export default function NewLoanPage() {
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);

  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const [bookLoanNumber, setBookLoanNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('1.5');
  const [appraisedValue, setAppraisedValue] = useState('');
  const [deductFirstMonthInterest, setDeductFirstMonthInterest] = useState(false);

  const [itemType, setItemType] = useState('Gold Ornament');
  const [description, setDescription] = useState('');
  const [quality, setQuality] = useState('Good');
  const [grossWeight, setGrossWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [purity, setPurity] = useState('22K (916)');
  const [itemPhoto, setItemPhoto] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/customers')
      .then((res) => setCustomers(res.data || []))
      .catch((err) => console.error("Failed to fetch customers:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let finalCustomerId = selectedCustomerId;
    setLoading(true);

    try {
      if (isCreatingNewCustomer) {
        if (!newCustName.trim() || !newCustPhone.trim()) {
          setError("New customer Name and Phone Number are required.");
          setLoading(false);
          return;
        }

        const custFormData = new FormData();
        custFormData.append('name', newCustName.trim());
        custFormData.append('phone_number', newCustPhone.trim());
        custFormData.append('address', newCustAddress.trim());

        const newCustRes = await api.post('/api/customers', custFormData);
        finalCustomerId = newCustRes.data.id;
      }

      if (!finalCustomerId) {
        setError("Please select or create a customer.");
        setLoading(false);
        return;
      }

      const loanFormData = new FormData();
      loanFormData.append('customer_id', finalCustomerId);
      loanFormData.append('book_loan_number', bookLoanNumber.trim());
      loanFormData.append('principal_amount', principalAmount);
      loanFormData.append('interest_rate', interestRate);
      loanFormData.append('appraised_value', appraisedValue || principalAmount);
      loanFormData.append('deductFirstMonthInterest', deductFirstMonthInterest ? 'true' : 'false');

      loanFormData.append('item_type', itemType);
      loanFormData.append('description', description);
      loanFormData.append('quality', quality);
      loanFormData.append('gross_weight', grossWeight);
      loanFormData.append('net_weight', netWeight || grossWeight);
      loanFormData.append('purity', purity);
      if (itemPhoto) {
        loanFormData.append('itemPhoto', itemPhoto);
      }

      const res = await api.post('/api/loans', loanFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate(`/loans/${res.data.loanId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || "Failed to create pledge loan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Pledge Loan</h2>
        <p className="text-sm text-slate-500">Record pawn disbursement, pledge details, and compute upfront interest.</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <User className="w-4 h-4 text-amber-600" />
              <span>Step 1: Customer Selection</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingNewCustomer(!isCreatingNewCustomer)}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
            >
              {isCreatingNewCustomer ? "Select Existing Customer" : "+ Add Brand New Customer"}
            </button>
          </div>

          {!isCreatingNewCustomer ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Select Customer *
              </label>
              <select
                required={!isCreatingNewCustomer}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - ({c.phone_number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required={isCreatingNewCustomer}
                  placeholder="e.g. Anbu Selvan"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required={isCreatingNewCustomer}
                  placeholder="e.g. 9842012345"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Street / City"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Step 2: Loan Terms</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Book Loan # *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2026-A101"
                value={bookLoanNumber}
                onChange={(e) => setBookLoanNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 25000"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Monthly Interest Rate (%) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 1.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Appraised Metal Value (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional estimated value"
                value={appraisedValue}
                onChange={(e) => setAppraisedValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="deductFirstMonthLoan"
                checked={deductFirstMonthInterest}
                onChange={(e) => setDeductFirstMonthInterest(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <label htmlFor="deductFirstMonthLoan" className="ml-2.5 text-sm text-slate-700 cursor-pointer">
                Deduct 1st month interest upfront on disbursement
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Step 3: Pledged Article Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Item Category *
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Gold Ornament">Gold Ornament</option>
                <option value="Gold Ring">Gold Ring</option>
                <option value="Gold Chain">Gold Chain</option>
                <option value="Gold Bangle">Gold Bangle</option>
                <option value="Gold Necklace">Gold Necklace</option>
                <option value="Gold Coin/Bar">Gold Coin / Bar</option>
                <option value="Silver Articles">Silver Articles</option>
                <option value="Other">Other Article</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Purity
              </label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="22K (916)">22K (916)</option>
                <option value="24K (999)">24K (999)</option>
                <option value="18K (750)">18K (750)</option>
                <option value="925 Sterling Silver">925 Sterling Silver</option>
                <option value="Hallmarked">Hallmarked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Quality / Condition
              </label>
              <input
                type="text"
                placeholder="e.g. Intact"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Gross Weight (grams) *
              </label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="e.g. 16.500"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Net Weight (grams)
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="e.g. 15.800"
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Article Description *
            </label>
            <textarea
              rows="2"
              required
              placeholder="e.g. 1 pair gold bangles"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Article Photo Upload
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setItemPhoto(e.target.files[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition"
          >
            {loading ? "Recording Pledge..." : "Complete & Disburse Loan"}
          </button>
        </div>
      </form>
    </div>
  );
}