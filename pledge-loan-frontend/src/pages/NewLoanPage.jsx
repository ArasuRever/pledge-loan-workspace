import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
  User, 
  Shield, 
  Sparkles, 
  AlertCircle, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  Camera, 
  Upload,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Scale
} from 'lucide-react';
import CameraCaptureModal from '../components/CameraCaptureModal';
import ImageViewerModal from '../components/ImageViewerModal';

export default function NewLoanPage() {
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const navigate = useNavigate();

  // Step 1: Customer States
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const dropdownRef = useRef(null);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhones, setSecondaryPhones] = useState([]);
  const [phoneDuplicateCustomer, setPhoneDuplicateCustomer] = useState(null);

  const [newCustAddress, setNewCustAddress] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [idProofFile, setIdProofFile] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [customerPhoto, setCustomerPhoto] = useState(null);
  const [customerPhotoPreview, setCustomerPhotoPreview] = useState(null);

  // Step 2: Loan Financial Terms (Strictly 4 Fields)
  const [bookLoanNumber, setBookLoanNumber] = useState('');
  const [bookNumberStatus, setBookNumberStatus] = useState(null);
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('1.5');
  const [deductFirstMonthInterest, setDeductFirstMonthInterest] = useState(false);

  // Step 3: Multi-Item Pledged Articles
  const [items, setItems] = useState([
    {
      item_type: 'Gold',
      description: '',
      gross_weight: '',
      net_weight: '',
      purity: '22K (916)',
      quality: 'Good',
      item_amount: '',
      photoFile: null,
      photoPreview: null
    }
  ]);
  const [appraisedValue, setAppraisedValue] = useState('');

  // Camera & Image Viewer Modals
  const [isCustomerCameraOpen, setIsCustomerCameraOpen] = useState(false);
  const [isIdProofCameraOpen, setIsIdProofCameraOpen] = useState(false);
  const [activeCameraItemIndex, setActiveCameraItemIndex] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/customers')
      .then((res) => {
        const list = res.data || [];
        setCustomers(list);
        if (preselectedCustomerId) {
          const matched = list.find(c => c.id === parseInt(preselectedCustomerId, 10));
          if (matched) setSelectedCustomer(matched);
        }
      })
      .catch((err) => console.error("Failed to fetch customers:", err));
  }, [preselectedCustomerId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Book Loan Number Check
  useEffect(() => {
    const trimmed = bookLoanNumber.trim();
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
  }, [bookLoanNumber]);

  // Phone Sanitizer (10 digits only)
  const sanitizePhone = (val) => val.replace(/\D/g, '').slice(0, 10);

  const handlePrimaryPhoneChange = (val) => {
    const clean = sanitizePhone(val);
    setPrimaryPhone(clean);
    if (clean.length >= 7) {
      const found = customers.find(c => c.phone_number === clean);
      setPhoneDuplicateCustomer(found || null);
    } else {
      setPhoneDuplicateCustomer(null);
    }
  };

  const handleSecondaryPhoneChange = (index, val) => {
    const clean = sanitizePhone(val);
    const updated = [...secondaryPhones];
    updated[index] = clean;
    setSecondaryPhones(updated);
    if (clean.length >= 7) {
      const found = customers.find(c => c.phone_number === clean);
      if (found) setPhoneDuplicateCustomer(found);
    }
  };

  const addSecondaryPhone = () => {
    if (secondaryPhones.length < 2) setSecondaryPhones([...secondaryPhones, '']);
  };

  const removeSecondaryPhone = (index) => {
    setSecondaryPhones(secondaryPhones.filter((_, i) => i !== index));
  };

  const selectExistingFromPhone = (c) => {
    setSelectedCustomer(c);
    setIsCreatingNewCustomer(false);
    setPhoneDuplicateCustomer(null);
    setPrimaryPhone('');
  };

  // Multi-Item Handlers
  const addItem = () => {
    setItems([
      ...items,
      {
        item_type: 'Gold',
        description: '',
        gross_weight: '',
        net_weight: '',
        purity: '22K (916)',
        quality: 'Good',
        item_amount: '',
        photoFile: null,
        photoPreview: null
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
      recalculatePrincipal(updated);
    }
  };

  // Automatically sync disbursed principal amount from item amounts
  const recalculatePrincipal = (itemList) => {
    const totalItemAmounts = itemList.reduce((acc, it) => acc + (parseFloat(it.item_amount) || 0), 0);
    if (totalItemAmounts > 0) {
      setPrincipalAmount(totalItemAmounts.toString());
    }
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'gross_weight' && !updated[index].net_weight) {
      updated[index].net_weight = value;
    }
    setItems(updated);

    if (field === 'item_amount') {
      recalculatePrincipal(updated);
    }
  };

  const updateItemPhoto = (index, file, preview) => {
    const updated = [...items];
    updated[index].photoFile = file;
    updated[index].photoPreview = preview;
    setItems(updated);
  };

  // Separate weight calculations strictly by metal type (never mixing Gold and Silver)
  const goldItems = items.filter(it => (it.item_type || '').toLowerCase().includes('gold'));
  const silverItems = items.filter(it => (it.item_type || '').toLowerCase().includes('silver'));
  const otherItems = items.filter(it => !(it.item_type || '').toLowerCase().includes('gold') && !(it.item_type || '').toLowerCase().includes('silver'));

  const goldGross = goldItems.reduce((acc, it) => acc + (parseFloat(it.gross_weight) || 0), 0);
  const goldNet = goldItems.reduce((acc, it) => acc + (parseFloat(it.net_weight) || parseFloat(it.gross_weight) || 0), 0);

  const silverGross = silverItems.reduce((acc, it) => acc + (parseFloat(it.gross_weight) || 0), 0);
  const silverNet = silverItems.reduce((acc, it) => acc + (parseFloat(it.net_weight) || parseFloat(it.gross_weight) || 0), 0);

  const otherGross = otherItems.reduce((acc, it) => acc + (parseFloat(it.gross_weight) || 0), 0);
  const otherNet = otherItems.reduce((acc, it) => acc + (parseFloat(it.net_weight) || parseFloat(it.gross_weight) || 0), 0);

  const totalGross = items.reduce((acc, it) => acc + (parseFloat(it.gross_weight) || 0), 0);
  const totalNet = items.reduce((acc, it) => acc + (parseFloat(it.net_weight) || parseFloat(it.gross_weight) || 0), 0);
  const totalItemAmounts = items.reduce((acc, it) => acc + (parseFloat(it.item_amount) || 0), 0);

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone_number?.includes(customerSearch)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (bookNumberStatus?.exists) {
      setError(`Book Loan Number "${bookLoanNumber}" already exists. Please enter a unique number.`);
      return;
    }

    setLoading(true);
    let finalCustomerId = selectedCustomer?.id;

    try {
      if (isCreatingNewCustomer) {
        if (!newCustName.trim() || !primaryPhone.trim()) {
          setError("Customer Name and Primary Phone Number are required.");
          setLoading(false);
          return;
        }

        if (primaryPhone.trim().length !== 10) {
          setError("Primary Phone Number must be exactly 10 digits.");
          setLoading(false);
          return;
        }

        const custFormData = new FormData();
        custFormData.append('name', newCustName.trim());
        custFormData.append('phone_number', primaryPhone.trim());
        if (secondaryPhones[0]) custFormData.append('secondary_phone_1', secondaryPhones[0].trim());
        if (secondaryPhones) custFormData.append('secondary_phone_2', secondaryPhones.trim());
        custFormData.append('address', newCustAddress.trim());
        custFormData.append('id_proof_type', idProofType);
        custFormData.append('id_proof_number', idProofNumber.trim());
        custFormData.append('nominee_name', nomineeName.trim());
        custFormData.append('nominee_relation', nomineeRelation.trim());

        if (customerPhoto) custFormData.append('photo', customerPhoto);
        if (idProofFile) custFormData.append('idProofPhoto', idProofFile);

        const newCustRes = await api.post('/api/customers', custFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalCustomerId = newCustRes.data.id;
      }

      if (!finalCustomerId) {
        setError("Please select an existing customer or create a new customer in Step 1.");
        setLoading(false);
        return;
      }

      const loanFormData = new FormData();
      loanFormData.append('customer_id', finalCustomerId);
      loanFormData.append('book_loan_number', bookLoanNumber.trim());
      loanFormData.append('principal_amount', principalAmount || totalItemAmounts);
      loanFormData.append('interest_rate', interestRate);
      loanFormData.append('appraised_value', appraisedValue || principalAmount || totalItemAmounts);
      loanFormData.append('deductFirstMonthInterest', deductFirstMonthInterest ? 'true' : 'false');

      // Strip photoFile/photoPreview before JSON serialization
      const cleanItems = items.map(it => ({
        item_type: it.item_type,
        description: it.description,
        gross_weight: it.gross_weight,
        net_weight: it.net_weight,
        purity: it.purity,
        quality: it.quality,
        item_amount: it.item_amount
      }));
      loanFormData.append('items', JSON.stringify(cleanItems));

      // Append individual photo for each item
      items.forEach((it, idx) => {
        if (it.photoFile) {
          loanFormData.append(`itemPhoto_${idx}`, it.photoFile);
        }
      });

      // Backward compatibility fields
      loanFormData.append('item_type', items[0].item_type);
      loanFormData.append('description', items.map(i => i.description).filter(Boolean).join(', '));
      loanFormData.append('quality', items[0].quality);
      loanFormData.append('gross_weight', totalGross);
      loanFormData.append('net_weight', totalNet);
      loanFormData.append('purity', items[0].purity);

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
        <p className="text-sm text-slate-500">Record customer pledge, verify identity, and disburse loan funds.</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================= */}
        {/* STEP 1: Customer Selection or Inline Brand New Creation    */}
        {/* ========================================================= */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <User className="w-4 h-4 text-amber-600" />
              <span>Step 1: Customer Selection</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNewCustomer(!isCreatingNewCustomer);
                setSelectedCustomer(null);
                setCustomerSearch('');
                setPhoneDuplicateCustomer(null);
              }}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline cursor-pointer"
            >
              {isCreatingNewCustomer ? "← Select Existing Customer" : "+ Add a Brand New Customer"}
            </button>
          </div>

          {!isCreatingNewCustomer ? (
            <div className="space-y-3" ref={dropdownRef}>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                      {selectedCustomer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</h4>
                      <p className="text-xs text-slate-500">Phone: {selectedCustomer.phone_number}</p>
                      {selectedCustomer.address && (
                        <p className="text-xs text-slate-400">{selectedCustomer.address}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs cursor-pointer"
                  >
                    Change Customer
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Search Existing Customer (by Name or Phone) *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Type customer name or 10-digit phone number..."
                      value={customerSearch}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No customer found matching "{customerSearch}". Click "+ Add a Brand New Customer" above.
                        </div>
                      ) : (
                        filteredCustomers.slice(0, 8).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setIsDropdownOpen(false);
                            }}
                            className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-800">{c.name}</p>
                              <p className="text-xs text-slate-500">📞 {c.phone_number}</p>
                            </div>
                            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              Select
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-5 bg-amber-50/30 border border-amber-200/80 rounded-2xl">
              {phoneDuplicateCustomer && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-amber-900">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      This phone number already belongs to: <strong>{phoneDuplicateCustomer.name}</strong> ({phoneDuplicateCustomer.phone_number}).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectExistingFromPhone(phoneDuplicateCustomer)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs text-xs shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Select {phoneDuplicateCustomer.name} Instead</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required={isCreatingNewCustomer}
                    placeholder="e.g. K. Murugan"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Door no, street, area, city"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Up to 3 Phone Numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase text-slate-600">
                    Contact Phone Numbers (Up to 3, 10 Digits Only)
                  </label>
                  {secondaryPhones.length < 2 && (
                    <button
                      type="button"
                      onClick={addSecondaryPhone}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Additional Phone Number</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Primary Mobile (10 digits) *</span>
                    <input
                      type="tel"
                      maxLength={10}
                      required={isCreatingNewCustomer}
                      placeholder="10 digits only"
                      value={primaryPhone}
                      onChange={(e) => handlePrimaryPhoneChange(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium mt-0.5 tracking-wider"
                    />
                  </div>

                  {secondaryPhones.map((phone, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">Secondary Mobile {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeSecondaryPhone(idx)}
                          className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10 digits only"
                        value={phone}
                        onChange={(e) => handleSecondaryPhoneChange(idx, e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm mt-0.5 tracking-wider"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ID Proof */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      ID Proof Document Type
                    </label>
                    <select
                      value={idProofType}
                      onChange={(e) => setIdProofType(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Ration Card">Ration Card / Smart Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      ID Proof Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Document number"
                      value={idProofNumber}
                      onChange={(e) => setIdProofNumber(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Capture or Upload ID Document (Optional)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsIdProofCameraOpen(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>Live Capture ID Proof</span>
                    </button>

                    <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload ID File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setIdProofFile(file);
                            setIdProofPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    {idProofPreview && (
                      <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border">
                        <img 
                          src={idProofPreview} 
                          alt="ID" 
                          onClick={() => setViewerImage({ src: idProofPreview, title: "ID Proof Document" })}
                          className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80" 
                        />
                        <span className="text-xs text-emerald-600 font-medium">ID Attached</span>
                        <button type="button" onClick={() => { setIdProofFile(null); setIdProofPreview(null); }} className="cursor-pointer">
                          <X className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Photo */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Customer Photograph (Live Camera or Upload)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCustomerCameraOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Capture Photo</span>
                  </button>

                  <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setCustomerPhoto(file);
                          setCustomerPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>

                  {customerPhotoPreview && (
                    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border border-amber-300">
                      <img 
                        src={customerPhotoPreview} 
                        alt="Customer" 
                        onClick={() => setViewerImage({ src: customerPhotoPreview, title: "Customer Photo" })}
                        className="w-8 h-8 object-cover rounded-full border cursor-pointer hover:opacity-80" 
                      />
                      <span className="text-xs text-emerald-600 font-medium">Photo Ready</span>
                      <button type="button" onClick={() => { setCustomerPhoto(null); setCustomerPhotoPreview(null); }} className="cursor-pointer">
                        <X className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* STEP 2: Loan Financial Terms (Strictly 4 Input Fields)     */}
        {/* ========================================================= */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Step 2: Loan Financial Terms</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Book Loan Number with Live Duplicate Search */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Book Loan # *
                </label>
                {bookNumberStatus?.exists === true && (
                  <span className="text-[11px] font-bold text-rose-600 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Already Exists</span>
                  </span>
                )}
                {bookNumberStatus?.exists === false && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Available</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. 2026-A101"
                value={bookLoanNumber}
                onChange={(e) => setBookLoanNumber(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500 ${
                  bookNumberStatus?.exists ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {bookNumberStatus?.exists && (
                <p className="text-[11px] text-rose-600 mt-1">
                  Book #{bookLoanNumber} belongs to <strong>{bookNumberStatus.loan?.customer_name}</strong> ({bookNumberStatus.loan?.status}).
                </p>
              )}
            </div>

            {/* 2. Total Principal Disbursed Amount (Auto-adjusted from Step 3 item amounts) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Total Disbursed (₹) *
                </label>
                {totalItemAmounts > 0 && (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                    Auto-summed
                  </span>
                )}
              </div>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 25000"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-bold focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 3. Monthly Interest Rate */}
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
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* 4. Checkbox to Deduct 1st Month Interest */}
          <div className="pt-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="deductFirstMonthLoan"
                checked={deductFirstMonthInterest}
                onChange={(e) => setDeductFirstMonthInterest(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="deductFirstMonthLoan" className="ml-2.5 text-sm text-slate-700 cursor-pointer select-none">
                Deduct 1st month interest upfront on disbursement
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* STEP 3: Multi-Item Articles & Separated Metal Weights      */}
        {/* ========================================================= */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Step 3: Pledged Articles Specifications</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Specify Gold/Silver metal type, description, weights, valuation, and live photo per item.
              </p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Article</span>
            </button>
          </div>

          {/* Multi-Item Form Cards */}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Article #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Item</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  {/* 1. Item Type: Gold or Silver */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Item Type *
                    </label>
                    <select
                      value={item.item_type}
                      onChange={(e) => updateItem(idx, 'item_type', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-amber-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* 2. Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1 Gold Chain / Ring"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  {/* 3. Gross Weight */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Gross Wt (g) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="e.g. 16.500"
                      value={item.gross_weight}
                      onChange={(e) => updateItem(idx, 'gross_weight', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold"
                    />
                  </div>

                  {/* 4. Net Weight */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Net Wt (g) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="e.g. 15.800"
                      value={item.net_weight}
                      onChange={(e) => updateItem(idx, 'net_weight', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold"
                    />
                  </div>

                  {/* 5. Item Disbursed Value (Auto-adjusts Step 2 total) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-amber-800 mb-1">
                      Item Value (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 15000"
                      value={item.item_amount}
                      onChange={(e) => updateItem(idx, 'item_amount', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Purity / Quality */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Purity / Quality
                    </label>
                    <select
                      value={item.purity}
                      onChange={(e) => updateItem(idx, 'purity', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm cursor-pointer"
                    >
                      <option value="22K (916)">22K (916)</option>
                      <option value="24K (999)">24K (999)</option>
                      <option value="18K (750)">18K (750)</option>
                      <option value="925 Sterling Silver">925 Sterling Silver</option>
                      <option value="Hallmarked">Hallmarked</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </div>

                  {/* Remarks / Condition */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Remarks / Stone Details
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4 stones, good polish"
                      value={item.quality}
                      onChange={(e) => updateItem(idx, 'quality', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  {/* Per-Item Photo Capture & Zoom Lightbox */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Article Photo
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveCameraItemIndex(idx)}
                        className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs transition cursor-pointer"
                        title="Live Capture Article Photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      <label className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 shadow-2xs cursor-pointer transition">
                        <Upload className="w-4 h-4" />
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
                        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-amber-300 shadow-2xs">
                          <img
                            src={item.photoPreview}
                            alt="Article"
                            onClick={() => setViewerImage({ src: item.photoPreview, title: `Article #${idx + 1} (${item.description || item.item_type})` })}
                            className="w-7 h-7 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            title="Click to Zoom In/Out"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemPhoto(idx, null, null)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ========================================================= */}
          {/* TOTALS BAR: Strictly Separated by Metal Type              */}
          {/* ========================================================= */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
              <span className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>Total Articles: {items.length}</span>
              </span>
              <span>Total Disbursed: <strong className="text-emerald-700 text-sm font-black">₹{totalItemAmounts.toLocaleString()}</strong></span>
            </div>

            <div className="space-y-2">
              {/* Gold Totals */}
              {goldItems.length > 0 && (
                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-950 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">🟡 Gold ({goldItems.length} items):</span>
                  <div className="space-x-4 font-semibold">
                    <span>Total Gold Gross: <strong className="text-slate-900">{goldGross.toFixed(3)} g</strong></span>
                    <span>Total Gold Net: <strong className="text-amber-900 font-black">{goldNet.toFixed(3)} g</strong></span>
                  </div>
                </div>
              )}

              {/* Silver Totals */}
              {silverItems.length > 0 && (
                <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">⚪ Silver ({silverItems.length} items):</span>
                  <div className="space-x-4 font-semibold">
                    <span>Total Silver Gross: <strong className="text-slate-900">{silverGross.toFixed(3)} g</strong></span>
                    <span>Total Silver Net: <strong className="text-slate-950 font-black">{silverNet.toFixed(3)} g</strong></span>
                  </div>
                </div>
              )}

              {/* Other Totals */}
              {otherItems.length > 0 && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">🔵 Other ({otherItems.length} items):</span>
                  <div className="space-x-4 font-semibold">
                    <span>Total Other Gross: <strong className="text-slate-900">{otherGross.toFixed(3)} g</strong></span>
                    <span>Total Other Net: <strong className="text-blue-950 font-black">{otherNet.toFixed(3)} g</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appraised Valuation Field */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Total Appraised Valuation (₹)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 50000"
              value={appraisedValue}
              onChange={(e) => setAppraisedValue(e.target.value)}
              className="w-full max-w-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold"
            />
          </div>
        </div>

        {/* Submission Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || bookNumberStatus?.exists}
            className="px-6 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            {loading ? "Recording Pledge..." : "Complete & Disburse Loan"}
          </button>
        </div>
      </form>

      {/* Live Camera Modals */}
      <CameraCaptureModal
        isOpen={isCustomerCameraOpen}
        onClose={() => setIsCustomerCameraOpen(false)}
        title="Live Capture Customer Photograph"
        onCapture={(file, previewUrl) => {
          setCustomerPhoto(file);
          setCustomerPhotoPreview(previewUrl);
        }}
      />

      <CameraCaptureModal
        isOpen={isIdProofCameraOpen}
        onClose={() => setIsIdProofCameraOpen(false)}
        title="Live Capture ID Document Proof"
        onCapture={(file, previewUrl) => {
          setIdProofFile(file);
          setIdProofPreview(previewUrl);
        }}
      />

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

      {/* Zoom In/Out Lightbox Modal */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        src={viewerImage?.src}
        title={viewerImage?.title}
      />
    </div>
  );
}