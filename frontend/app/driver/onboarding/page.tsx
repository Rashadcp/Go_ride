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
    Navigation as NavIcon,
    Bike,
    Users,
    ChevronRight,
    Star,
    Layers,
    Layout,
    Check,
    Smartphone
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
        vehicleType: "Go",
    });

    const [documents, setDocuments] = useState({
        profilePhoto: null as File | null,
        license: null as File | null,
        rc: null as File | null,
        aadhaar: null as File | null,
        vehiclePhotos: [] as File[],
    });

    const [previews, setPreviews] = useState({
        profilePhoto: "",
        license: "",
        rc: "",
        aadhaar: "",
        vehiclePhotos: [] as string[],
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (field === "vehiclePhotos") {
            const fileList = Array.from(files);
            setDocuments(prev => ({ ...prev, [field]: [...prev.vehiclePhotos, ...fileList] }));
            const urls = fileList.map(file => URL.createObjectURL(file));
            setPreviews(prev => ({ ...prev, [field]: [...prev.vehiclePhotos, ...urls] }));
        } else {
            const file = files[0];
            setDocuments(prev => ({ ...prev, [field]: file }));
            const url = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [field]: url }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!documents.license || !documents.rc || !documents.aadhaar || documents.vehiclePhotos.length === 0) {
            toast.error("Please upload all required documents and vehicle photos");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("numberPlate", vehicleInfo.numberPlate);
        formData.append("vehicleModel", vehicleInfo.vehicleModel);
        formData.append("vehicleType", vehicleInfo.vehicleType);

        if (documents.profilePhoto) formData.append("profilePhoto", documents.profilePhoto);
        if (documents.license) formData.append("license", documents.license);
        if (documents.rc) formData.append("rc", documents.rc);
        if (documents.aadhaar) formData.append("aadhaar", documents.aadhaar);
        
        documents.vehiclePhotos.forEach(file => {
            formData.append("vehiclePhotos", file);
        });

        try {
            await api.put("/auth/driver/onboarding", formData);
            toast.success("Details submitted for verification!");
            refetchUser();
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

    if (!mounted || userLoading) {
        return (
            <div className="h-screen bg-[#F5F5F0] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1A1A1A] animate-spin" />
            </div>
        );
    }

    if (user?.status === "AWAITING_APPROVAL") {
        return (
            <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center px-4 sm:px-6 py-10 relative font-[family-name:var(--font-roboto)]">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-[32px] sm:rounded-[40px] p-8 sm:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] border border-slate-100 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FFD700]/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" strokeWidth={1.5} />
                        </div>
                        
                        <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-montserrat)] font-black text-[#1A1A1A] mb-3 sm:mb-4">UNDER REVIEW</h1>
                        <p className="text-slate-500 mb-8 sm:mb-12 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                            We are currently checking your documents. You can start driving once our team approves your profile.
                        </p>

                        <div className="flex flex-col gap-3">
                            <Button
                                variant="primary"
                                className="w-full !py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                                onClick={handleNavigateHome}
                            >
                                Back Home
                            </Button>
                            <button
                                onClick={() => {
                                    clearAuth();
                                    window.location.href = "/login";
                                }}
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3 hover:text-[#1A1A1A] transition-colors"
                            >
                                Log Out Securely
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F0] font-[family-name:var(--font-roboto)] selection:bg-[#FFD700]/30 selection:text-[#1A1A1A]">
            <nav className="sticky top-0 z-50 bg-[#F5F5F0]/80 backdrop-blur-2xl border-b border-slate-200/60 h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleNavigateHome}>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1A1A1A] rounded-lg flex items-center justify-center text-[#FFD700] shadow-sm">
                        <NavIcon className="w-4 h-4 sm:w-5 sm:h-5 fill-current" strokeWidth={1.5} />
                    </div>
                    <span className="text-base sm:text-lg font-[family-name:var(--font-montserrat)] font-black text-[#1A1A1A] tracking-tighter">GO<span className="text-[#FFD700]">RIDE</span></span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver Portal</span>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-24 sm:pb-32">
                <div className="mb-10 sm:mb-16 text-center sm:text-left">
                    <span className="text-[10px] sm:text-[11px] font-black text-[#FFD700] uppercase tracking-[0.3em] mb-2 sm:mb-3 block">Step 1: Registration</span>
                    <h1 className="text-3xl sm:text-5xl font-[family-name:var(--font-montserrat)] font-black text-[#1A1A1A] mb-3 sm:mb-4 tracking-tight leading-tight uppercase">
                        Driver Onboarding
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-md mx-auto sm:mx-0">
                        Please finish your profile to start receiving ride requests from the platform.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col lg:grid lg:grid-cols-2 gap-6 sm:gap-8 items-start">
                    <div className="w-full space-y-6">
                        <div className="bg-white rounded-3xl sm:rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3 text-slate-900 mb-1 sm:mb-2">
                                <Car className="w-5 h-5 text-[#FFD700]" strokeWidth={1.5} />
                                <h2 className="text-lg font-[family-name:var(--font-montserrat)] font-black uppercase tracking-tight">Vehicle Details</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">What car do you have?</label>
                                    <input 
                                        placeholder="e.g. Maruti Swift 2024"
                                        className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50 border border-transparent rounded-xl sm:rounded-2xl text-sm font-bold text-[#1A1A1A] focus:bg-white focus:border-[#FFD700] outline-none transition-all placeholder:text-slate-300"
                                        value={vehicleInfo.vehicleModel}
                                        onChange={(e) => setVehicleInfo({ ...vehicleInfo, vehicleModel: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Number Plate</label>
                                    <input 
                                        placeholder="e.g. KL 11 AN 007"
                                        className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50 border border-transparent rounded-xl sm:rounded-2xl text-sm font-black text-[#1A1A1A] uppercase focus:bg-white focus:border-[#FFD700] outline-none transition-all placeholder:text-slate-300"
                                        value={vehicleInfo.numberPlate}
                                        onChange={(e) => setVehicleInfo({ ...vehicleInfo, numberPlate: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Vehicle Type</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {[
                                        { id: "Bike", icon: Bike },
                                        { id: "Auto", icon: Users },
                                        { id: "Go", icon: Car },
                                        { id: "Sedan", icon: Car },
                                        { id: "XL", icon: Users }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setVehicleInfo({ ...vehicleInfo, vehicleType: type.id })}
                                            className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${
                                                vehicleInfo.vehicleType === type.id 
                                                ? "bg-[#1A1A1A] border-[#1A1A1A] text-[#FFD700]" 
                                                : "bg-[#FAFAFA] border-transparent text-slate-400 hover:border-slate-200"
                                            }`}
                                        >
                                            <type.icon className="w-4 h-4 sm:w-5 sm:h-5 mb-1 sm:mb-2" strokeWidth={1.5} />
                                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter">{type.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 bg-[#1A1A1A] rounded-[24px] sm:rounded-[32px] text-white">
                             <div className="flex items-start gap-3 sm:gap-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FFD700]/10 rounded-lg sm:rounded-xl flex items-center justify-center text-[#FFD700] shrink-0">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-[family-name:var(--font-montserrat)] font-black mb-1.5 sm:mb-2 tracking-wide text-[#FFD700]">PRO TIP</h3>
                                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 leading-relaxed">
                                        Make sure your documents are clear. Blurry photos might take longer to approve. We usually check everything in 6-12 hours.
                                    </p>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="w-full space-y-6">
                        <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 sm:space-y-8 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-slate-900">
                                <Layers className="w-5 h-5 text-[#FFD700]" strokeWidth={1.5} />
                                <h2 className="text-lg font-[family-name:var(--font-montserrat)] font-black uppercase tracking-tight">Upload Documents</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                {[
                                    { id: "license", label: "License", desc: "Driving Permit" },
                                    { id: "aadhaar", label: "Identity", desc: "National ID" },
                                    { id: "rc", label: "RC Card", desc: "Vehicle Registry" },
                                    { id: "profilePhoto", label: "Selfie", desc: "Driver Photo" }
                                ].map((doc) => {
                                    const hasPreview = !!previews[doc.id as keyof typeof previews];
                                    return (
                                        <label key={doc.id} className="cursor-pointer group">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, doc.id)} />
                                            <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-dashed flex items-center gap-3 h-full transition-all ${
                                                hasPreview ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                                            }`}>
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-xs relative">
                                                    {hasPreview ? (
                                                        <Image src={previews[doc.id as keyof typeof previews] as string} alt="Doc" fill className="object-cover" />
                                                    ) : <UploadCloud className="w-4 h-4 text-slate-300" />}
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className={`text-[10px] font-black uppercase tracking-tight truncate ${hasPreview ? 'text-emerald-700' : 'text-slate-500'}`}>{doc.label}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{doc.desc}</p>
                                                </div>
                                                {hasPreview && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" strokeWidth={2} />}
                                            </div>
                                        </label>
                                    );
                                })}

                                <label className="sm:col-span-2 cursor-pointer">
                                    <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileChange(e, "vehiclePhotos")} />
                                    <div className={`p-6 sm:p-8 rounded-2xl sm:rounded-[24px] border-2 border-dashed text-center transition-all ${
                                        previews.vehiclePhotos.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                                    }`}>
                                        <div className="mx-auto w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 mb-3 border border-slate-100 shadow-sm overflow-hidden relative">
                                            {previews.vehiclePhotos.length > 0 ? (
                                                <Image src={previews.vehiclePhotos[0]} alt="Car" fill className="object-cover" />
                                            ) : <Camera className="w-5 h-5" />}
                                        </div>
                                        <p className="text-xs font-black text-[#1A1A1A] uppercase tracking-widest mb-1">Car Photos</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{previews.vehiclePhotos.length} Images Uploaded</p>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-2 sm:pt-4">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={loading}
                                    className="w-full !py-4 sm:!py-5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-[#FFD700]/20 active:scale-[0.98] transition-all"
                                >
                                    Finish Registration <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                                <p className="text-center mt-5 sm:mt-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">End of Registration</p>
                            </div>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
