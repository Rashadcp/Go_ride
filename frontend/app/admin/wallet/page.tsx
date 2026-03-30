"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    Wallet,
    Download,
    Plus,
    Minus,
    Loader2,
    Search,
    History,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft
} from "lucide-react";

interface Transaction {
    _id: string;
    userId: { name: string, email: string };
    amount: number;
    type: string;
    method?: string;
    status: string;
    createdAt: string;
}

export default function AdminWalletPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const txLimit = 10;

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const [txRes, statsRes] = await Promise.all([
                api.get(`/admin/transactions?page=${page}&limit=${txLimit}`),
                api.get("/admin/stats")
            ]);
            setTransactions(txRes.data.transactions);
            setTotalPages(txRes.data.totalPages);
            setTotalTransactions(txRes.data.totalTransactions);
            setCurrentPage(txRes.data.currentPage);
            setStats(statsRes.data.stats);
        } catch (error: any) {
            toast.error("Failed to load wallet data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage);
    }, [currentPage]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-bg-main">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-bold">Initializing Secure Wallet Access...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto flex flex-col bg-[#0A192F] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Platform <span className="text-[#FFD700]">Wallet</span></h1>
                    <p className="text-slate-400 font-medium mt-1">Manage global balances and transaction security</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">
                    <Download className="w-4 h-4" />
                    Download Registry
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <div className="lg:col-span-2 bg-white/5 p-10 rounded-[48px] shadow-2xl relative overflow-hidden text-white border border-white/5 group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/5 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <p className="text-[#FFD700] font-black uppercase tracking-[0.4em] text-[10px] mb-6">Total Custodial Balance</p>
                        <h2 className="text-7xl font-black mb-10 tracking-tighter">₹{stats?.walletBalance?.toLocaleString()}</h2>
                        <div className="flex items-center gap-10">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Monthly Credits</p>
                                <div className="flex items-center gap-2 text-emerald-400 font-black text-xl">
                                    <ArrowUpRight className="w-5 h-5" />
                                    ₹{stats?.monthlyCredits?.toLocaleString()}
                                </div>
                            </div>
                            <div className="w-px h-12 bg-white/10"></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Monthly Debits</p>
                                <div className="flex items-center gap-2 text-rose-400 font-black text-xl">
                                    <ArrowDownLeft className="w-5 h-5" />
                                    ₹{stats?.monthlyDebits?.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 p-10 rounded-[48px] border border-white/10 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="w-14 h-14 bg-[#FFD700]/10 text-[#FFD700] rounded-2xl flex items-center justify-center mb-6 border border-[#FFD700]/20">
                            <CreditCard className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">Active Accounts</h3>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed">System is currently managing {stats?.totalUsers + stats?.totalDrivers} active user wallets across the network.</p>
                    </div>
                    <button className="w-full py-4 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-[#FFD700]/10 hover:-translate-y-1 transition-all mt-8">
                        View Account Heatmap
                    </button>
                </div>
            </div>

            <div className="bg-white/5 rounded-[40px] border border-white/5 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[600px] mb-8">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-black text-white text-[11px] uppercase tracking-[0.2em] flex items-center gap-3">
                        <History className="w-4 h-4 text-[#FFD700]" />
                        Platform Activity History
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Find hash..."
                            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white focus:ring-1 ring-[#FFD700]/20 transition-all outline-none"
                        />
                    </div>
                </div>
                
                <div className="divide-y divide-white/5 overflow-y-auto flex-1 custom-scrollbar">
                    {(() => {
                        const walletTxs = transactions.filter(tx => tx.type === 'CREDIT' || (tx.type === 'DEBIT' && tx.method === 'WALLET'));
                        return walletTxs.length > 0 ? (
                            walletTxs.map(tx => (
                            <div key={tx._id} className="p-6 hover:bg-white/5 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.type === 'CREDIT' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/5 text-[#FFD700] border border-white/5'}`}>
                                        {tx.type === 'CREDIT' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-white mb-0.5">
                                            {tx.type === 'CREDIT' ? 'Wallet Credit' : 'Wallet Debit'} 
                                            <span className="text-slate-500 font-bold ml-3 text-[10px] uppercase tracking-widest">— {tx.userId?.name || "System"}</span>
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD700] bg-white/5 border border-[#FFD700]/20 px-2 py-0.5 rounded-md">#{tx._id.slice(-6)}</span>
                                            <span className="text-[10px] font-bold text-slate-500">{new Date(tx.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-black mb-1 ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-white'}`}>
                                        {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                    </p>
                                    <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/10">{tx.status}</span>
                                </div>
                            </div>
                            ))
                        ) : (
                            <div className="p-20 text-center">
                                <p className="text-slate-500 font-bold italic">No wallet-specific transactions found matching your records.</p>
                            </div>
                        );
                    })()}
                </div>

                {/* Modern Pagination Bar */}
                {totalPages > 1 && (
                    <div className="p-6 bg-[#0B1E2D]/50 border-t border-white/5 flex items-center justify-between shrink-0">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Showing <span className="text-white">{(currentPage - 1) * txLimit + 1}</span> to <span className="text-white">{Math.min(currentPage * txLimit, totalTransactions)}</span> of <span className="text-white">{totalTransactions}</span> txs
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/5"
                            >
                                Prev
                            </button>
                            <div className="flex items-center gap-1.5 mx-2">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/10' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/5"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
