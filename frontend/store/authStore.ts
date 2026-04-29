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
    sessionChecked: boolean;
    setAuth: (user: User, accessToken: string) => void;
    setAccessToken: (accessToken: string | null) => void;
    setSessionChecked: (sessionChecked: boolean) => void;
    clearAuth: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            sessionChecked: false,
            setAuth: (user, accessToken) => set({ user, accessToken, sessionChecked: true }),
            setAccessToken: (accessToken) => set({ accessToken }),
            setSessionChecked: (sessionChecked) => set({ sessionChecked }),
            clearAuth: () => {
                set({ user: null, accessToken: null, sessionChecked: true });
            },
            setUser: (user) => set({ user }),
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
            }),
        }
    )
);
