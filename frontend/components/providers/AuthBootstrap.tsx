"use client";

import { useEffect } from "react";
import api, { isUsableAuthToken, refreshAccessToken } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function AuthBootstrap() {
    const { accessToken, setSessionChecked, setUser, clearAuth, sessionChecked } = useAuthStore();

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
                    if (!isUsableAuthToken(currentRefreshToken)) {
                        clearAuth();
                        return;
                    } else {
                        currentAccessToken = await refreshAccessToken();
                    }
                }

                if (isUsableAuthToken(currentAccessToken)) {
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
    }, [accessToken, clearAuth, sessionChecked, setSessionChecked, setUser]);

    return null;
}
