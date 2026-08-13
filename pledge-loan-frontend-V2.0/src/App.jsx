// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {/* We will build these next */}
          {/* <Route path="/customers" element={<CustomersPage />} /> */}
          {/* <Route path="/loans" element={<LoansPage />} /> */}
        </Routes>
      </AdminLayout>
    </Router>
  );
}

export default App;