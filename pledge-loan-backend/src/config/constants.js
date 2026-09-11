require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'a-very-strong-secret-key-that-you-should-change',
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'https://pledge-loan-frontend.onrender.com',
    'exp://192.168.29.6:8081'
  ],
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
  }
};