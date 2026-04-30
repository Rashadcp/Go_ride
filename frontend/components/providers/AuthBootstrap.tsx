"use client";

import { useEffect } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function AuthBootstrap() {
    const { accessToken, user, setAccessToken, setSessionChecked, setUser, clearAuth, sessionChecked } = useAuthStore();

    useEffect(() => {
        if (sessionChecked) {
            return;
        }

        let isCancelled = false;

        const bootstrapAuth = async () => {
            try {
                let currentAccessToken = accessToken;

                if (!currentAccessToken) {
                    const currentRefreshToken = useAuthStore.getState().refreshToken;
                    const refreshResponse = await api.post("/auth/refresh-token", { refreshToken: currentRefreshToken });
                    currentAccessToken = refreshResponse.data?.accessToken || null;
                    const newRefreshToken = refreshResponse.data?.refreshToken || null;

                    if (currentAccessToken) {
                        setAccessToken(currentAccessToken);
                    }
                    if (newRefreshToken) {
                        useAuthStore.getState().setRefreshToken(newRefreshToken);
                    }
                }

                if (currentAccessToken || user) {
                    const { data } = await api.get("/auth/me");
                    if (!isCancelled) {
                        setUser(data);
                    }
                }
            } catch {
                if (!isCancelled && !useAuthStore.getState().accessToken) {
                    clearAuth();
                }
            } finally {
                if (!isCancelled) {
                    setSessionChecked(true);
                }
            }
        };

        void bootstrapAuth();

        return () => {
            isCancelled = true;
        };
    }, [accessToken, clearAuth, sessionChecked, setAccessToken, setSessionChecked, setUser, user]);

    return null;
}
