import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
    withCredentials: true,
});

let refreshRequest: Promise<string | null> | null = null;

const redirectToLogin = () => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    const publicPaths = ['/login', '/register', '/forgot-password', '/'];

    if (!publicPaths.includes(currentPath)) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login?expired=true';
    }
};

const setAuthorizationHeader = (config: RetryableRequestConfig, token: string) => {
    const headers = AxiosHeaders.from(config.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
};

const refreshAccessToken = async () => {
    if (typeof window === 'undefined') return null;

    if (!refreshRequest) {
        refreshRequest = api
            .post('/auth/refresh-token')
            .then((response) => {
                const { accessToken } = response.data;

                if (!accessToken) {
                    throw new Error('Token refresh response is incomplete');
                }

                useAuthStore.getState().setAccessToken(accessToken);

                return accessToken as string;
            })
            .catch((refreshError) => {
                useAuthStore.getState().clearAuth();
                throw refreshError;
            })
            .finally(() => {
                refreshRequest = null;
            });
    }

    return refreshRequest;
};

api.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? useAuthStore.getState().accessToken : null;

        if (token) {
            setAuthorizationHeader(config as RetryableRequestConfig, token);
        }

        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        console.error('API Error:', error.response?.status, error.response?.data || error.message);

        const originalRequest = error.config as RetryableRequestConfig | undefined;
        const requestUrl = originalRequest?.url || '';

        if (
            error.response?.status === 401 &&
            typeof window !== 'undefined' &&
            originalRequest &&
            !originalRequest._retry &&
            !requestUrl.includes('/auth/login') &&
            !requestUrl.includes('/auth/register') &&
            !requestUrl.includes('/auth/refresh-token')
        ) {
            originalRequest._retry = true;

            try {
                const newAccessToken = await refreshAccessToken();

                if (!newAccessToken) {
                    redirectToLogin();
                    return Promise.reject(error);
                }

                setAuthorizationHeader(originalRequest, newAccessToken);
                return api(originalRequest);
            } catch (refreshError) {
                redirectToLogin();
                return Promise.reject(refreshError);
            }
        }

        if (error.response?.status === 401) {
            redirectToLogin();
        }

        return Promise.reject(error);
    }
);

export default api;
