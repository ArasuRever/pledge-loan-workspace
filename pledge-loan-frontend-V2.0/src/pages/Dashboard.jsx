// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);

  if (loading) return <div className="text-center mt-10">Loading dashboard data...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Customers</h3>
        <p className="text-4xl font-bold text-gray-800 mt-2">0</p>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 flex flex-col">
        <h3 className="text-amber-600 text-sm font-semibold uppercase tracking-wider">Pending Gold (g)</h3>
        <p className="text-4xl font-bold text-gray-800 mt-2">0.000</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Pending Silver (g)</h3>
        <p className="text-4xl font-bold text-gray-800 mt-2">0.000</p>
      </div>

    </div>
  );
}