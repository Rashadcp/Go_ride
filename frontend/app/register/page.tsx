"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SocialAuth from "@/components/auth/SocialAuth";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { Camera, User, X, Eye, EyeOff, Navigation, ArrowLeft, ShieldCheck, Mail, Lock, UserPlus } from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

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
        <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] flex font-[family-name:var(--font-roboto)] overflow-hidden transition-all duration-500">
            {/* Left Side: Brand Side */}
            <div className="hidden lg:flex lg:w-[45%] bg-[#1A1A1A] relative items-center justify-center overflow-hidden">
                <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[#FFD700]/5 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-0 right-0 w-[80%] h-[80%] bg-white/5 rounded-full blur-[120px]"></div>

                <div className="relative z-10 text-center px-12 font-[family-name:var(--font-montserrat)]">
                    <div className="w-16 h-16 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full flex items-center justify-center mx-auto mb-10">
                        <UserPlus className="w-8 h-8 text-[#FFD700]" strokeWidth={1} />
                    </div>
                    <h2 className="text-6xl font-black text-white leading-[1] mb-8 uppercase tracking-tighter">
                        Join the <br /> <span className="text-[#FFD700]">Elite Network.</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-sm mx-auto font-[family-name:var(--font-roboto)]">
                        Whether you are traveling or driving, precision is our standard. Start your journey with Go Ride.
                    </p>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="w-full lg:w-[55%] flex flex-col px-6 sm:px-12 lg:px-20 py-8 relative z-10">
                <div className="flex items-center gap-3 cursor-pointer group mb-10 sm:mb-16" onClick={() => router.push("/")}>
                    <div className="w-9 h-9 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Navigation className="w-5 h-5 text-[#FFD700] fill-current" strokeWidth={1.5} />
                    </div>
                    <span className="font-[family-name:var(--font-montserrat)] font-black text-xl tracking-tighter uppercase text-[#1A1A1A]">GO<span className="text-[#FFD700]">RIDE</span></span>
                </div>

                <div className="max-w-xl w-full mx-auto lg:ml-0 my-auto pb-10">
                    <div className="mb-8 font-[family-name:var(--font-montserrat)]">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700] mb-3 block">Account Registration</span>
                        <h1 className="text-4xl font-black mb-3 tracking-tighter uppercase leading-tight">Create <br /> <span className="text-[#B8860B]">Profile</span></h1>
                        <p className="text-[#4A4A48] font-semibold text-sm leading-relaxed border-l-2 border-[#FFD700] pl-4 font-[family-name:var(--font-roboto)]">
                            Select your operational role and provide your identification details.
                        </p>
                    </div>

                    <div className="relative bg-white/40 backdrop-blur-md p-1 rounded-2xl flex items-center mb-8 border border-[#E5E5E0] shadow-inner h-[54px] font-[family-name:var(--font-montserrat)]">
                        <div
                            className={`absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] bg-[#1A1A1A] rounded-xl transition-all duration-300 ease-out z-0 ${role === "DRIVER" ? "translate-x-full" : "translate-x-0"}`}
                        ></div>
                        <button
                            type="button"
                            onClick={() => setRole("USER")}
                            className={`relative flex-1 py-1 text-[10px] font-black uppercase tracking-widest transition-all duration-300 z-10 ${role === "USER" ? "text-[#FFD700]" : "text-[#4A4A48]"}`}
                        >
                            Passenger Role
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("DRIVER")}
                            className={`relative flex-1 py-1 text-[10px] font-black uppercase tracking-widest transition-all duration-300 z-10 ${role === "DRIVER" ? "text-[#FFD700]" : "text-[#4A4A48]"}`}
                        >
                            Driver Status
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-16 h-16 rounded-full bg-white border border-[#E5E5E0] flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#FFD700] transition-all relative shadow-sm"
                                >
                                    {preview ? (
                                        <Image src={preview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <div className="text-center font-[family-name:var(--font-montserrat)]">
                                            <Camera className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                                            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none">Photo</span>
                                        </div>
                                    )}
                                </div>
                                {preview && (
                                    <button
                                        type="button"
                                        onClick={() => { setPreview(null); setProfilePhoto(null); }}
                                        className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white border-2 border-[#F5F5F0] hover:bg-rose-600 transition-all shadow-lg"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] ml-1">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    required
                                    className="w-full px-5 py-3.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] focus:bg-white focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-sm"
                                    placeholder="Jane"
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] ml-1">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    required
                                    className="w-full px-5 py-3.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] focus:bg-white focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-sm"
                                    placeholder="Smith"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] ml-1">Official Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full px-5 py-3.5 bg-white border border-[#E5E5E0] rounded-xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] transition-all"
                                placeholder="name@example.com"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] ml-1">Code</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        className="w-full px-5 py-3.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] focus:bg-white focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-sm"
                                        placeholder="••••••••"
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#1A1A1A]"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] ml-1">Verify</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        required
                                        className="w-full px-5 py-3.5 bg-[#F9F9F7] border border-[#E5E5E0] rounded-xl text-[#1A1A1A] text-sm font-bold focus:outline-none focus:border-[#FFD700] focus:bg-white focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-sm"
                                        placeholder="••••••••"
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#1A1A1A]"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            loading={loading}
                            className="w-full py-5 bg-[#1A1A1A] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] text-[10px] flex items-center justify-center gap-3 border-none font-[family-name:var(--font-montserrat)]"
                        >
                            Initialize Account <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Button>
                    </form>

                    <SocialAuth role={role} mode="register" />

                    <div className="mt-8 text-center sm:text-left pt-6 border-t border-[#E5E5E0]">
                        <p className="text-[#4A4A48] text-[11px] font-black uppercase tracking-widest leading-tight">
                            Existing member?{" "}
                            <a href="/login" className="text-[#FFD700] hover:text-[#B8860B] transition-colors ml-2 underline decoration-2 underline-offset-4">Authorize Identity</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
