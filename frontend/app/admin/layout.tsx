"use client";

import React, { useEffect } from "react";
import {
    LayoutDashboard,
    ShieldCheck,
    Users,
    Car,
    Navigation,
    History,
    LogOut,
    Bell,
    Search,
    TrendingUp,
    AlertTriangle,
    Ticket,
    CreditCard
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-hot-toast";
import api from "@/lib/axios";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, clearAuth } = useAuthStore();
    const [stats, setStats] = React.useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get("/admin/stats");
                setStats(res.data.stats);
            } catch (error) {
                console.error("Failed to fetch layout stats");
            }
        };
        fetchStats();
    }, []);

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
        { id: "revenue", href: "/admin/revenue", icon: CreditCard, label: "Revenue Intelligence" },
        { id: "notifications", href: "/admin/notifications", icon: Bell, label: "System Alerts" },
    ];

    const supportItems = [
        { id: "emergency", href: "/admin/emergency", icon: AlertTriangle, label: "Emergency Reports", badge: stats?.emergencyAlerts || 0 },
        { id: "discounts", href: "/admin/discounts", icon: Ticket, label: "Discounts" },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-[#0A192F]">
            {/* Sidebar */}
            <aside className="w-[260px] bg-black flex flex-col z-20 flex-shrink-0 transition-all duration-300">
                <div className="p-6 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#FFD700] rounded-lg flex items-center justify-center shadow-lg shadow-[#FFD700]/10">
                            <Car className="text-[#0A192F] w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-white font-black leading-none text-lg tracking-tight uppercase">Go<span className="text-[#FFD700]">Ride</span></h1>
                            <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Admin Console</p>
                        </div>
                    </div>
                </div>

                <div className="px-3 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="mb-6">
                        <p className="text-[11px] font-black text-neutral-500 uppercase tracking-widest px-4 mb-2 opacity-60">Main Menu</p>
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.href)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${pathname === item.href
                                        ? "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 font-black"
                                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 transition-colors ${pathname === item.href ? "text-[#FFD700]" : "text-neutral-500 group-hover:text-white"}`} />
                                    <span className="text-[13px] font-medium">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mb-6">
                        <p className="text-[11px] font-black text-neutral-500 uppercase tracking-widest px-4 mb-2 opacity-60">Operations</p>
                        <nav className="space-y-1">
                            {supportItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.href)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group ${pathname === item.href
                                        ? "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 font-black"
                                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={`w-5 h-5 transition-colors ${pathname === item.href ? "text-[#FFD700]" : "text-neutral-500 group-hover:text-white"}`} />
                                        <span className="text-[13px] font-medium">{item.label}</span>
                                    </div>
                                    {item.badge && (
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${pathname === item.href 
                                            ? "bg-[#FFD700] text-[#0A192F]" 
                                            : "bg-rose-500/10 text-rose-600 border border-rose-500/10"}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 group font-bold text-[13px]"
                    >
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
                <header className="h-20 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 z-10">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Platform System</span>
                        <h2 className="text-sm font-black text-[#0A192F] tracking-wide uppercase italic">
                            {pathname === "/admin/dashboard" ? "Dashboard Overview" : 
                            (pathname.split("/").pop() || "").charAt(0).toUpperCase() + (pathname.split("/").pop() || "").slice(1)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">

                        <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                            <button className="relative p-2 text-slate-400 hover:text-[#0A192F] hover:bg-slate-50 rounded-xl transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
                            </button>
                            {user && (
                                <div className="flex items-center gap-3 ml-2 group cursor-pointer">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[12px] font-black text-[#0A192F] leading-tight group-hover:text-[#FFD700] transition-colors uppercase tracking-tight">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Administrator</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-[#0A192F] border border-[#0A192F] flex items-center justify-center overflow-hidden transition-all group-hover:border-[#FFD700] shadow-xl shadow-[#0A192F]/5">
                                        {user.profilePhoto ? (
                                            <img src={user.profilePhoto} alt="Admin profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[#0A192F] text-[#FFD700] font-black text-[11px]">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
                    {children}
                </main>
            </div>
        </div>
    );
}
