"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Navigation, Home, LogIn, UserPlus } from "lucide-react";

export default function UserOnboardingPage() {
    const router = useRouter();
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProfilePic(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (profilePic) {
                const formData = new FormData();
                formData.append("profilePhoto", profilePic);
                await api.put("/auth/me", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }
            toast.success("Profile set up successfully!");
            router.push("/");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Profile update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-main flex flex-col items-center relative overflow-x-hidden transition-colors duration-500">
            {/* Navigation Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-[#0A192F]/90 backdrop-blur-xl border-b border-gray-100/50 dark:border-white/5 md:px-24 w-full">
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-9 h-9 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/20 group-hover:scale-105 transition-transform">
                        <Navigation className="w-5 h-5 text-[#0A192F]" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-[#0A192F] dark:text-white uppercase italic">GO<span className="text-[#FFD700]">RIDE</span></span>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={() => router.push('/')} className="hidden sm:flex items-center gap-2 text-xs font-black text-[#0A192F] dark:text-slate-400 uppercase tracking-widest hover:text-[#FFD700] transition-colors">
                        <Home className="w-4 h-4" />
                        <span>Home</span>
                    </button>
                    <button onClick={() => router.push('/login')} className="flex items-center gap-2 text-xs font-black text-[#0A192F] dark:text-slate-400 uppercase tracking-widest hover:text-[#FFD700] transition-colors">
                        <LogIn className="w-4 h-4" />
                        <span>Login</span>
                    </button>
                    <button onClick={() => router.push('/register')} className="hidden sm:flex items-center gap-2 text-xs font-black text-[#0A192F] dark:text-slate-400 uppercase tracking-widest hover:text-[#FFD700] transition-colors">
                        <UserPlus className="w-4 h-4" />
                        <span>Register</span>
                    </button>
                </div>
            </nav>

            <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_rgba(0,209,129,0.08)_0%,_transparent_80%)] -z-0"></div>

            <div className="max-w-md w-full relative z-10 text-center">
                <h1 className="text-4xl font-bold text-[#0A192F] dark:text-white mb-4">You&apos;re All Set!</h1>
                <p className="text-[#0A192F] dark:text-gray-400 mb-12">Just add a profile picture to finalize your account</p>

                <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-10 rounded-[40px] shadow-2xl backdrop-blur-xl transition-all">
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mb-6 relative hover:border-[#00D181]/50 cursor-pointer transition-all group overflow-hidden">
                            {profilePic ? (
                                <img src={URL.createObjectURL(profilePic)} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <svg viewBox="0 0 24 24" className="w-12 h-12 text-gray-600 group-hover:text-[#00D181] transition-colors">
                                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="text-left space-y-4">
                        <div className="p-4 bg-emerald-950/20 border border-[#00D181]/20 rounded-2xl flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-[#00D181] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-[#0A192F] dark:text-white text-sm font-bold">Account Verified</h4>
                                <p className="text-xs text-[#0A192F] dark:text-gray-400">Your email has been confirmed. Welcome to Go Ride!</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#00D181] text-white font-bold rounded-2xl shadow-xl shadow-[#00D181]/20 hover:bg-[#00B871] transition-all disabled:opacity-50"
                    >
                        {loading ? "Completing..." : "Complete Registration"}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="text-xs text-[#0A192F] dark:text-gray-500 hover:text-[#0A192F] dark:hover:text-white transition-colors font-bold"
                    >
                        Skip for now
                    </button>
                </form>
            </div>
        </div>
    );
}
