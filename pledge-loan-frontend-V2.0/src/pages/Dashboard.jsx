import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data to populate the dashboard
    api.getCustomers()
      .then(data => {
        setCustomers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch customers:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">Total Active Customers</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{customers.length}</p>
      </div>
      
      {/* We will add Gold/Silver weight balance cards here next */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">Pending Gold (g)</h3>
        <p className="text-3xl font-bold text-amber-500 mt-2">0.000</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">Pending Silver (g)</h3>
        <p className="text-3xl font-bold text-slate-400 mt-2">0.000</p>
      </div>
    </div>
  );
}