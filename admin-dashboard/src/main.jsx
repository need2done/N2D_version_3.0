import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App.jsx';

// Configure global Axios interceptor to attach Bearer adminToken
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Intercept native fetch to automatically attach Authorization header
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    let [resource, config] = args;
    config = config || {};
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers = {
            ...(config.headers || {}),
            'Authorization': `Bearer ${token}`
        };
    }
    return originalFetch.call(this, resource, config);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
