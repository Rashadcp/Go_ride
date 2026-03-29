"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Calendar,
    Filter,
    Download,
    Loader2,
    PieChart,
    Activity,
    CreditCard
} from "lucide-react";

interface Transaction {
    _id: string;
    userId: { name: string, email: string };
    amount: number;
    type: string;
    status: string;
    createdAt: string;
}

export default function AdminRevenuePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [txRes, statsRes] = await Promise.all([
                api.get("/admin/transactions"),
                api.get("/admin/stats")
            ]);
            setTransactions(txRes.data);
            setStats(statsRes.data.stats);
        } catch (error: any) {
            toast.error("Failed to load financial data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-bg-main">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-bold">Synchronizing Financial Records...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#0A192F] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Revenue <span className="text-[#FFD700]">Intelligence</span></h1>
                    <p className="text-slate-400 font-medium mt-1">Real-time financial tracking and growth metrics</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-white/10 transition-transform">
                        <Download className="w-4 h-4" />
                        Export Ledger
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                <div className="bg-white/5 p-8 rounded-[40px] shadow-sm border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-20 h-20 text-white" />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Total Revenue</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter mb-2">₹{stats?.totalRevenue?.toLocaleString()}</h3>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase">
                        <ArrowUpRight className="w-4 h-4" />
                        +14.5% vs Last Month
                    </div>
                </div>

                <div className="bg-[#FFD700] p-8 rounded-[40px] shadow-2xl relative overflow-hidden group text-[#0A192F]">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                        <CreditCard className="w-24 h-24 text-[#0A192F]" />
                    </div>
                    <p className="text-[10px] font-black text-[#0A192F]/60 uppercase tracking-[0.2em] mb-4">Platform Wallet</p>
                    <h3 className="text-4xl font-black tracking-tighter mb-2">₹{stats?.walletBalance?.toLocaleString()}</h3>
                    <span className="text-[10px] font-bold text-[#0A192F]/40 uppercase tracking-widest">Available Credits</span>
                </div>

                <div className="bg-white/5 p-8 rounded-[40px] shadow-sm border border-white/5 group">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Average Trip Value</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter mb-2">₹{stats?.avgTripValue?.toLocaleString() || 0}</h3>
                    <div className="flex items-center gap-2 text-[#FFD700] font-bold text-[10px] uppercase">
                        <Activity className="w-4 h-4" />
                        Live Average
                    </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[40px] shadow-sm border border-white/5 group">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Active Promotions</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter mb-2">{stats?.activePromotions || 0}</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Discount Codes</span>
                </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white/5 rounded-[32px] border border-white/5 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-3">
                        <Activity className="w-5 h-5 text-[#FFD700]" />
                        Transaction Ledger
                    </h2>
                    <div className="flex gap-4">
                        <button className="p-2.5 bg-white/5 text-slate-400 rounded-xl hover:text-white transition-all border border-white/10">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Source / Destination</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Tx ID</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Date / Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map(tx => (
                                <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="font-bold text-sm text-white">{tx.userId?.name || "System"}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tx.type} FLOW</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-bold font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                            {tx._id.slice(-8).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className={`font-black ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-white'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${tx.status === 'SUCCESS' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                            <br />
                                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
