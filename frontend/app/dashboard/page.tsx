"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import api from "@/lib/axios";

function DashboardRedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");

        if (accessToken && refreshToken) {
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);

            // Fetch user info to store role and handle redirection
            const verifyUser = async () => {
                try {
                    const response = await api.get("/auth/me");
                    const user = response.data;
                    localStorage.setItem("userRole", user.role);

                    toast.success(`Welcome back, ${user.name}!`);

                    if (user.role === "DRIVER" && user.status === "PENDING") {
                        router.push("/driver/onboarding");
                    } else if (user.role === "USER") {
                        router.push("/user/dashboard");
                    } else {
                        // For approved drivers or generic users
                        router.push("/user/dashboard");
                    }
                } catch (error) {
                    console.error("Verification failed", error);
                    router.push("/login");
                }
            };

            verifyUser();
        } else {
            // Check if already logged in or redirect
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/login");
            } else {
                router.push("/user/dashboard");
            }
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#0B1215] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#00D181] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-medium">Verifying your account...</p>
            </div>
        </div>
    );
}

export default function DashboardRedirect() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0B1215] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#00D181] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-medium">Preparing dashboard...</p>
                    </div>
                </div>
            }
        >
            <DashboardRedirectContent />
        </Suspense>
    );
}
