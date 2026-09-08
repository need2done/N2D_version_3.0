// Central API configuration for Need2Done Admin Dashboard
// Defaults to relative path '/api' so that in production (https://need2done.in)
// requests route to https://need2done.in/api/ automatically via Nginx reverse proxy.

export const API_URL = import.meta.env.VITE_API_URL || '/api';
