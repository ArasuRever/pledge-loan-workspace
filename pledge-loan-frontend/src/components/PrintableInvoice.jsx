import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintableInvoice({ loan, customer, pledgedItem, calculated, settings }) {
  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-xs transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Voucher / Slip</span>
        </button>
      </div>

      <div className="bg-white p-8 border border-slate-200 rounded-2xl print:border-none print:p-0">
        <div className="text-center pb-6 border-b border-slate-300">
          <h2 className="text-2xl font-black text-slate-900 uppercase">
            {settings?.business_name || "Sri KuberaLakshmi Bankers"}
          </h2>
          <p className="text-xs text-slate-600 mt-1">{settings?.address}</p>
          <p className="text-xs text-slate-600">Phone: {settings?.phone_number} | License: {settings?.license_number}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold uppercase tracking-widest text-slate-700">
            Gold Loan Pledge Token / Receipt
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 my-6 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase text-slate-400">Customer Details</p>
            <p className="font-bold text-slate-900 text-base">{customer?.name}</p>
            <p className="text-slate-600">{customer?.phone_number}</p>
            <p className="text-slate-600">{customer?.address}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-bold uppercase text-slate-400">Loan Details</p>
            <p className="font-bold text-amber-700 text-base">Loan #{loan?.book_loan_number}</p>
            <p className="text-slate-600">Pledge Date: {loan?.pledge_date}</p>
            <p className="text-slate-600">Due Date: {loan?.due_date}</p>
          </div>
        </div>

        <div className="my-6 border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="p-3">Pledged Article</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Gross Wt.</th>
                <th className="p-3 text-right">Net Wt.</th>
                <th className="p-3 text-right">Purity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="p-3 font-semibold">{pledgedItem?.item_type || "Gold"}</td>
                <td className="p-3">{pledgedItem?.description || "-"}</td>
                <td className="p-3 text-right">{pledgedItem?.gross_weight || pledgedItem?.weight || 0} g</td>
                <td className="p-3 text-right">{pledgedItem?.net_weight || 0} g</td>
                <td className="p-3 text-right">{pledgedItem?.purity || "22K"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end my-6 text-sm">
          <div className="w-64 space-y-2 text-right">
            <div className="flex justify-between text-slate-600">
              <span>Principal Amount:</span>
              <span className="font-bold text-slate-900">₹{parseFloat(loan?.principal_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Monthly Rate:</span>
              <span className="font-bold text-slate-900">{loan?.interest_rate}%</span>
            </div>
            {calculated && (
              <div className="flex justify-between text-slate-900 font-black text-base pt-2 border-t border-slate-200">
                <span>Total Amount Due:</span>
                <span>₹{calculated.amountDue?.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-16 text-center text-xs text-slate-600">
          <div>
            <div className="border-t border-slate-300 w-3/4 mx-auto mb-1"></div>
            <p>Customer Signature</p>
          </div>
          <div>
            <div className="border-t border-slate-300 w-3/4 mx-auto mb-1"></div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}