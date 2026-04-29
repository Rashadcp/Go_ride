import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export const logoutUser = async () => {
    try {
        await api.post("/auth/logout");
    } catch (error) {
        console.error("Logout request failed:", error);
    } finally {
        useAuthStore.getState().clearAuth();
    }
};
