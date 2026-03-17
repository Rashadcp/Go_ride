"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SocialAuth from "@/components/auth/SocialAuth";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Camera, User, X, Eye, EyeOff, Navigation, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPage() {
    const { setAuth } = useAuthStore();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [role, setRole] = useState<"USER" | "DRIVER">("USER");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append("firstName", formData.firstName);
            data.append("lastName", formData.lastName);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("confirmPassword", formData.confirmPassword);
            data.append("role", role);

            if (profilePhoto) {
                data.append("profilePhoto", profilePhoto);
            }

            const response = await api.post("/auth/register", data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const { accessToken, refreshToken, user } = response.data;
            setAuth(user, accessToken, refreshToken);

            toast.success("Account created successfully!");

            if (role === "DRIVER") {
                router.push("/driver/onboarding");
            } else {
                router.push("/user/dashboard");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    return (
        <div className="min-h-screen bg-bg-main text-text-main flex overflow-hidden transition-colors duration-500">
            {/* --- Left Side: Image --- */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#0A192F]">
                <img
                    src="/images/register-bg.png"
                    alt="Register Background"
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
                                <h3 className="text-white font-black text-xl tracking-tight">Earn Money, Your Way.</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Join our network of elite drivers</p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed font-medium">
                            Whether you're looking for extra income or a full-time career, Go Ride provides the tools and technology to help you succeed on the road.
                        </p>
                    </div>
                </div>

                <div className="absolute top-20 left-20 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-3xl animate-pulse"></div>
            </div>

            {/* --- Right Side: Form --- */}
            <div className="w-full lg:w-1/2 flex flex-col px-8 md:px-16 lg:px-24 py-6 relative z-10 transition-colors duration-500 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
                        <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center shadow-lg shadow-[#FFD700]/20 group-hover:scale-110 transition-transform">
                            <Navigation className="w-5 h-5 text-[#0A192F]" />
                        </div>
                        <span className="font-black text-xl tracking-tighter text-[#0A192F] dark:text-white uppercase italic">Go<span className="text-[#FFD700]">Ride</span></span>
                    </div>
                </div>

                <div className="max-w-md w-full mx-auto my-auto py-2">
                    <div className="mb-6">
                        <h1 className="text-3xl font-black text-[#0A192F] dark:text-white mb-1 tracking-tight">Join Go Ride</h1>
                        <p className="text-[#0A192F] dark:text-slate-400 font-medium text-sm leading-tight">Create your account to start your journey.</p>
                    </div>

                    <div className="relative bg-slate-50 dark:bg-white/5 backdrop-blur-md p-1 rounded-2xl flex items-center mb-6 border border-slate-200 dark:border-white/5 shadow-inner overflow-hidden h-[48px]">
                        <div
                            className={`absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] bg-[#FFD700] rounded-xl transition-all duration-300 ease-out shadow-lg shadow-[#FFD700]/20 z-0 ${role === "DRIVER" ? "translate-x-full" : "translate-x-0"}`}
                        ></div>
                        <button
                            type="button"
                            onClick={() => setRole("USER")}
                            className={`relative flex-1 py-1 text-xs font-black uppercase tracking-widest transition-all duration-300 z-10 ${role === "USER" ? "text-[#0A192F]" : "text-slate-600 dark:text-slate-400"}`}
                        >
                            Passenger
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("DRIVER")}
                            className={`relative flex-1 py-1 text-xs font-black uppercase tracking-widest transition-all duration-300 z-10 ${role === "DRIVER" ? "text-[#0A192F]" : "text-slate-600 dark:text-slate-400"}`}
                        >
                            Driver
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col items-center mb-4">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-16 h-16 rounded-[24px] bg-white dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#FFD700] hover:bg-[#FFD700]/5 transition-all relative shadow-sm"
                                >
                                    {preview ? (
                                        <Image src={preview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Camera className="w-5 h-5 text-slate-500 dark:text-slate-500 mx-auto mb-1" />
                                            <span className="text-[7px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest leading-none">Photo</span>
                                        </div>
                                    )}
                                </div>
                                {preview && (
                                    <button
                                        type="button"
                                        onClick={() => { setPreview(null); setProfilePhoto(null); }}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-[#0A192F] hover:bg-rose-600 transition-all shadow-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#0A192F] dark:text-slate-400 mb-2 ml-1">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    required
                                    className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all font-medium text-sm shadow-sm"
                                    placeholder="John"
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#0A192F] dark:text-slate-400 mb-2 ml-1">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    required
                                    className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all font-medium text-sm shadow-sm"
                                    placeholder="Doe"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#0A192F] dark:text-slate-400 mb-2 ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all font-medium text-sm shadow-sm"
                                placeholder="name@example.com"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all font-medium text-sm pr-12 shadow-sm"
                                        placeholder="••••••••"
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#FFD700] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#0A192F] dark:text-slate-400 mb-2 ml-1">Confirm</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        required
                                        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[#0A192F] dark:text-white focus:outline-none focus:border-[#FFD700] transition-all font-medium text-sm pr-12 shadow-sm"
                                        placeholder="••••••••"
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#FFD700] transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 mt-4 bg-[#FFD700] text-[#0A192F] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-[#FFD700]/20 hover:bg-[#FFC000] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 text-[11px] flex items-center justify-center gap-3"
                        >
                            {loading ? "Creating Profile..." : `Initialize Account`}
                            <Navigation className="w-4 h-4 rotate-90" />
                        </button>
                    </form>

                    <SocialAuth role={role} mode="register" />

                    <div className="mt-4 text-center bg-black/5 dark:bg-white/5 py-3 rounded-2xl border border-black/10 dark:border-white/5">
                        <p className="text-xs text-[#0A192F] dark:text-slate-400 font-medium tracking-tight">
                            Already a member?{" "}
                            <a href="/login" className="text-[#FFD700] font-black hover:underline uppercase tracking-widest ml-1">Sign In</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
