"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuth } = useAuthStore();

    async function handleSocialLogin(accessToken: string, refreshToken: string) {
        try {
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);

            const { data: user } = await api.get("/auth/me");

            setAuth(user, accessToken, refreshToken);

            toast.success(`Welcome back, ${user.firstName}!`);

            if (user.role === "ADMIN") {
                router.push("/admin/dashboard");
            } else if (user.role === "DRIVER") {
                if (user.status === "PENDING" || user.status === "AWAITING_APPROVAL") {
                    router.push("/driver/onboarding");
                } else {
                    router.push("/driver/dashboard");
                }
            } else {
                router.push("/user/dashboard");
            }
        } catch (error: any) {
            console.error("Social login sync error:", error);
            toast.error("Authentication synchronization failed");
            router.push("/login?error=sync_failed");
        }
    }

    useEffect(() => {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");

        if (accessToken && refreshToken) {
            handleSocialLogin(accessToken, refreshToken);
        } else {
            console.error("No tokens found in callback URL");
            router.push("/login?error=no_tokens");
        }
    }, [searchParams, router]);

    return (
        <div className="h-screen bg-bg-main flex flex-col items-center justify-center gap-6 transition-colors duration-500">
            <div className="relative">
                <Loader2 className="w-16 h-16 text-[#FFD700] animate-spin" />
                <div className="absolute inset-0 bg-[#FFD700]/10 rounded-full blur-2xl"></div>
            </div>
            <div className="text-center">
                <h2 className="text-[#0A192F] dark:text-white font-bold text-xl mb-2">Syncing your account...</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Please wait while we set up your session.</p>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-bg-main flex items-center justify-center transition-colors duration-500">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
