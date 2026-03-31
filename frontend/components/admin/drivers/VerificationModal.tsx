"use client";

import React from "react";
import { 
    X, User, Fingerprint, CreditCard, ShieldCheck, 
    ExternalLink, AlertCircle, Car, FileText 
} from "lucide-react";

import { Driver } from "@/lib/types/admin";


interface VerificationModalProps {
    driver: Driver;
    onClose: () => void;
    onAction: (vehicleId: string, status: "APPROVED" | "REJECTED") => void;
}

export default function VerificationModal({ driver, onClose, onAction }: VerificationModalProps) {
    const getImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http") || path.startsWith("data:")) return path;
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace("/api", "");
        return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-md" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white relative">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[24px] overflow-hidden border-2 border-slate-50 shadow-inner bg-slate-50">
                            {driver.profilePhoto ? (
                                <img src={getImageUrl(driver.profilePhoto)} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <User className="w-8 h-8" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-[#0A192F] italic uppercase tracking-tight">{driver.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{driver.email}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                <span className="text-[#FFD700] uppercase font-black text-[10px] tracking-[0.2em] italic">Identity Audit</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-[#0A192F] hover:bg-slate-50 rounded-2xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Left Column: Documents */}
                        <div className="space-y-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                <Fingerprint className="w-5 h-5 text-[#FFD700]" />
                                Legal Credentials
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { label: "Driving Authority License", path: driver.license, icon: <CreditCard className="w-4 h-4 text-blue-500" /> },
                                    { label: "National Identity (Aadhaar)", path: driver.aadhaar, icon: <ShieldCheck className="w-4 h-4 text-emerald-500" /> }
                                ].map((doc, i) => (
                                    <div key={i} className="group relative rounded-[32px] overflow-hidden bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <span className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest flex items-center gap-3 italic">
                                                <span className={`w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center ${i === 0 ? 'text-blue-500' : 'text-emerald-500'}`}>
                                                    {doc.icon}
                                                </span>
                                                {doc.label}
                                            </span>
                                            {doc.path && (
                                                <a href={getImageUrl(doc.path)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-slate-50 text-[#0A192F] hover:bg-[#0A192F] hover:text-[#FFD700] rounded-xl transition-all shadow-sm">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="aspect-[4/3] rounded-[24px] bg-slate-100 overflow-hidden relative border border-slate-100 group-hover:border-[#FFD700]/30 transition-all">
                                            {doc.path ? (
                                                <img src={getImageUrl(doc.path)} alt={doc.label} className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                                    <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest">Document Registry Null</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Vehicle */}
                        <div className="space-y-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                <Car className="w-5 h-5 text-[#FFD700]" />
                                Unit Specifications
                            </h3>

                            <div className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-8 shadow-sm">
                                {/* Vehicle Photos */}
                                <div className="grid grid-cols-2 gap-4">
                                    {(() => {
                                        const vehicleObj = driver.vehicle as any;
                                        const photos = vehicleObj?.vehiclePhotos || 
                                                      vehicleObj?.photos || 
                                                      (vehicleObj?.photo ? [vehicleObj.photo] : 
                                                      (vehicleObj?.vehiclePhoto ? [vehicleObj.vehiclePhoto] : []));
                                        
                                        if (photos && Array.isArray(photos) && photos.length > 0) {
                                            return photos.map((photo: string, idx: number) => (
                                                <div key={idx} className="aspect-video rounded-[24px] overflow-hidden border border-slate-100 group relative">
                                                    <img src={getImageUrl(photo)} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-[#0A192F]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <a href={getImageUrl(photo)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white text-[#0A192F] flex items-center justify-center rounded-[18px] shadow-2xl hover:scale-110 transition-all">
                                                            <ExternalLink className="w-5 h-5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            ));
                                        }
                                        return (
                                            <div className="col-span-2 py-12 flex flex-col items-center justify-center bg-slate-50 rounded-[24px] text-slate-200 border border-dashed border-slate-200">
                                                <Car className="w-12 h-12 mb-3 opacity-10" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Exterior Images Unavailable</span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unit Model</p>
                                        <p className="text-lg font-black text-[#0A192F] tracking-tight uppercase leading-none">
                                            {driver.vehicle?.vehicleModel || "N/A"}
                                        </p>
                                        <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest">{driver.vehicle?.vehicleType || "GENERIC UNIT"}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Registry Number</p>
                                        <span className="bg-[#0A192F] text-[#FFD700] px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-[#0A192F]/10 tracking-widest">
                                            {driver.vehicle?.numberPlate || "N/A"}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Registry Cryptography (RC)</p>
                                    {driver.vehicle?.rc ? (
                                        <a href={getImageUrl(driver.vehicle.rc)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-slate-50 rounded-[24px] hover:bg-slate-100 transition-all border border-slate-100 group shadow-sm">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest leading-none mb-1">Registration Proof</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Audit-ready documentation</p>
                                            </div>
                                            <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-[#0A192F] transition-colors" />
                                        </a>
                                    ) : (
                                        <div className="text-center py-6 bg-slate-50 rounded-[24px] text-[10px] font-black text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 italic shadow-inner">
                                            Official RC proof pending upload
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 bg-white flex items-center justify-end gap-5">
                    {driver.vehicle ? (
                        <>
                            <button
                                onClick={() => onAction(driver.vehicle!._id, "REJECTED")}
                                className="px-10 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] italic text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100"
                            >
                                Decline Intent
                            </button>
                            <button
                                onClick={() => onAction(driver.vehicle!._id, "APPROVED")}
                                className="px-10 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] italic text-[#FFD700] bg-[#0A192F] hover:bg-black transition-all shadow-xl shadow-[#0A192F]/10 border border-[#0A192F]"
                            >
                                Authorize Driver
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-4 text-rose-600 text-[10px] font-black px-8 py-4 bg-rose-50 rounded-[20px] border border-rose-100 uppercase tracking-widest italic">
                            <AlertCircle className="w-5 h-5" />
                            Authorization requires complete asset profile
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
