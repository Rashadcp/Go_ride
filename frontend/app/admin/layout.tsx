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
        <div className="flex h-screen bg-[#0B1E2D] overflow-hidden font-sans text-[#E6EDF3]">
            {/* Sidebar */}
            <aside className="w-[260px] bg-[#0B1E2D] border-r border-[#1F3A52] flex flex-col z-20 flex-shrink-0 transition-all duration-300">
                <div className="p-6 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#FACC15] rounded-lg flex items-center justify-center shadow-lg shadow-[#FACC15]/10">
                            <Car className="text-[#0B1E2D] w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold leading-none text-lg tracking-tight">Go<span className="text-[#FACC15]">Ride</span></h1>
                            <p className="text-[10px] font-semibold tracking-wider text-[#6B859E] uppercase">Admin Console</p>
                        </div>
                    </div>
                </div>

                <div className="px-3 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="mb-6">
                        <p className="text-[11px] font-bold text-[#6B859E] uppercase tracking-wider px-4 mb-2">Main Menu</p>
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.href)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${pathname === item.href
                                        ? "bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20"
                                        : "text-[#9FB3C8] hover:bg-[#132F44] hover:text-[#E6EDF3]"
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 transition-colors ${pathname === item.href ? "text-[#3B82F6]" : "text-[#6B859E] group-hover:text-[#9FB3C8]"}`} />
                                    <span className="font-medium text-[13px]">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mb-6">
                        <p className="text-[11px] font-bold text-[#6B859E] uppercase tracking-wider px-4 mb-2">Operations</p>
                        <nav className="space-y-1">
                            {supportItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.href)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group ${pathname === item.href
                                        ? "bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20"
                                        : "text-[#9FB3C8] hover:bg-[#132F44] hover:text-[#E6EDF3]"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={`w-5 h-5 transition-colors ${pathname === item.href ? "text-[#3B82F6]" : "text-[#6B859E] group-hover:text-[#9FB3C8]"}`} />
                                        <span className="font-medium text-[13px]">{item.label}</span>
                                    </div>
                                    {item.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pathname === item.href 
                                            ? "bg-[#3B82F6] text-white" 
                                            : "bg-[#EF4444]/10 text-[#EF4444]"}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-[#1F3A52]">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#6B859E] hover:bg-[#EF4444]/10 hover:text-[#EF4444] transition-all duration-200 group font-medium text-[13px]"
                    >
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0B1E2D]">
                <header className="h-16 border-b border-[#1F3A52] flex items-center justify-between px-8 flex-shrink-0 z-10">
                    <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-wide">
                        {pathname === "/admin/dashboard" ? "Dashboard Overview" : 
                         pathname.split("/").pop()?.charAt(0).toUpperCase() + pathname.split("/").pop()?.slice(1)}
                    </h2>

                    <div className="flex items-center gap-6">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B859E]" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="pl-9 pr-4 py-1.5 bg-[#132F44] border border-[#1F3A52] rounded-lg w-[260px] text-[13px] text-[#E6EDF3] focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all outline-none placeholder-[#6B859E]"
                            />
                        </div>

                        <div className="flex items-center gap-3 pl-6 border-l border-[#1F3A52]">
                            <button className="relative p-1.5 text-[#9FB3C8] hover:text-[#E6EDF3] hover:bg-[#132F44] rounded-lg transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FACC15] rounded-full border-2 border-[#132F44]"></span>
                            </button>
                            {user && (
                                <div className="flex items-center gap-3 ml-2 group cursor-pointer">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[12px] font-semibold text-[#E6EDF3] leading-tight group-hover:text-[#3B82F6] transition-colors">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-[#6B859E] font-medium uppercase tracking-wider">Super Admin</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#3B82F6]/50 shadow-sm">
                                        {user.profilePhoto ? (
                                            <img src={user.profilePhoto} alt="Admin profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white font-bold text-[10px]">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#0B1E2D]">
                    {children}
                </main>
            </div>
        </div>
    );
}
