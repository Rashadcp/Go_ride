import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
    id: string;
    name: string;
    email: string;
    role: "USER" | "DRIVER" | "ADMIN";
    profilePhoto?: string;
    status?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    vehicleModel?: string;
    rating?: number;
    totalReviews?: number;
    _id?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    sessionChecked: boolean;
    setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
    setAccessToken: (accessToken: string | null) => void;
    setRefreshToken: (refreshToken: string | null) => void;
    setSessionChecked: (sessionChecked: boolean) => void;
    clearAuth: () => void;
    setUser: (user: User) => void;
}

const normalizeAuthToken = (token?: string | null) => {
    if (typeof token !== "string") return null;

    const trimmedToken = token.trim();
    if (!trimmedToken || trimmedToken === "undefined" || trimmedToken === "null") return null;

    return trimmedToken.split(".").length === 3 ? trimmedToken : null;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionChecked: false,
            setAuth: (user, accessToken, refreshToken) =>
                set((state) => ({
                    user,
                    accessToken: normalizeAuthToken(accessToken),
                    refreshToken: normalizeAuthToken(refreshToken) || normalizeAuthToken(state.refreshToken),
                    sessionChecked: true,
                })),
            setAccessToken: (accessToken) => set({ accessToken: normalizeAuthToken(accessToken) }),
            setRefreshToken: (refreshToken) => set({ refreshToken: normalizeAuthToken(refreshToken) }),
            setSessionChecked: (sessionChecked) => set({ sessionChecked }),
            clearAuth: () => {
                set({ user: null, accessToken: null, refreshToken: null, sessionChecked: true });
            },
            setUser: (user) => set({ user }),
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                refreshToken: state.refreshToken,
            }),
        }
    )
);
