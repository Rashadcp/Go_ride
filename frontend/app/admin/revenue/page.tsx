"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Filter,
    Download,
    Loader2,
    Activity,
    CreditCard,
    Search,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
    _id: string;
    userId: { name: string, email: string };
    amount: number;
    type: "CREDIT" | "DEBIT";
    status: "SUCCESS" | "PENDING" | "FAILED";
    method?: "ONLINE" | "WALLET" | "CASH";
    description?: string;
    createdAt: string;
}

export default function AdminRevenuePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [filters, setFilters] = useState({
        search: "",
        type: "CREDIT",
        status: "ALL",
        method: "ALL",
        dateFrom: "",
        dateTo: "",
        page: 1,
        limit: 12
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalTransactions: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== "" && value !== "ALL") {
                    params.set(key, String(value));
                }
            });

            const [txRes, statsRes] = await Promise.all([
                api.get(`/admin/transactions?${params.toString()}`),
                api.get("/admin/stats")
            ]);

            if (txRes.data && txRes.data.transactions) {
                setTransactions(txRes.data.transactions);
                setPagination({
                    currentPage: txRes.data.currentPage || 1,
                    totalPages: txRes.data.totalPages || 1,
                    totalTransactions: txRes.data.totalTransactions || txRes.data.transactions.length
                });
            }
            setStats(statsRes.data.stats);
        } catch (error: any) {
            toast.error("Failed to load financial data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const updateFilter = (key: keyof typeof filters, value: string | number) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            ...(key !== "page" ? { page: 1 } : {})
        }));
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(22);
        doc.setTextColor(10, 25, 47); // Navy color from your design
        doc.text("GoRide - Revenue Ledger", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = transactions.map(tx => [
            tx.userId?.name || "System Core",
            tx.userId?.email || "N/A",
            tx.type,
            `INR ${tx.amount.toLocaleString()}`,
            tx.status,
            new Date(tx.createdAt).toLocaleDateString(),
            new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Actor', 'Email', 'Type', 'Amount', 'Status', 'Date', 'Time']],
            body: tableData,
            headStyles: { 
                fillColor: [10, 25, 47], 
                textColor: [251, 191, 36], // Gold color from your design 
                fontStyle: 'bold' 
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 35 },
        });

        // Open print dialog instead of direct save
        doc.autoPrint();
        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
        toast.success("Print ledger prepared");
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-black uppercase tracking-widest italic">Loading payments...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-[#0A192F] tracking-tight italic uppercase">Money & <span className="text-[#FFD700]">Earnings</span></h1>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1">Track your income and growth in real-time</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-[#0A192F] text-[#FFD700] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#0A192F]/10 hover:bg-black transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Download Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-20 h-20 text-[#0A192F]" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Earned</p>
                    <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">₹{stats?.totalRevenue?.toLocaleString()}</h3>
                    <div className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${stats?.revenueTrend >= 0 ? "text-[#22C55E]" : "text-rose-500"}`}>
                        {stats?.revenueTrend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {stats?.revenueTrend >= 0 ? '+' : ''}{stats?.revenueTrend}% Growth
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Payments</p>
                    <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">{stats?.totalTransactions?.toLocaleString() || 0}</h3>
                    <div className="flex items-center gap-2 text-[#22C55E] font-black text-[10px] uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Verified
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Average Trip Price</p>
                    <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">₹{stats?.avgTripValue?.toLocaleString() || 0}</h3>
                    <div className="flex items-center gap-2 text-[#FFD700] font-black text-[10px] uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Live Data
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Coupons Used</p>
                    <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">{stats?.activePromotions || 0}</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Discounts applied</span>
                </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="space-y-6 border-b border-slate-50 p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <h2 className="font-black text-[#0A192F] uppercase tracking-widest text-[11px] flex items-center gap-3 italic">
                            <Activity className="w-5 h-5 text-[#FFD700]" />
                            Payment History
                        </h2>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            <Filter className="w-4 h-4 text-[#FFD700]" />
                            {pagination.totalTransactions} Records
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.7fr))]">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => updateFilter("search", e.target.value)}
                                placeholder="Search by name, email, or description..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-[#0A192F] outline-none transition-all focus:border-[#FFD700] focus:ring-2 ring-[#FFD700]/10"
                            />
                        </div>

                        <select
                            value={filters.type}
                            onChange={(e) => updateFilter("type", e.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[11px] font-black uppercase tracking-widest text-[#0A192F] outline-none"
                        >
                            <option value="CREDIT">Credits</option>
                            <option value="DEBIT">Debits</option>
                            <option value="ALL">All Types</option>
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => updateFilter("status", e.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[11px] font-black uppercase tracking-widest text-[#0A192F] outline-none"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="SUCCESS">Success</option>
                            <option value="PENDING">Pending</option>
                            <option value="FAILED">Failed</option>
                        </select>

                        <select
                            value={filters.method}
                            onChange={(e) => updateFilter("method", e.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[11px] font-black uppercase tracking-widest text-[#0A192F] outline-none"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="ONLINE">Online</option>
                            <option value="WALLET">Wallet</option>
                            <option value="CASH">Cash</option>
                        </select>

                        <label className="relative block">
                            <Calendar className="pointer-events-none absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-[#FFD700]" />
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-[11px] font-black uppercase tracking-widest text-[#0A192F] outline-none calendar-input"
                            />
                        </label>

                        <label className="relative block">
                            <Calendar className="pointer-events-none absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-[#FFD700]" />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter("dateTo", e.target.value)}
                                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-[11px] font-black uppercase tracking-widest text-[#0A192F] outline-none calendar-input"
                            />
                        </label>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Who Paid</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ID</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#0A192F] uppercase tracking-widest italic">Impact</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.map(tx => (
                                <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#0A192F] flex items-center justify-center text-[#FFD700] font-black text-[12px] border border-[#0A192F] shadow-lg shadow-[#0A192F]/5 group-hover:border-[#FFD700] transition-all">
                                                {tx.userId?.name?.charAt(0) || "S"}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-[#0A192F] tracking-tight">{tx.userId?.name || "System"}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{tx.method || tx.type} RECORD</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            {tx._id.slice(-10).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className={`font-black text-sm ${tx.type === 'CREDIT' ? 'text-[#22C55E]' : 'text-[#0A192F]'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            tx.status === 'SUCCESS' 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                            : 'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <p className="text-[11px] font-black text-[#0A192F] uppercase tracking-tighter italic">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => updateFilter("page", Math.max(1, filters.page - 1))}
                            disabled={pagination.currentPage <= 1}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Prev
                        </button>
                        <button
                            onClick={() => updateFilter("page", Math.min(pagination.totalPages || 1, filters.page + 1))}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .calendar-input::-webkit-calendar-picker-indicator {
                    opacity: 1;
                    cursor: pointer;
                    filter: invert(14%) sepia(19%) saturate(1171%) hue-rotate(175deg) brightness(93%) contrast(99%);
                }
            `}</style>
        </div>
    );
}
