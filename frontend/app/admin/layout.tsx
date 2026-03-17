"use client";

import React, { useEffect } from "react";
import {
    LayoutDashboard,
    ShieldCheck,
    Users,
    Car,
    Navigation,
    Wallet,
    History,
    LogOut,
    Bell,
    Search,
    TrendingUp,
    AlertTriangle,
    Ticket
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-hot-toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, clearAuth } = useAuthStore();

    useEffect(() => {
        if (user && user.role !== "ADMIN") {
            toast.error("Access denied");
            router.push("/user/dashboard");
        }
    }, [user, router]);

    const handleLogout = () => {
        clearAuth();
        router.push("/login");
    };

    const navItems = [
        { id: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { id: "drivers", href: "/admin/drivers", icon: ShieldCheck, label: "Drivers Management" },
        { id: "users", href: "/admin/users", icon: Users, label: "Users" },
        { id: "revenue", href: "/admin/revenue", icon: TrendingUp, label: "Revenue" },
        { id: "wallet", href: "/admin/wallet", icon: Wallet, label: "Wallet" },
    ];

    const supportItems = [
        { id: "emergency", href: "/admin/emergency", icon: AlertTriangle, label: "Emergency Reports", badge: 3 },
        { id: "discounts", href: "/admin/discounts", icon: Ticket, label: "Discounts" },
    ];

    return (
        <div className="flex h-screen bg-[#0A192F] overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-[280px] bg-[#0A192F] flex flex-col pt-10 z-20 shadow-2xl flex-shrink-0">
                <div className="px-8 mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/20">
                            <Car className="text-[#0A192F] w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-white font-black leading-none mb-1 text-lg tracking-tight uppercase italic">Go<span className="text-[#FFD700]">Ride</span></h1>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 mb-4">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] px-4 mb-4">Main Menu</p>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => router.push(item.href)}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${pathname === item.href
                                    ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-bold text-sm tracking-wide">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="px-4 mt-8">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] px-4 mb-4">Support & Settings</p>
                    <nav className="space-y-1">
                        {supportItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => router.push(item.href)}
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${pathname === item.href
                                    ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                                </div>
                                {item.badge && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pathname === item.href 
                                        ? "bg-[#0A192F] text-[#FFD700] border-[#0A192F]" 
                                        : "bg-rose-500/20 text-rose-500 border-rose-500/10"}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout Session
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0A192F]">
                <header className="h-20 bg-[#0A192F] border-b border-white/5 flex items-center justify-between px-10 flex-shrink-0 z-10 transition-colors duration-500">
                    <h2 className="text-xl font-bold text-white">Admin Overview</h2>

                    <div className="flex items-center gap-8">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search drivers, users..."
                                className="pl-11 pr-6 py-2.5 bg-white/5 border border-white/10 rounded-xl w-[300px] text-sm text-white focus:ring-2 ring-[#FFD700]/20 transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                            <button className="relative p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/10">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[#FFD700] rounded-full border-2 border-[#0A192F]"></span>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-white">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Super Admin</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center overflow-hidden">
                                    {user?.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="Admin profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[#0A192F] font-black text-xs uppercase italic">Go<span className="text-[#FFD700]">R</span></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
