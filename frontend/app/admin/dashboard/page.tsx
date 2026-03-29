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
    ChevronRight,
    Search,
    Filter,
    Download,
    MoreHorizontal,
    Calendar,
    Clock,
    CreditCard,
    Plus
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
    blockedUsers: number;
    suspiciousUsers: number;
    revenueTrend: number;
    ridesTrend: number;
    driversTrend: number;
    totalGrowth: number;
}

interface Transaction {
    _id: string;
    userId: { name: string; email: string };
    type: "CREDIT" | "DEBIT";
    amount: number;
    status: "SUCCESS" | "PENDING" | "FAILED";
    createdAt: string;
    description: string;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [revenueData, setRevenueData] = useState<{ month: string, amount: number }[]>([]);
    const [dailyRides, setDailyRides] = useState<{ day: string, count: number }[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchDashboardData = async () => {
        try {
            const [statsRes, transRes] = await Promise.all([
                api.get("/admin/stats"),
                api.get("/admin/transactions")
            ]);
            setStats(statsRes.data.stats);
            setRevenueData(statsRes.data.monthlyRevenue || []);
            setDailyRides(statsRes.data.dailyRides || []);
            setTransactions(transRes.data.slice(0, 10) || []); // Only show latest 10
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-[#132F44] rounded-2xl border border-[#1F3A52]"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[400px] bg-[#132F44] rounded-3xl border border-[#1F3A52]"></div>
                    <div className="h-[400px] bg-[#132F44] rounded-3xl border border-[#1F3A52]"></div>
                </div>
                <div className="h-64 bg-[#132F44] rounded-3xl border border-[#1F3A52]"></div>
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, trend, colorClass = "text-[#3B82F6]", borderHighlight = "border-l-[#3B82F6]" }: any) => (
        <div className={`bg-[#132F44] p-5 rounded-2xl border border-[#1F3A52] border-l-4 ${borderHighlight} hover:translate-y-[-4px] transition-all duration-300 shadow-sm relative overflow-hidden group`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-[#6B859E] uppercase tracking-wider">{title}</span>
                <div className={`p-1.5 rounded-lg bg-white/5 border border-white/5 group-hover:bg-[#3B82F6]/10 group-hover:border-[#3B82F6]/20 transition-colors`}>
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                </div>
            </div>
            <div className="flex flex-col">
                <h3 className="text-2xl font-bold text-[#E6EDF3] tracking-tight">{value}</h3>
                {trend !== undefined && (
                    <div className="mt-2 flex items-center gap-1">
                        <span className={`flex items-center text-[10px] font-bold ${trend >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {Math.abs(trend)}%
                        </span>
                        <span className="text-[10px] text-[#6B859E] font-medium ml-1">vs last month</span>
                    </div>
                )}
            </div>
        </div>
    );

    const StatusBadge = ({ status }: { status: "SUCCESS" | "PENDING" | "FAILED" }) => {
        const styles = {
            SUCCESS: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
            PENDING: "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20",
            FAILED: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
        };
        return (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#0B1E2D] min-h-full transition-all duration-300">
            {/* Header / Actions Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#E6EDF3]">Platform Overview</h1>
                    <p className="text-xs text-[#6B859E] mt-1 font-medium">Real-time metrics and system performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#132F44] border border-[#1F3A52] rounded-xl text-[13px] font-semibold text-[#9FB3C8] hover:bg-[#1F3A52] hover:text-[#E6EDF3] transition-all">
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] rounded-xl text-[13px] font-semibold text-white hover:bg-[#2563EB] transition-all shadow-lg shadow-[#3B82F6]/20">
                        <Plus className="w-4 h-4" />
                        Create Promo
                    </button>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats?.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    trend={stats?.revenueTrend}
                    borderHighlight="border-l-[#FACC15]"
                    colorClass="text-[#FACC15]"
                />
                <StatCard
                    title="Active Rides"
                    value={stats?.activeRides}
                    icon={TrendingUp}
                    trend={stats?.ridesTrend}
                    borderHighlight="border-l-[#3B82F6]"
                />
                <StatCard
                    title="Total Drivers"
                    value={stats?.totalDrivers}
                    icon={Car}
                    trend={stats?.driversTrend}
                    borderHighlight="border-l-[#3B82F6]"
                />
                <StatCard
                    title="Pending Verifications"
                    value={stats?.pendingApprovals}
                    icon={ShieldCheck}
                    borderHighlight={stats?.pendingApprovals && stats.pendingApprovals > 0 ? "border-l-[#FACC15]" : "border-l-[#3B82F6]"}
                    colorClass={stats?.pendingApprovals && stats.pendingApprovals > 0 ? "text-[#FACC15]" : "text-[#3B82F6]"}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-[#132F44] p-6 rounded-3xl border border-[#1F3A52] shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-[#E6EDF3] tracking-wide">Revenue Trends</h3>
                            <p className="text-[11px] text-[#6B859E] mt-1 font-medium">Monthly credit transactions flow</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#3B82F6] rounded-full"></span>
                                <span className="text-[10px] font-bold text-[#6B859E] uppercase">Credits</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-4 px-2 pb-2">
                        {revenueData.map((m, idx) => {
                            const maxAmount = Math.max(...revenueData.map(r => r.amount), 1);
                            const height = (m.amount / maxAmount) * 100;
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-3 group">
                                    <div className="w-full bg-[#0B1E2D] rounded-xl relative overflow-hidden flex-1 min-h-[140px]">
                                        <div
                                            className={`absolute bottom-0 left-0 right-0 ${idx === revenueData.length - 1 ? 'bg-[#3B82F6]' : 'bg-[#3B82F6]/30'} rounded-t-lg transition-all duration-700 hover:bg-[#3B82F6]/60`}
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1F3A52] text-white text-[9px] font-bold px-2 py-1 rounded border border-[#3B82F6]/20 whitespace-nowrap transition-all">
                                                ₹{m.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-[#6B859E] uppercase tracking-tighter">{m.month}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Ride Stats Bar Chart */}
                <div className="bg-[#132F44] p-6 rounded-3xl border border-[#1F3A52] shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-sm font-bold text-[#E6EDF3] tracking-wide mb-1">Ride Volume</h3>
                    <p className="text-[11px] text-[#6B859E] mb-6 font-medium">Weekly activity breakdown</p>

                    <div className="flex-1 flex flex-col gap-4 justify-center">
                        {dailyRides.map((d, i) => {
                            const maxRides = Math.max(...dailyRides.map(r => r.count), 1);
                            const width = (d.count / maxRides) * 100;
                            return (
                                <div key={i} className="space-y-1.5 group">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-[#9FB3C8] uppercase tracking-wider">{d.day}</span>
                                        <span className="text-[#E6EDF3]">{d.count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-[#0B1E2D] rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6] rounded-full transition-all duration-1000 group-hover:from-[#3B82F6]/40 group-hover:to-[#3B82F6]" 
                                            style={{ width: `${width}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#1F3A52] flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-[#6B859E] font-bold uppercase tracking-widest">Growth</p>
                            <p className="text-base font-bold text-[#E6EDF3]">{(stats?.totalGrowth ?? 0) > 0 ? '+' : ''}{stats?.totalGrowth ?? 0}%</p>
                        </div>
                        <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="bg-[#132F44] rounded-3xl border border-[#1F3A52] shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#1F3A52] flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-[#E6EDF3] tracking-wide">Transaction Ledger</h3>
                        <p className="text-[11px] text-[#6B859E] mt-1 font-medium">Recent financial activities across the platform</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-[#0B1E2D] border border-[#1F3A52] rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-[#6B859E]" />
                            <input type="text" placeholder="Filter..." className="bg-transparent border-none outline-none text-[11px] text-[#E6EDF3] w-24" />
                        </div>
                        <button className="p-2 bg-[#0B1E2D] border border-[#1F3A52] rounded-lg text-[#9FB3C8] hover:text-white transition-all">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0B1E2D]/50">
                                <th className="px-6 py-3.5 text-[10px] font-bold text-[#6B859E] uppercase tracking-wider">User / Member</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-[#6B859E] uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-[#6B859E] uppercase tracking-wider text-right">Amount</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-[#6B859E] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-[#6B859E] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-[#6B859E] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F3A52]">
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] font-bold text-[10px] border border-[#3B82F6]/10">
                                                {tx.userId?.name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-semibold text-[#E6EDF3]">{tx.userId?.name || "Unknown User"}</p>
                                                <p className="text-[10px] text-[#6B859E]">{tx.userId?.email || ""}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            {tx.type === "CREDIT" ? (
                                                <div className="p-1 rounded bg-[#22C55E]/10 text-[#22C55E]">
                                                    <ArrowUpRight className="w-3 h-3" />
                                                </div>
                                            ) : (
                                                <div className="p-1 rounded bg-[#EF4444]/10 text-[#EF4444]">
                                                    <ArrowDownRight className="w-3 h-3" />
                                                </div>
                                            )}
                                            <span className="text-[11px] font-medium text-[#9FB3C8]">{tx.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-bold text-[#E6EDF3] text-[12px]">
                                        {tx.type === "CREDIT" ? "+" : "-"} ₹{tx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <StatusBadge status={tx.status} />
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-[#E6EDF3] font-medium">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                            <span className="text-[9px] text-[#6B859E] font-bold uppercase tracking-tighter">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <button className="p-1.5 text-[#6B859E] hover:text-white hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[#6B859E]">
                                            <div className="w-12 h-12 bg-[#0B1E2D] rounded-full flex items-center justify-center border border-[#1F3A52]">
                                                <CreditCard className="w-6 h-6 opacity-20" />
                                            </div>
                                            <p className="text-xs font-semibold">No recent transactions found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {transactions.length > 0 && (
                    <div className="p-4 bg-[#0B1E2D]/30 border-t border-[#1F3A52] flex justify-center">
                        <button className="text-[11px] font-bold text-[#3B82F6] hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2" onClick={() => router.push('/admin/wallet')}>
                            View Complete Ledger
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

