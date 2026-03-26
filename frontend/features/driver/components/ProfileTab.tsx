"use client";

import React, { useState } from "react";
import { User, Camera, Car, CheckCircle, Loader2, Edit3, ShieldCheck } from "lucide-react";

interface ProfileTabProps {
    user: any;
    profileName: string;
    setProfileName: (name: string) => void;
    profileEmail: string;
    previewUrl: string | null;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSyncProfile: () => void;
    setShowPasswordModal: (show: boolean) => void;
    loading: boolean;

    // Vehicle Props
    vehicle: any;
    vehiclePreviewUrl: string | null;
    handleVehiclePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleUpdateVehicle: (e: React.FormEvent) => void;
    vehicleData: {
        numberPlate: string;
        vehicleModel: string;
        vehicleType: string;
    };
    setVehicleData: (data: any) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
    user,
    profileName,
    setProfileName,
    profileEmail,
    previewUrl,
    handleFileChange,
    handleSyncProfile,
    setShowPasswordModal,
    loading,
    vehicle,
    vehiclePreviewUrl,
    handleVehiclePhotoChange,
    handleUpdateVehicle,
    vehicleData,
    setVehicleData
}) => {
    const [isEditingVehicle, setIsEditingVehicle] = useState(false);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

    const renderPhoto = (photo: string | null, fallbackIcon: React.ReactNode) => {
        if (!photo) return fallbackIcon;
        
        let finalSrc = photo;
        if (photo.includes('amazonaws.com') && (photo.includes('goride/profiles/') || photo.includes('goride/'))) {
            const filename = photo.split('/').pop();
            // Try profile photo proxy then vehicle photo proxy if needed
            finalSrc = `${baseUrl}/api/auth/profile-photo/${filename}`;
        } else if (!photo.startsWith('http') && !photo.startsWith('data:')) {
            const cleanPath = photo.startsWith('/') ? photo : `/${photo}`;
            finalSrc = `${baseUrl}${cleanPath}`;
        }
            
        return (
            <img 
                src={finalSrc} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "https://ui-avatars.com/api/?name=V&background=FFD700&color=0A192F&bold=true";
                }}
            />
        );
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-[#0A192F]">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Identity <span className="text-[#FFD700]">Nexus</span></h2>
                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest leading-none">Your verified professional profile</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* User Profile Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-8 text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ShieldCheck className="w-12 h-12 text-[#FFD700]" />
                            </div>
                            <div className="relative group mx-auto w-24 h-24 lg:w-32 lg:h-32 mb-6">
                                <div className="w-full h-full bg-[#FFD700] rounded-[40px] flex items-center justify-center shadow-2xl overflow-hidden border-4 border-[#0A192F]">
                                    {renderPhoto(previewUrl || user?.profilePhoto, <User className="w-10 h-10 lg:w-16 lg:h-16 text-[#0A192F]" />)}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-[#0A192F]/60 opacity-0 group-hover:opacity-100 cursor-pointer rounded-[40px] transition-all">
                                    <Camera className="w-6 h-6 lg:w-8 lg:h-8 text-[#FFD700]" />
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                            <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter italic">{user?.name}</h3>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{user?.email}</p>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-6 lg:p-12 shadow-2xl h-full flex flex-col justify-center">
                            <form className="space-y-6 lg:space-y-8" onSubmit={(e) => { e.preventDefault(); handleSyncProfile(); }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Display Name</label>
                                        <input className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700] transition-colors" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Account Status</label>
                                        <div className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-black italic text-sm">{user?.role || 'DRIVER'}</div>
                                    </div>
                                </div>
                                <div className="pt-8 flex flex-col sm:flex-row gap-4">
                                    <button type="submit" className="flex-1 py-4 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Sync Identity"}
                                    </button>
                                    <button type="button" onClick={() => setShowPasswordModal(true)} className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                                        Security Reset
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Vehicle Management Section */}
                <div className="space-y-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Current <span className="text-[#FFD700]">Transport</span></h2>
                            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest leading-none">Active vehicle configuration for dispatch</p>
                        </div>
                        {vehicle && (
                            <button 
                                onClick={() => setIsEditingVehicle(!isEditingVehicle)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                            >
                                <Edit3 className="w-4 h-4 text-[#FFD700]" />
                                {isEditingVehicle ? "Cancel Edit" : "Change Vehicle"}
                            </button>
                        )}
                    </div>

                    {!isEditingVehicle && vehicle ? (
                        /* Vehicle Showcase View */
                        <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 overflow-hidden shadow-2xl group">
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                <div className="relative aspect-video lg:aspect-auto bg-black overflow-hidden">
                                     {renderPhoto(vehicle?.vehiclePhotos?.[0], <div className="w-full h-full flex flex-col items-center justify-center"><Car className="w-20 h-20 text-white/5 mb-4" /><p className="text-white/20 text-[10px] font-black uppercase tracking-widest">No Photo Available</p></div>)}
                                     <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent lg:block hidden" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden block" />
                                     
                                     <div className="absolute bottom-6 left-8 lg:bottom-12 lg:left-12">
                                         <p className="text-[#FFD700] text-[10px] lg:text-[12px] font-black uppercase tracking-[0.3em] mb-2">{vehicle?.vehicleType} Class</p>
                                         <h3 className="text-3xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">{vehicle?.vehicleModel}</h3>
                                         <div className="inline-flex items-center gap-2 px-6 py-2 bg-white text-[#0A192F] rounded-xl font-black text-[14px] lg:text-[18px] uppercase tracking-tighter shadow-[0_8px_30px_rgba(255,255,255,0.1)]">
                                             {vehicle?.numberPlate}
                                         </div>
                                     </div>
                                </div>
                                
                                <div className="p-8 lg:p-16 flex flex-col justify-center gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-white font-black uppercase italic tracking-tight">Active Status</p>
                                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{vehicle?.status || "Ready for Dispatch"}</p>
                                            </div>
                                        </div>
                                        <div className="h-px bg-white/5 w-full" />
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Configuration</p>
                                                <p className="text-white font-black text-lg italic uppercase tracking-tight">{vehicle?.status === 'APPROVED' ? 'Verified' : 'Pending'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Last Update</p>
                                                <p className="text-white font-black text-lg italic tracking-tight">{new Date(vehicle?.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-3xl">
                                        <p className="text-[#FFD700] text-[10px] font-black uppercase tracking-widest leading-relaxed">This vehicle is currently set as your primary transport. To change your car details or upload a new photo, click the 'Change Vehicle' button above.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Vehicle Edit Form (or Register Form) */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Photo Selection Card */}
                            <div className="lg:col-span-1">
                                <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-8 relative group overflow-hidden h-full flex flex-col">
                                    <div className="relative aspect-square bg-[#0A192F] rounded-[32px] overflow-hidden border-2 border-white/10 flex items-center justify-center group-hover:border-[#FFD700]/30 transition-all">
                                        {renderPhoto(vehiclePreviewUrl || (vehicle?.vehiclePhotos?.[0]), <Car className="w-16 h-16 text-white/5" />)}
                                        <label className="absolute inset-0 bg-[#0A192F]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Camera className="w-10 h-10 text-[#FFD700] mb-3" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Update Photo</span>
                                            <input type="file" className="hidden" onChange={handleVehiclePhotoChange} />
                                        </label>
                                    </div>
                                    <div className="mt-8 space-y-2">
                                        <p className="text-white font-black uppercase italic tracking-tight text-center">Vehicle Image</p>
                                        <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] text-center">Required for passenger verification</p>
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="lg:col-span-2">
                                <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-6 lg:p-12 shadow-2xl">
                                    <form className="space-y-6 lg:space-y-8" onSubmit={(e) => { handleUpdateVehicle(e); setIsEditingVehicle(false); }}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Number Plate</label>
                                                <input 
                                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700] uppercase placeholder:text-white/10 font-bold" 
                                                    placeholder="KA 03 MX 1234"
                                                    value={vehicleData.numberPlate} 
                                                    onChange={(e) => setVehicleData({ ...vehicleData, numberPlate: e.target.value.toUpperCase() })} 
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vehicle Type</label>
                                                <select 
                                                    className="w-full px-6 py-4 bg-[#0A192F] border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700] appearance-none custom-select font-bold"
                                                    value={vehicleData.vehicleType}
                                                    onChange={(e) => setVehicleData({ ...vehicleData, vehicleType: e.target.value })}
                                                >
                                                    <option value="Go">Go (Everyday)</option>
                                                    <option value="Sedan">Sedan (Premier)</option>
                                                    <option value="XL">XL (6-Seater)</option>
                                                    <option value="Auto">Auto Rickshaw</option>
                                                    <option value="Bike">Fast Bike</option>
                                                    <option value="Luxury">Luxury Class</option>
                                                    <option value="Tavera">Tavera / Utility</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vehicle Manufacturer & Model</label>
                                                <input 
                                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700] font-bold" 
                                                    placeholder="e.g. Maruti Suzuki Wagon R (White)"
                                                    value={vehicleData.vehicleModel} 
                                                    onChange={(e) => setVehicleData({ ...vehicleData, vehicleModel: e.target.value })} 
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-8">
                                            <button 
                                                type="submit" 
                                                className="w-full py-5 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                                Confirm Update
                                            </button>
                                            {vehicle && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsEditingVehicle(false)}
                                                    className="w-full mt-4 py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                                                >
                                                    Keep Existing Record
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .custom-select {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1.5rem center;
                    background-size: 1rem;
                }
            `}</style>
        </div>
    );
};
