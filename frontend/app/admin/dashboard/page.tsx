"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    Users,
    Car,
    ShieldCheck,
    TrendingUp,
    XCircle,
    DollarSign,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DashboardStats {
    totalUsers: number;
    totalDrivers: number;
    pendingApprovals: number;
    activeRides: number;
    cancelledRides: number;
    totalRevenue: number;
    walletBalance: number;
    emergencyAlerts: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [revenueData, setRevenueData] = useState<{ month: string, amount: number }[]>([]);
    const [dailyRides, setDailyRides] = useState<{ day: string, count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchStats = async () => {
        try {
            const response = await api.get("/admin/stats");
            setStats(response.data.stats);
            setRevenueData(response.data.monthlyRevenue || []);
            setDailyRides(response.data.dailyRides || []);
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-bg-main transition-colors duration-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700]"></div>
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, trend, color, subtext }: any) => (
        <div className="bg-white/5 p-6 rounded-[24px] shadow-sm border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${trend > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                        {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-slate-400 text-xs font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-white transition-colors">{value}</h3>
                {subtext && <p className="text-[10px] text-slate-500 mt-2 font-medium">{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto transition-all duration-500 bg-[#0A192F] min-h-screen">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers.toLocaleString()}
                    icon={Users}
                    color="text-[#FFD700]"
                />
                <StatCard
                    title="Total Taxi Drivers"
                    value={stats?.totalDrivers.toLocaleString()}
                    icon={Car}
                    color="text-[#FFB800]"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats?.pendingApprovals}
                    icon={ShieldCheck}
                    color="text-amber-500"
                    subtext="Action Needed"
                />
                <StatCard
                    title="Active Rides"
                    value={stats?.activeRides}
                    icon={TrendingUp}
                    color="text-[#FFD700]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Cancelled Rides"
                    value={stats?.cancelledRides}
                    icon={XCircle}
                    color="text-rose-500"
                />
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats?.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="text-[#FFD700]"
                />
                <StatCard
                    title="Wallet Balance"
                    value={`₹${stats?.walletBalance.toLocaleString()}`}
                    icon={DollarSign}
                    color="text-[#FFB800]"
                    subtext="Stable"
                />
                <StatCard
                    title="Emergency Alerts"
                    value={stats?.emergencyAlerts}
                    icon={AlertTriangle}
                    color="text-rose-400"
                    subtext="Urgent"
                />
            </div>

            {/* Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 p-8 rounded-[32px] border border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div>
                            <h3 className="text-lg font-bold text-white">Daily Ride Activity</h3>
                            <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">Ride volume over the last 7 days</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-[#FFD700] rounded-full"></span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-white/10 rounded-full"></span>
                                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Previous</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[280px] w-full bg-white/5 rounded-[28px] flex items-end justify-between px-6 pb-4 relative group overflow-hidden border border-white/5 gap-2">
                        {dailyRides.map((d, i) => {
                            const maxRides = Math.max(...dailyRides.map(r => r.count), 1);
                            const height = (d.count / maxRides) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                                    <div className="w-full bg-[#FFD700]/10 rounded-t-lg relative overflow-hidden transition-all duration-500 hover:bg-[#FFD700]/20" style={{ height: `${height}%` }}>
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFD700] opacity-50"></div>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{d.day}</span>
                                </div>
                            );
                        })}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <div className="bg-[#0A192F] text-[#FFD700] px-4 py-2 rounded-xl text-xs font-black shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">{stats?.activeRides || 0} Total Rides</div>
                            <TrendingUp className="w-8 h-8 text-[#FFD700] mx-auto mt-4 opacity-20" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-white">Revenue Growth</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">Monthly earnings comparison</p>

                    <div className="flex-1 flex items-end justify-between gap-3 px-2 mt-10">
                        {revenueData.map((m, idx) => {
                            const maxAmount = Math.max(...revenueData.map(r => r.amount), 1);
                            const height = (m.amount / maxAmount) * 100;
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-4">
                                    <div className="w-full bg-white/5 rounded-xl relative overflow-hidden h-[180px]">
                                        <div
                                            className={`absolute bottom-0 left-0 right-0 ${idx === revenueData.length - 1 ? 'bg-[#FFD700]' : 'bg-[#FFD700]/30'} rounded-xl transition-all duration-700 delay-500`}
                                            style={{ height: `${height}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.month}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-10 p-5 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Total Revenue Recorded</p>
                            <p className="text-xl font-black text-white tracking-tight">₹{stats?.totalRevenue.toLocaleString()} <span className="text-xs text-[#FFD700] ml-1 font-black">LIVE</span></p>
                        </div>
                        <ArrowUpRight className="w-6 h-6 text-[#FFD700]" />
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white/5 p-6 rounded-[32px] border border-white/5 shadow-sm flex items-center justify-between px-10 group cursor-pointer hover:border-[#FFD700]/20 transition-all" onClick={() => router.push('/admin/drivers')}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center text-[#FFD700]">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Live Driver Verifications</h3>
                        <p className="text-xs text-slate-400 font-medium">Click to review pending applications</p>
                    </div>
                </div>
                <button className="p-3 bg-white/5 text-white rounded-2xl group-hover:bg-[#FFD700] group-hover:text-[#0A192F] transition-all">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
