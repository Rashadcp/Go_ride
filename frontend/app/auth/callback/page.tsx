"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
    const router = useRouter();
    const { setAuth } = useAuthStore();

    useEffect(() => {
        const syncSocialLogin = async () => {
            try {
                const refreshResponse = await api.post("/auth/refresh-token");
                const accessToken = refreshResponse.data?.accessToken;

                if (!accessToken) {
                    throw new Error("Missing access token after social login");
                }

                const { data: user } = await api.get("/auth/me");

                setAuth(user, accessToken);

                toast.success(`Welcome back, ${user.name}!`);

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
            } catch (error) {
                console.error("Social login sync error:", error);
                toast.error("Authentication synchronization failed");
                router.push("/login?error=sync_failed");
            }
        };

        void syncSocialLogin();
    }, [router, setAuth]);

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
