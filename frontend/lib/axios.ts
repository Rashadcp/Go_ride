import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/api',
    withCredentials: true,
});

// api.defaults.baseURL log removed for cleaner console

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    (config) => {
        // Reduced logging
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('❌ API Error:', error.response?.status, error.response?.data || error.message);

        // Handle Session Expiration (401)
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            // Don't redirect if we're already on login/register/forgot-password or home
            const publicPaths = ['/login', '/register', '/forgot-password', '/'];
            if (!publicPaths.includes(currentPath)) {
                localStorage.clear();
                window.location.href = '/login?expired=true';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
