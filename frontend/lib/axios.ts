import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const isUsableAuthToken = (token: unknown): token is string => {
    if (typeof token !== 'string') return false;

    const trimmedToken = token.trim();
    if (!trimmedToken || trimmedToken === 'undefined' || trimmedToken === 'null') return false;

    return trimmedToken.split('.').length === 3;
};

const authApi = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export const refreshAuthSession = async (refreshToken: string) => {
    if (!isUsableAuthToken(refreshToken)) {
        throw new Error('Missing refresh token');
    }

    const { data } = await authApi.post('/auth/refresh-token', { refreshToken });
    return data as { accessToken?: string; refreshToken?: string };
};

const api = axios.create({
    baseURL: API_BASE_URL,
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

export const refreshAccessToken = async () => {
    if (typeof window === 'undefined') return null;

    const currentRefreshToken = useAuthStore.getState().refreshToken;
    if (!isUsableAuthToken(currentRefreshToken)) {
        useAuthStore.getState().clearAuth();
        return null;
    }

    if (!refreshRequest) {
        refreshRequest = refreshAuthSession(currentRefreshToken)
            .then(({ accessToken, refreshToken }) => {

                if (!isUsableAuthToken(accessToken)) {
                    throw new Error('Token refresh response is incomplete');
                }

                useAuthStore.getState().setAccessToken(accessToken);
                if (isUsableAuthToken(refreshToken)) {
                    useAuthStore.getState().setRefreshToken(refreshToken);
                }

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
