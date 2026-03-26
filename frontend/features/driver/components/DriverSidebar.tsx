"use client";

import React from "react";
import { Navigation, TrendingUp, History, Star, Wallet, Settings, LogOut } from "lucide-react";

interface DriverSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    handleLogout: () => void;
}

export const DriverSidebar: React.FC<DriverSidebarProps> = ({ activeTab, setActiveTab, handleLogout }) => {
    const navItems = [
        { id: 'dashboard', icon: TrendingUp, label: 'Live Console' },
        { id: 'history', icon: History, label: 'Trips' },
        { id: 'reviews', icon: Star, label: 'Reviews' },
        { id: 'earnings', icon: Wallet, label: 'Payouts' },
        { id: 'profile', icon: Settings, label: 'Profile' },
    ];

    return (
        <aside className="hidden lg:flex w-[80px] lg:w-[280px] bg-[#0A192F] border-r border-white/5 flex-col pt-10 z-30 shadow-2xl flex-shrink-0 transition-all duration-300">
            <div className="px-6 lg:px-8 mb-12 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10 shrink-0">
                        <Navigation className="text-[#0A192F] w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <span className="font-black text-2xl tracking-tighter text-white uppercase italic hidden lg:block">Go<span className="text-[#FFD700]">Ride</span></span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[0.1em] ${activeTab === item.id ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20 scale-[1.02]" : "text-slate-500 hover:bg-white/5 hover:text-white"}`}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="hidden lg:block">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 mt-auto shrink-0 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-500 transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-rose-500/30"
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="hidden lg:block">Logout</span>
                </button>
            </div>
        </aside>
    );
};
