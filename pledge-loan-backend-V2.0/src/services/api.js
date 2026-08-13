// src/services/api.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  // Customers
  getCustomers: () => fetch(`${API_BASE_URL}/customers`).then(res => res.json()),
  createCustomer: (data) => fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  // Loans
  getLoanDetails: (id) => fetch(`${API_BASE_URL}/loans/${id}`).then(res => res.json()),
  createLoan: (data) => fetch(`${API_BASE_URL}/loans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  // Transactions
  logTransaction: (data) => fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json())
};