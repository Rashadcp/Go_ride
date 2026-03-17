"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { ChevronLeft, Mail, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email });
            toast.success("OTP sent to your email!");
            setStep(2);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            await api.post("/auth/reset-password", { email, otp, newPassword });
            toast.success("Password reset successful! Please login.");
            router.push("/login");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Invalid OTP or expired");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 relative overflow-hidden py-12 transition-colors duration-500">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_50%_0%,_rgba(255,215,0,0.1)_0%,_transparent_70%)] -z-0"></div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 mb-6 cursor-pointer" onClick={() => router.push("/login")}>
                        <div className="w-10 h-10 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/20">
                            <ChevronLeft className="w-5 h-5 text-[#0A192F]" />
                        </div>
                        <span className="font-bold text-sm tracking-tight text-[#0A192F] dark:text-white uppercase">Back to Login</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#0A192F] dark:text-white mb-2">
                        {step === 1 ? "Forgot Password?" : "Reset Password"}
                    </h1>
                    <p className="text-[#0A192F] dark:text-slate-400 font-medium">
                        {step === 1
                            ? "Enter your email and we'll send you an OTP"
                            : "Enter the code and choose a new password"
                        }
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl">
                    {step === 1 ? (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A192F] dark:text-slate-400 mb-2 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all text-sm shadow-sm"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#FFD700] text-[#0A192F] font-bold rounded-xl shadow-lg shadow-[#FFD700]/10 hover:bg-[#E6C200] transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Sending..." : "Send OTP"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A192F] dark:text-slate-400 mb-2 ml-1">OTP Code</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all text-sm tracking-[0.5em] font-bold shadow-sm"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A192F] dark:text-slate-400 mb-2 ml-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all text-sm shadow-sm"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#FFD700] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0A192F] dark:text-slate-400 mb-2 ml-1">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all text-sm shadow-sm"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#FFD700] transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#FFD700] text-[#0A192F] font-bold rounded-xl shadow-lg shadow-[#FFD700]/10 hover:bg-[#E6C200] transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Reset Password"}
                            </button>

                            <p className="text-center text-xs text-[#0A192F] dark:text-slate-500 font-medium">
                                Didn&apos;t receive the code?{" "}
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-[#FFD700] font-black hover:underline uppercase tracking-widest ml-1"
                                >
                                    Resend
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
