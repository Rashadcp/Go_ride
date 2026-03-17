import api from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export const useUser = () => {
    const { setUser, user: storeUser } = useAuthStore();

    const query = useQuery({
        queryKey: ["user", "me"],
        queryFn: async () => {
            const { data } = await api.get("/auth/me");
            return data;
        },
        // Only run if we have a token or need refreshing
        enabled: typeof window !== "undefined" && !!localStorage.getItem("accessToken"),
    });

    // Sync with zustand store
    useEffect(() => {
        if (query.data) {
            setUser(query.data);
        }
    }, [query.data, setUser]);

    return {
        user: query.data || storeUser,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch
    };
};
