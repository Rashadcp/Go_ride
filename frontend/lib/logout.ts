import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export const logoutUser = async () => {
    try {
        const refreshToken = useAuthStore.getState().refreshToken;
        await api.post("/auth/logout", { refreshToken });
    } catch (error) {
        console.error("Logout request failed:", error);
    } finally {
        useAuthStore.getState().clearAuth();
    }
};
