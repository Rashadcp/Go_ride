"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    Car,
    CreditCard,
    FileText,
    Camera,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ChevronLeft,
    UploadCloud,
    ShieldCheck,
    Loader2,
    Clock,
    Mail,
    Home,
    LogIn,
    UserPlus,
    Navigation as NavIcon
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUser } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export default function DriverOnboardingPage() {
    const { user, isLoading: userLoading, refetch: refetchUser } = useUser();
    const router = useRouter();
    const clearAuth = useAuthStore(state => state.clearAuth);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [vehicleInfo, setVehicleInfo] = useState({
        numberPlate: "",
        vehicleModel: "",
    });

    const [documents, setDocuments] = useState({
        profilePhoto: null as File | null,
        license: null as File | null,
        rc: null as File | null,
        aadhaar: null as File | null,
        vehiclePhoto: null as File | null,
    });

    const [previews, setPreviews] = useState({
        profilePhoto: "",
        license: "",
        rc: "",
        aadhaar: "",
        vehiclePhoto: "",
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (file) {
            setDocuments(prev => ({ ...prev, [field]: file }));
            const url = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [field]: url }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!documents.license || !documents.rc || !documents.aadhaar || !documents.vehiclePhoto) {
            toast.error("Please upload all required documents");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("numberPlate", vehicleInfo.numberPlate);
        formData.append("vehicleModel", vehicleInfo.vehicleModel);

        if (documents.profilePhoto) formData.append("profilePhoto", documents.profilePhoto);
        if (documents.license) formData.append("license", documents.license);
        if (documents.rc) formData.append("rc", documents.rc);
        if (documents.aadhaar) formData.append("aadhaar", documents.aadhaar);
        if (documents.vehiclePhoto) formData.append("vehiclePhoto", documents.vehiclePhoto);

        try {
            await api.put("/auth/driver/onboarding", formData);
            toast.success("Details submitted for verification!");
            refetchUser(); // Trigger UI to show AWAITING_APPROVAL view
        } catch (error: any) {
            console.error("Submission Error:", error);
            const msg = error.response?.data?.message || "Submission failed";
            toast.error(`${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateHome = () => {
        clearAuth();
        router.push("/");
    };

    const handleNavigateAuth = (path: string) => {
        clearAuth();
        router.push(path);
    };

    if (!mounted || userLoading) {
        return (
            <div className="h-screen bg-bg-main flex items-center justify-center transition-colors duration-500">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
            </div>
        );
    }

    const AwaitingApprovalView = () => (
        <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12 transition-colors duration-500">
            <div className="max-w-xl w-full text-center">
                <div className="w-24 h-24 bg-[#FFD700]/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                    <ShieldCheck className="w-12 h-12 text-[#FFD700]" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#FFD700] animate-ping opacity-25"></div>
                </div>
                <h1 className="text-4xl font-bold text-[#0A192F] dark:text-white mb-4">Verification in Progress</h1>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                    Great job! Your documents have been submitted successfully. Our administrative team is currently reviewing your profile to ensure everything is in order.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                        <Clock className="w-8 h-8 text-[#FFD700] mx-auto mb-3" />
                        <h3 className="text-[#0A192F] dark:text-white font-bold text-sm uppercase tracking-wider mb-2">Wait Time</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs text-balance">Review usually takes 24-48 hours</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                        <Mail className="w-8 h-8 text-[#FFD700] mx-auto mb-3" />
                        <h3 className="text-[#0A192F] dark:text-white font-bold text-sm uppercase tracking-wider mb-2">Notification</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs text-balance">We'll email you once you're approved</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                        <CheckCircle2 className="w-8 h-8 text-[#FFD700] mx-auto mb-3" />
                        <h3 className="text-[#0A192F] dark:text-white font-bold text-sm uppercase tracking-wider mb-2">Next Steps</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs text-balance">Set up your profile and start earning!</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                        variant="primary"
                        className="px-10 h-14 font-bold"
                        onClick={handleNavigateHome}
                    >
                        Return Home
                    </Button>
                    <button
                        onClick={() => {
                            clearAuth();
                            window.location.href = "/login";
                        }}
                        className="px-10 h-14 text-slate-400 hover:text-white font-bold transition-colors"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg-main selection:bg-[#FFD700]/30 font-sans pb-20 transition-colors duration-500">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FFD700]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>
            </div>

            <header className="sticky top-0 z-50 w-full bg-bg-main/80 backdrop-blur-xl border-b border-white/5 px-8 h-20 flex items-center justify-between transition-colors duration-500">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={handleNavigateHome}>
                    <div className="w-10 h-10 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10 group-hover:scale-105 transition-transform">
                        <NavIcon className="text-[#0A192F] w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-[#0A192F] dark:text-white uppercase italic">Go<span className="text-[#FFD700]">Ride</span></span>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden lg:flex items-center gap-6">
                        <button onClick={handleNavigateHome} className="flex items-center gap-2 text-[10px] font-black text-[#0A192F] dark:text-slate-400 uppercase tracking-widest hover:text-[#FFD700] transition-colors">
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </button>
                        <button onClick={() => handleNavigateAuth('/login')} className="flex items-center gap-2 text-[10px] font-black text-[#0A192F] dark:text-slate-400 uppercase tracking-widest hover:text-[#FFD700] transition-colors">
                            <LogIn className="w-4 h-4" />
                            <span>Login</span>
                        </button>
                        <button onClick={() => handleNavigateAuth('/register')} className="flex items-center gap-2 text-[10px] font-black text-[#0A192F] dark:text-slate-400 uppercase tracking-widest hover:text-[#FFD700] transition-colors">
                            <UserPlus className="w-4 h-4" />
                            <span>Register</span>
                        </button>
                    </div>
                    <div className="h-4 w-px bg-white/10 hidden lg:block"></div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black tracking-[0.2em] text-[#FFD700] uppercase hidden sm:block">Verification Hub</span>
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                </div>
            </header>

            {user?.status === "AWAITING_APPROVAL" ? (
                <AwaitingApprovalView />
            ) : (
                <main className="max-w-4xl mx-auto px-6 pt-12 relative z-10">
                    <div className="mb-12">
                        <h1 className="text-4xl font-black text-[#0A192F] dark:text-white mb-3 tracking-tight">Onboarding <span className="text-[#FFD700]">Console</span></h1>
                        <p className="text-[#0A192F] dark:text-slate-400 font-medium">Verify your identity and vehicle to start earning with Go Ride.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Section 1: Vehicle Information */}
                        <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Car className="w-32 h-32 text-white" />
                            </div>

                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-[#FFD700] text-[#0A192F] rounded-2xl flex items-center justify-center shadow-xl">
                                    <Car className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[#0A192F] dark:text-white leading-none mb-1">Vehicle Assets</h2>
                                    <p className="text-xs font-bold text-[#0A192F] dark:text-slate-500 uppercase tracking-widest">Identify your ride</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                <Input
                                    label="Vehicle Model"
                                    placeholder="e.g., Toyota Camry 2024"
                                    value={vehicleInfo.vehicleModel}
                                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicleModel: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Number Plate"
                                    placeholder="e.g., NY-7482"
                                    value={vehicleInfo.numberPlate}
                                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, numberPlate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Section 2: Identity & Vehicle Docs */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-4 ml-2">
                                <div className="w-12 h-12 bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] rounded-2xl flex items-center justify-center shadow-inner">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[#0A192F] dark:text-white leading-none mb-1">Documentation</h2>
                                    <p className="text-xs font-bold text-[#0A192F] dark:text-slate-500 uppercase tracking-widest">Verify your credentials</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Document Cards */}
                                {[
                                    { id: "license", label: "Driver's License", icon: CreditCard, desc: "Personal Driving Permit" },
                                    { id: "aadhaar", label: "Aadhaar Card", icon: ShieldCheck, desc: "Government Identity Doc" },
                                    { id: "rc", label: "Vehicle RC", icon: FileText, desc: "Registration Certificate" },
                                    { id: "vehiclePhoto", label: "Vehicle Photo", icon: Camera, desc: "Clear Exterior Preview" },
                                    { id: "profilePhoto", label: "Driver Selfie", icon: Camera, desc: "Professional Face Photo" },
                                ].map((doc) => (
                                    <div key={doc.id} className="group relative">
                                        <label className="block h-full cursor-pointer">
                                            <div className={`h-full bg-white/5 border-2 border-dashed ${previews[doc.id as keyof typeof previews] ? 'border-[#FFD700]/40 bg-[#FFD700]/5' : 'border-white/10 hover:border-[#FFD700]/30'} rounded-[32px] p-6 transition-all duration-300 flex flex-col items-center text-center`}>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange(e, doc.id)}
                                                />

                                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                                    {previews[doc.id as keyof typeof previews] ? (
                                                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#FFD700]">
                                                            <Image src={previews[doc.id as keyof typeof previews]} alt="Preview" fill className="object-cover" />
                                                        </div>
                                                    ) : (
                                                        <doc.icon className="w-6 h-6 text-[#FFD700]" />
                                                    )}
                                                </div>

                                                <p className="text-sm font-black text-[#0A192F] dark:text-white mb-1">{doc.label}</p>
                                                <p className="text-[10px] font-bold text-[#0A192F] dark:text-slate-500 uppercase tracking-wider mb-4">{doc.desc}</p>

                                                <div className={`mt-auto px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${previews[doc.id as keyof typeof previews] ? 'bg-[#FFD700] text-[#0A192F] border-[#FFD700]' : 'bg-white/5 text-slate-400 border-white/10 group-hover:bg-white/10'}`}>
                                                    {previews[doc.id as keyof typeof previews] ? 'Change Document' : 'Upload Document'}
                                                </div>
                                            </div>
                                        </label>
                                        {previews[doc.id as keyof typeof previews] && (
                                            <div className="absolute top-4 right-4 animate-bounce">
                                                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-[32px] p-8 flex flex-col justify-center">
                                    <div className="flex items-start gap-4 mb-4">
                                        <AlertCircle className="w-5 h-5 text-[#FFD700] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-[#FFD700] uppercase tracking-widest mb-2">Audit Process</p>
                                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed">Our Verification Team manually audits every document. Approval typically reflects in your dashboard within <span className="text-white">6-12 hours</span>.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-6">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="w-full !py-8 !rounded-[32px] text-lg font-black tracking-widest uppercase italic shadow-2xl shadow-[#FFD700]/10 group"
                            >
                                <span className="flex items-center gap-3">
                                    Submit for Verification
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </span>
                            </Button>
                        </div>
                    </form>

                    <p className="text-center mt-12 text-slate-500 font-bold text-sm">
                        Encountering issues? Contact our <span className="text-[#FFD700] cursor-pointer hover:underline">Verification Specialist</span>.
                    </p>
                </main>
            )}
        </div>
    );
}
