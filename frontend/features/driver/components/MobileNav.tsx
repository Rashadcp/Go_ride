"use client";

import React from "react";
import { TrendingUp, History, Star, Settings } from "lucide-react";

interface MobileNavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', icon: TrendingUp, label: 'Live' },
        { id: 'history', icon: History, label: 'Trips' },
        { id: 'reviews', icon: Star, label: 'Reviews' },
        { id: 'profile', icon: Settings, label: 'Me' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0A192F] border-t border-white/10 flex items-center justify-around z-[100] lg:hidden px-2 backdrop-blur-2xl bg-[#0A192F]/90">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? "text-[#FFD700] scale-110" : "text-slate-500 hover:text-white"}`}
                >
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'fill-[#FFD700]/10' : ''}`} />
                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};
