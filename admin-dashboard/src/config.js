// Central API configuration for Need2Done Admin Dashboard
// Dynamically checks window.location at runtime so production (https://need2done.in)
// ALWAYS uses relative '/api' regardless of build-time environment variables.

export const API_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? '/api'
    : (import.meta.env.VITE_API_URL || '/api');

export default API_URL;
