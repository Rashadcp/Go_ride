"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SocialAuth from "@/components/auth/SocialAuth";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";

import { Eye, EyeOff, Navigation, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const { setAuth } = useAuthStore();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post("/auth/login", { email, password });
            const { accessToken, refreshToken, user } = response.data;

            setAuth(user, accessToken, refreshToken);
            toast.success(`Welcome back, ${user.name}!`);

            // 4. Smart Redirect
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
            toast.error(error.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-main text-text-main flex overflow-hidden transition-colors duration-500">
            {/* --- Left Side: Form --- */}
            <div className="w-full lg:w-1/2 flex flex-col px-8 md:px-16 lg:px-24 py-8 relative z-10 transition-colors duration-500 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
                        <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center shadow-lg shadow-[#FFD700]/20 group-hover:scale-110 transition-transform">
                            <Navigation className="w-5 h-5 text-[#0A192F]" />
                        </div>
                        <span className="font-black text-xl tracking-tighter text-[#0A192F] dark:text-white uppercase italic">Go<span className="text-[#FFD700]">Ride</span></span>
                    </div>
                </div>

                <div className="max-w-md w-full mx-auto my-auto py-4">
                    <div className="mb-8">
                        <h1 className="text-4xl font-black text-[#0A192F] dark:text-white mb-2 tracking-tight">Identity Login</h1>
                        <p className="text-[#0A192F] dark:text-slate-400 font-medium text-base leading-tight">Access your Go Ride command center.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#0A192F] dark:text-slate-400 mb-2 ml-1">Secure Email</label>
                            <input
                                type="email"
                                required
                                className="w-full px-5 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] focus:ring-4 ring-[#FFD700]/5 transition-all font-medium shadow-sm"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2 ml-1">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#0A192F] dark:text-slate-400">Password</label>
                                <a href="/forgot-password" className="text-[#FFD700] hover:underline text-[10px] font-black uppercase tracking-widest">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full px-5 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] focus:ring-4 ring-[#FFD700]/5 transition-all font-medium pr-14 shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#FFD700] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-[#FFD700] text-[#0A192F] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-[#FFD700]/20 hover:bg-[#FFC000] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-xs"
                        >
                            {loading ? "Authenticating..." : "Sign In to Account"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <SocialAuth mode="login" />

                    <p className="mt-10 text-center text-[#0A192F] dark:text-slate-400 text-sm font-medium">
                        New to Go Ride?{" "}
                        <a href="/register" className="text-[#FFD700] font-black hover:underline uppercase tracking-widest text-[11px] ml-1">Create Account</a>
                    </p>
                </div>
            </div>

            {/* --- Right Side: Image --- */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#0A192F]">
                <img
                    src="/images/login-bg.png"
                    alt="Login Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 hover:scale-100 transition-transform duration-[10s] ease-linear"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/20 to-transparent"></div>
                <div className="absolute bottom-20 left-16 right-16">
                    <div className="p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-[40px] shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-[#FFD700] flex items-center justify-center text-[#0A192F] font-black shadow-glow">
                                GR
                            </div>
                            <div>
                                <h3 className="text-white font-black text-xl tracking-tight">Move Smarter, Drive Better.</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Join 10,000+ active riders today</p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed font-medium">
                            Experience the premium ride-sharing platform designed for both speed and safety. Whether you're commuting or navigating your city, Go Ride gets you there.
                        </p>
                    </div>
                </div>

                {/* Floating Elements for Premium Feel */}
                <div className="absolute top-20 right-20 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute middle-0 left-10 w-24 h-24 bg-[#FFD700]/5 rounded-full blur-2xl"></div>
            </div>
        </div>
    );
}
