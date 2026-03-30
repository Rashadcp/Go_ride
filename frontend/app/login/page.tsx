"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SocialAuth from "@/components/auth/SocialAuth";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

import { Eye, EyeOff, Navigation, ArrowRight, ShieldCheck, Mail, Lock } from "lucide-react";

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
        <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] flex font-[family-name:var(--font-roboto)] overflow-hidden transition-all duration-500">
            {/* Left Side: Editorial Form */}
            <div className="w-full lg:w-[45%] flex flex-col px-6 sm:px-12 lg:px-20 py-8 relative z-10">
                <div className="flex items-center gap-3 cursor-pointer group mb-12 sm:mb-20" onClick={() => router.push("/")}>
                    <div className="w-9 h-9 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Navigation className="w-5 h-5 text-[#FFD700] fill-current" strokeWidth={1.5} />
                    </div>
                    <span className="font-[family-name:var(--font-montserrat)] font-black text-xl tracking-tighter uppercase text-[#1A1A1A]">GO<span className="text-[#FFD700]">RIDE</span></span>
                </div>

                <div className="max-w-md w-full mx-auto lg:ml-0 my-auto pb-10">
                    <div className="mb-10 font-[family-name:var(--font-montserrat)] text-center sm:text-left">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] mb-3 block">Welcome Back</span>
                        <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-tighter uppercase leading-tight">Sign <br /> <span className="text-[#B8860B]">In</span></h1>
                        <p className="text-[#4A4A48] font-semibold text-sm leading-relaxed border-l-2 border-[#FFD700] pl-4 font-[family-name:var(--font-roboto)] text-left">
                            Good to see you again! Log in to continue your journey.
                        </p>
                    </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]">Email</label>
                        <Mail className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full px-5 py-4 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] focus:bg-white focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-sm"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]">Password</label>
                        <a href="/forgot-password" className="text-[#B8860B] hover:text-[#FFD700] text-[10px] font-black uppercase tracking-widest transition-colors">Forgot?</a>
                    </div>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            className="w-full px-5 py-4 bg-[#F9F9F7] border border-[#E5E5E0] rounded-2xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] focus:bg-white focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-sm"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#1A1A1A] transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full py-5 bg-[#1A1A1A] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] text-[10px] flex items-center justify-center gap-3 border-none"
                        >
                            Sign In <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>

                    <SocialAuth mode="login" />

                    <div className="mt-12 text-center sm:text-left pt-6 border-t border-[#E5E5E0]">
                        <p className="text-[#4A4A48] text-[11px] font-black uppercase tracking-widest leading-tight">
                            New here?{" "}
                            <a href="/register" className="text-[#FFD700] hover:text-[#B8860B] transition-colors ml-2 underline decoration-2 underline-offset-4">Create an Account</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Editorial Canvas */}
            <div className="hidden lg:flex lg:w-[55%] bg-[#0A192F] relative items-center justify-center overflow-hidden">
                <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-[#FFD700]/5 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-white/5 rounded-full blur-[120px]"></div>

                <div className="relative z-10 text-center px-12">
                    <div className="w-16 h-16 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full flex items-center justify-center mx-auto mb-10">
                        <ShieldCheck className="w-8 h-8 text-[#FFD700]" strokeWidth={1} />
                    </div>
                    <h2 className="text-6xl font-[family-name:var(--font-montserrat)] font-black text-white leading-[1] mb-8 uppercase tracking-tighter">
                        Welcome <br /> <span className="text-[#FFD700]">Back.</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-sm mx-auto font-[family-name:var(--font-roboto)]">
                        Your rides, your way. Sign in to book trips, track rides, and get where you need to go.
                    </p>
                </div>

                {/* Decorative section number */}
                <div className="absolute bottom-10 right-10 flex items-center gap-4 text-white hover:text-[#FFD700] transition-colors font-[family-name:var(--font-montserrat)]">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Section 01 / Auth</span>
                    <div className="w-12 h-px bg-white/20"></div>
                </div>
            </div>
        </div>
    );
}
