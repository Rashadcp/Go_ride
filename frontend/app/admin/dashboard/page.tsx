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
    Plus,
    Activity,
    Printer
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchDashboardData = async () => {
        try {
            const typeParam = typeFilter === "ALL" ? "" : `&type=${typeFilter}`;
            const [statsRes, transRes] = await Promise.all([
                api.get("/admin/stats"),
                api.get(`/admin/transactions?limit=50${typeParam}`)
            ]);
            setStats(statsRes.data.stats);
            setRevenueData(statsRes.data.monthlyRevenue || []);
            setDailyRides(statsRes.data.dailyRides || []);
            
            // Extract transactions from the paginated object returned by the backend
            if (transRes.data && transRes.data.transactions) {
                setTransactions(transRes.data.transactions);
            } else if (Array.isArray(transRes.data)) {
                setTransactions(transRes.data.slice(0, 10));
            }
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => 
        tx.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        fetchDashboardData();
    }, [typeFilter]);

    const handlePrintAudit = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(10, 25, 47);
        doc.text(`GoRide - ${typeFilter !== 'ALL' ? typeFilter : 'Full'} Audit Ledger`, 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = filteredTransactions.map(tx => [
            tx.userId?.name || "Unknown",
            tx.userId?.email || "N/A",
            tx.type,
            `${tx.type === "CREDIT" ? "+" : "-"} INR ${tx.amount.toLocaleString()}`,
            tx.status,
            new Date(tx.createdAt).toLocaleDateString()
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Member', 'Email', 'Type', 'Amount', 'Status', 'Timestamp']],
            body: tableData,
            headStyles: { fillColor: [10, 25, 47], textColor: [251, 191, 36], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
        toast.success("Transaction audit prepared for printing");
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-[400px] bg-white rounded-3xl border border-slate-100"></div>
                    <div className="h-[400px] bg-white rounded-3xl border border-slate-100"></div>
                </div>
                <div className="h-64 bg-white rounded-3xl border border-slate-100"></div>
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, trend, colorClass = "text-[#FFD700]", borderHighlight = "border-l-[#FFD700]" }: any) => (
        <div className={`bg-white p-5 rounded-2xl border border-slate-100 border-l-4 ${borderHighlight} hover:translate-y-[-4px] transition-all duration-300 shadow-sm relative overflow-hidden group`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={`p-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-[#FFD700]/10 group-hover:border-[#FFD700]/20 transition-colors`}>
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                </div>
            </div>
            <div className="flex flex-col">
                <h3 className="text-2xl font-black text-[#0A192F] tracking-tight">{value}</h3>
                {trend !== undefined && (
                    <div className="mt-2 flex items-center gap-1">
                        <span className={`flex items-center text-[10px] font-black ${trend >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {Math.abs(trend)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Term Growth</span>
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
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8FAFC] min-h-full transition-all duration-300">
            {/* Header / Actions Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-black text-[#0A192F] uppercase tracking-tight italic">Platform <span className="text-[#FFD700]">Overview</span></h1>
                    <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Real-time metrics and system performance</p>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats?.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    trend={stats?.revenueTrend}
                    borderHighlight="border-l-[#FFD700]"
                    colorClass="text-[#FFD700]"
                />
                <StatCard
                    title="Active Rides"
                    value={stats?.activeRides}
                    icon={TrendingUp}
                    trend={stats?.ridesTrend}
                    borderHighlight="border-l-[#FFD700]"
                />
                <StatCard
                    title="Total Drivers"
                    value={stats?.totalDrivers}
                    icon={Car}
                    trend={stats?.driversTrend}
                    borderHighlight="border-l-emerald-500"
                    colorClass="text-emerald-500"
                />
                <StatCard
                    title="Pending Verifications"
                    value={stats?.pendingApprovals}
                    icon={ShieldCheck}
                    borderHighlight={stats?.pendingApprovals && stats.pendingApprovals > 0 ? "border-l-[#FFD700]" : "border-l-[#FFD700]/30"}
                    colorClass={stats?.pendingApprovals && stats.pendingApprovals > 0 ? "text-[#FFD700]" : "text-[#FFD700]/50"}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-[420px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1">Financial Efficiency</h3>
                            <h2 className="text-lg font-black text-[#0A192F] uppercase tracking-tight">Revenue Trends</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#FFD700] rounded-full"></span>
                                <span className="text-[10px] font-black text-[#6B859E] uppercase">Credits</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-4 px-2 pb-2">
                        {revenueData.map((m, idx) => {
                            const maxAmount = Math.max(...revenueData.map(r => r.amount), 1);
                            const height = (m.amount / maxAmount) * 100;
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-3 group">
                                    <div className="w-full bg-slate-50 rounded-2xl relative overflow-hidden flex-1 min-h-[140px] border border-slate-100">
                                        <div
                                            className={`absolute bottom-0 left-0 right-0 ${idx === revenueData.length - 1 ? 'bg-[#FFD700]' : 'bg-[#0A192F]/10'} rounded-t-xl transition-all duration-700 hover:bg-[#FFD700] hover:shadow-lg hover:shadow-[#FFD700]/20`}
                                            style={{ height: `${height}%` }}
                                        >
                                            {/* Permanent Label */}
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#0A192F] text-[9px] font-black whitespace-nowrap">
                                                ₹{m.amount >= 1000 ? `${(m.amount / 1000).toFixed(1)}K` : m.amount}
                                            </div>
                                            
                                            {/* Tooltip on Hover */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-[#0A192F] text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap transition-all z-10 uppercase tracking-widest pointer-events-none">
                                                ₹{m.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{m.month}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Ride Stats Bar Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-sm font-black text-[#0A192F] tracking-wide mb-1">Ride Volume</h3>
                    <p className="text-[11px] text-slate-400 mb-6 font-medium uppercase tracking-widest">Weekly activity breakdown</p>

                    <div className="flex-1 flex flex-col gap-4 justify-center">
                        {dailyRides.map((d, i) => {
                            const maxRides = Math.max(...dailyRides.map(r => r.count), 1);
                            const width = (d.count / maxRides) * 100;
                            return (
                                <div key={i} className="space-y-1.5 group">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">{d.day}</span>
                                        <span className="text-[#0A192F] font-black">{d.count}</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#FFD700]/40 to-[#FFD700] rounded-full transition-all duration-1000 group-hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] shadow-sm" 
                                            style={{ width: `${width}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Growth</p>
                            <p className="text-2xl font-black text-[#0A192F]">{(stats?.totalGrowth ?? 0) > 0 ? '+' : ''}{stats?.totalGrowth ?? 0}%</p>
                        </div>
                        <div className="w-12 h-12 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center border border-[#FFD700]/10">
                            <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Auditing Ledger */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] transition-all duration-500">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h2 className="font-black text-[#0A192F] uppercase tracking-widest text-[13px] flex items-center gap-4 italic lg:text-[15px]">
                        <div className="w-10 h-10 bg-[#FFD700]/10 rounded-xl flex items-center justify-center border border-[#FFD700]/20">
                            <Activity className="w-6 h-6 text-[#FFD700]" />
                        </div>
                        Transaction Auditing Layer
                    </h2>
                    <div className="flex gap-4">
                        <button 
                            onClick={handlePrintAudit}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-[#0A192F] hover:bg-slate-100 transition-all border border-slate-100 flex items-center gap-2 group"
                            title="Print Current Audit"
                        >
                            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Print Audit</span>
                        </button>
                        <div className="relative group">
                            <div className="hidden group-hover:block absolute right-0 top-1/2 -translate-y-1/2 mr-14">
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex items-center gap-3 w-64 shadow-xl">
                                    <Search className="w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Filter records..." 
                                        className="bg-transparent border-none outline-none text-[12px] text-[#0A192F] font-bold w-full placeholder-slate-400" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => setTypeFilter(prev => prev === "ALL" ? "CREDIT" : prev === "CREDIT" ? "DEBIT" : "ALL")}
                                className={`p-3 rounded-xl transition-all border flex items-center gap-2 ${typeFilter !== "ALL" ? "bg-[#FFD700] text-[#0A192F] border-[#FFD700] font-black scale-105" : "bg-slate-50 text-slate-400 border-slate-100 hover:text-[#0A192F] hover:bg-slate-100"}`}
                                title={`Currently filtering by: ${typeFilter}`}
                            >
                                <Filter className="w-5 h-5" />
                                {typeFilter !== "ALL" && <span className="text-[10px] uppercase">{typeFilter}</span>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full overflow-x-auto overflow-y-auto min-h-[500px] max-h-[1000px] custom-scrollbar">
                    <table className="w-full min-w-[920px] text-left border-collapse">
                        <thead className="bg-[#F8FAFC] sticky top-0 z-10 shadow-sm">
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Origin / Member</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tx Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-[#0A192F] uppercase tracking-widest italic text-right">Impact</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Audit Timestamp</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer border-b border-slate-50 last:border-0 font-bold">
                                        <td className="px-8 py-7">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[#0A192F] flex items-center justify-center text-[#FFD700] font-black text-sm border border-[#0A192F] shadow-sm group-hover:border-[#FFD700] transition-all shrink-0">
                                                    {tx.userId?.name?.charAt(0) || "U"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[14px] font-black text-[#0A192F] tracking-tight truncate">{tx.userId?.name || "Unknown Target"}</p>
                                                    <p className="text-[11px] text-slate-400 font-bold truncate opacity-80 uppercase tracking-widest">{tx.userId?.email || ""}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7">
                                            <div className="flex items-center gap-2">
                                                {tx.type === "CREDIT" ? (
                                                    <div className="p-1.5 rounded-xl bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/10">
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 rounded-xl bg-rose-50 text-rose-500 border border-rose-100">
                                                        <ArrowDownRight className="w-3 h-3" />
                                                    </div>
                                                )}
                                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{tx.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7 text-right font-black text-[15px] tabular-nums">
                                            <span className={tx.type === "CREDIT" ? "text-[#22C55E]" : "text-rose-500"}>
                                                {tx.type === "CREDIT" ? "+" : "-"} ₹{tx.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-7">
                                            <StatusBadge status={tx.status} />
                                        </td>
                                        <td className="px-8 py-7">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-[#0A192F] tracking-tighter italic">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <button className="p-1.5 text-slate-300 hover:text-[#0A192F] hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                                <Search className="w-6 h-6 text-slate-200" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">No matching auditory records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {transactions.length > 0 && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center text-center">
                        <button className="text-[11px] font-black text-[#0A192F] hover:text-[#FFD700] transition-colors uppercase tracking-widest flex items-center gap-3 mx-auto group" onClick={() => router.push('/admin/revenue')}>
                            Analyze Full Ledger
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
