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

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionChecked: false,
            setAuth: (user, accessToken, refreshToken) => 
                set((state) => ({ user, accessToken, refreshToken: refreshToken || state.refreshToken, sessionChecked: true })),
            setAccessToken: (accessToken) => set({ accessToken }),
            setRefreshToken: (refreshToken) => set({ refreshToken }),
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
