"use client";

import React, { useState } from "react";
import { Navigation, Menu, X, LogOut, Shield, HelpCircle, Star } from "lucide-react";

interface MobileHeaderProps {
    handleLogout: () => void;
    userName?: string;
    userPhoto?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ handleLogout, userName, userPhoto }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <header className="lg:hidden h-20 bg-[#0A192F]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-[150] transition-all">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10">
                        <Navigation className="text-[#0A192F] w-5 h-5" />
                    </div>
                    <span className="font-black text-xl tracking-tighter text-white uppercase italic">
                        Go<span className="text-[#FFD700]">Ride</span>
                    </span>
                </div>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        isOpen ? "bg-white/10 text-[#FFD700]" : "bg-white/5 text-white"
                    }`}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Overlay Menu */}
            {isOpen && (
                <div className="fixed inset-0 z-[140] lg:hidden">
                    <div 
                        className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-md animate-in fade-in duration-300" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    <div className="absolute top-24 left-4 right-4 bg-[#0A192F] border border-white/10 rounded-[40px] shadow-2xl p-6 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl -mr-10 -mt-10" />
                        
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                <img 
                                    src={userPhoto || `https://ui-avatars.com/api/?name=${userName}&background=0A192F&color=FFD700&bold=true`} 
                                    className="w-full h-full object-cover" 
                                    alt="Profile" 
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#FFD700] mb-1">Active Partner</p>
                                <p className="text-lg font-black text-white truncate leading-none italic uppercase">{userName || "Driver Partner"}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    Safety Center
                                </div>
                            </button>
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <HelpCircle className="w-4 h-4 text-blue-500" />
                                    Support Hub
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                handleLogout();
                            }}
                            className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] bg-rose-500/10 text-rose-500 font-black uppercase tracking-[0.15em] text-xs border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-[0.98]"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out Account
                        </button>
                        
                        <div className="mt-6 text-center">
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">GoRide v2.4.0 • Driver Edition</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
