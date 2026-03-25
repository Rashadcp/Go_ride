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
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    clearAuth: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            setAuth: (user, accessToken, refreshToken) => {
                set({ user, accessToken, refreshToken });
                // Also set in localStorage for non-zustand access if needed
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);
                localStorage.setItem("userRole", user.role);
            },
            clearAuth: () => {
                set({ user: null, accessToken: null, refreshToken: null });
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("userRole");
            },
            setUser: (user) => set({ user }),
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
