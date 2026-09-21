import React from 'react';
import { Printer, Shield } from 'lucide-react';

export default function PrintableInvoice({ loan, customer, pledgedItem, calculated, settings }) {
  const handlePrint = () => {
    window.print();
  };

  // Extract all articles from loan or fallback to single item
  const allItems = (loan?.items && loan.items.length > 0) ? loan.items : (pledgedItem ? [pledgedItem] : []);

  // Separate calculations strictly by metal type
  const goldItems = allItems.filter(it => (it.item_type || '').toLowerCase().includes('gold'));
  const silverItems = allItems.filter(it => (it.item_type || '').toLowerCase().includes('silver'));
  const otherItems = allItems.filter(it => !(it.item_type || '').toLowerCase().includes('gold') && !(it.item_type || '').toLowerCase().includes('silver'));

  const goldGross = goldItems.reduce((acc, it) => acc + parseFloat(it.gross_weight || 0), 0);
  const goldNet = goldItems.reduce((acc, it) => acc + parseFloat(it.net_weight || it.gross_weight || 0), 0);

  const silverGross = silverItems.reduce((acc, it) => acc + parseFloat(it.gross_weight || 0), 0);
  const silverNet = silverItems.reduce((acc, it) => acc + parseFloat(it.net_weight || it.gross_weight || 0), 0);

  const otherGross = otherItems.reduce((acc, it) => acc + parseFloat(it.gross_weight || 0), 0);
  const otherNet = otherItems.reduce((acc, it) => acc + parseFloat(it.net_weight || it.gross_weight || 0), 0);

  return (
    <div>
      {/* Print Trigger Button (Hidden when printing) */}
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-sm transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Pledge Voucher / Receipt</span>
        </button>
      </div>

      {/* Printable Voucher Form */}
      <div 
        id="printable-voucher" 
        className="bg-white p-8 border border-slate-200 rounded-2xl print:border-none print:p-0 text-slate-900 text-xs"
      >
        {/* Business Header */}
        <div className="text-center pb-5 border-b-2 border-slate-800">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {settings?.business_name || "Sri KuberaLakshmi Bankers"}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">{settings?.address || "12/A, Bazaar Street, Main Road, Omalur, Salem - 636455"}</p>
          <p className="text-xs text-slate-600">
            Phone: <strong>{settings?.phone_number || "9842012345"}</strong> | License No: <strong>{settings?.license_number || "ML-Salem-2026/04"}</strong>
          </p>
          <div className="mt-2.5 inline-block px-4 py-1 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-widest">
            Gold & Silver Pawn Pledge Token / Loan Voucher
          </div>
        </div>

        {/* Loan & Customer Grid */}
        <div className="grid grid-cols-2 gap-6 my-5 text-xs">
          <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pledger / Customer Details</p>
            <p className="font-bold text-slate-900 text-sm">{customer?.name}</p>
            <p className="text-slate-600 font-medium">📞 Phone: {customer?.phone_number}</p>
            {customer?.address && <p className="text-slate-600">📍 Address: {customer.address}</p>}
            {customer?.id_proof_number && (
              <p className="text-slate-600">🪪 ID: {customer.id_proof_type || "Aadhaar"}: {customer.id_proof_number}</p>
            )}
          </div>

          <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Loan & Interest Terms</p>
            <p className="font-black text-amber-800 text-base">Book Loan #{loan?.book_loan_number}</p>
            <p className="text-slate-700">Pledge Date: <strong>{loan?.pledge_date}</strong></p>
            <p className="text-slate-700">Due Date: <strong>{loan?.due_date}</strong></p>
            <p className="text-slate-900 font-bold text-[13px]">
              Monthly Interest Rate: <span className="text-amber-800">{loan?.interest_rate}%</span> / month
            </p>
          </div>
        </div>

        {/* Multi-Item Pledged Articles Table */}
        <div className="my-5 border border-slate-300 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-2.5 border-r border-slate-300 w-8 text-center">#</th>
                <th className="p-2.5 border-r border-slate-300">Metal</th>
                <th className="p-2.5 border-r border-slate-300">Description</th>
                <th className="p-2.5 border-r border-slate-300 text-right">Gross Wt</th>
                <th className="p-2.5 border-r border-slate-300 text-right">Net Wt</th>
                <th className="p-2.5 border-r border-slate-300">Purity</th>
                <th className="p-2.5 border-r border-slate-300 text-center w-16">Photo</th>
                <th className="p-2.5 text-right">Pledged Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {allItems.map((item, idx) => (
                <tr key={idx} className="align-middle">
                  <td className="p-2.5 border-r border-slate-200 text-slate-500 font-bold text-center">{idx + 1}</td>
                  <td className="p-2.5 border-r border-slate-200 font-bold text-amber-900">{item.item_type || "Gold"}</td>
                  <td className="p-2.5 border-r border-slate-200 font-medium">{item.description || "-"}</td>
                  <td className="p-2.5 border-r border-slate-200 text-right font-semibold">{parseFloat(item.gross_weight || item.weight || 0).toFixed(3)} g</td>
                  <td className="p-2.5 border-r border-slate-200 text-right font-bold text-slate-900">{parseFloat(item.net_weight || item.gross_weight || 0).toFixed(3)} g</td>
                  <td className="p-2.5 border-r border-slate-200">{item.purity || "22K"}</td>
                  {/* Photo between Purity and Pledged Value */}
                  <td className="p-2 border-r border-slate-200 text-center">
                    {item.item_image_data_url ? (
                      <img
                        src={item.item_image_data_url}
                        alt="Article"
                        className="w-12 h-12 object-cover rounded border border-slate-300 mx-auto"
                      />
                    ) : (
                      <span className="text-slate-400 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-black text-slate-900">
                    {parseFloat(item.item_value || 0) > 0 ? `₹${parseFloat(item.item_value).toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-xs">
              {/* Row 1: Total Principal */}
              <tr className="bg-slate-100/90 font-black border-b border-slate-300">
                <td colSpan={7} className="p-2.5 text-right uppercase tracking-wider text-[11px] text-slate-700">
                  Total Principal Disbursed:
                </td>
                <td className="p-2.5 text-right text-sm text-slate-950 font-black">
                  ₹{parseFloat(loan?.principal_amount || 0).toLocaleString()}
                </td>
              </tr>

              {/* Row 2: Gold Weights Separated */}
              {goldItems.length > 0 && (
                <tr className="bg-white text-amber-950 border-b border-slate-200">
                  <td colSpan={3} className="p-2 text-right">🟡 Total Gold Articles ({goldItems.length}):</td>
                  <td className="p-2 text-right font-bold">Total Gold Gross: {goldGross.toFixed(3)} g</td>
                  <td className="p-2 text-right font-black text-amber-900">Total Gold Net: {goldNet.toFixed(3)} g</td>
                  <td colSpan={3}></td>
                </tr>
              )}

              {/* Row 3: Silver Weights Separated */}
              {silverItems.length > 0 && (
                <tr className="bg-white text-slate-900">
                  <td colSpan={3} className="p-2 text-right">⚪ Total Silver Articles ({silverItems.length}):</td>
                  <td className="p-2 text-right font-bold">Total Silver Gross: {silverGross.toFixed(3)} g</td>
                  <td className="p-2 text-right font-black text-slate-950">Total Silver Net: {silverNet.toFixed(3)} g</td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Financial Details Summary */}
        <div className="grid grid-cols-2 gap-6 my-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
          <div className="space-y-1">
            <p className="text-slate-600">
              Disbursed Principal: <strong className="text-slate-900 text-sm">₹{parseFloat(loan?.principal_amount || 0).toLocaleString()}</strong>
            </p>
            <p className="text-slate-600">
              Agreed Interest Rate: <strong>{loan?.interest_rate}% per month</strong>
            </p>
            {loan?.appraised_value > 0 && (
              <p className="text-slate-600">
                Total Appraised Valuation: <strong>₹{parseFloat(loan.appraised_value).toLocaleString()}</strong>
              </p>
            )}
          </div>
          <div className="space-y-1 text-right">
            {calculated && (
              <>
                <p className="text-slate-600">
                  Accrued Interest to Date: <strong className="text-amber-800">₹{calculated.outstandingInterest?.toLocaleString()}</strong>
                </p>
                <p className="text-slate-900 font-bold text-sm">
                  Total Settlement Due Today: <strong className="text-emerald-700">₹{calculated.amountDue?.toLocaleString()}</strong>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Declaration & Terms in Ordered List */}
        <div className="my-5 p-4 border border-slate-300 rounded-xl bg-slate-50/50 space-y-1.5 text-[11px] leading-relaxed text-slate-700">
          <p className="font-bold uppercase tracking-wider text-slate-900 text-xs flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-700" />
            <span>Declaration & Terms:</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 font-medium text-slate-800">
            <li>I acknowledge receipt of the principal amount mentioned above.</li>
            <li>I declare that I am the absolute owner of these articles.</li>
            <li>If interest is unpaid for 12 months, the lender can auction the articles.</li>
            <li>Net weight is approximate after deducting stone/enamel weight.</li>
          </ol>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-10 text-center text-xs text-slate-700">
          <div>
            <div className="border-t border-slate-400 w-3/4 mx-auto mb-1.5"></div>
            <p className="font-bold text-slate-800">Customer Signature / Thumb Impression</p>
          </div>
          <div>
            <div className="border-t border-slate-400 w-3/4 mx-auto mb-1.5"></div>
            <p className="font-bold text-slate-800">Authorized Signatory & Seal</p>
          </div>
        </div>
      </div>
    </div>
  );
}