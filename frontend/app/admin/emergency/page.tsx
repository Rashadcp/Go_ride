"use client";

import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { socket, connectSocket } from "@/lib/socket";
import {
    AlertTriangle, Shield, CheckCircle2, Clock, User, MapPin,
    MessageSquare, Loader2, Car, Bell, Filter, X, ChevronRight,
    Siren, Fingerprint, Banknote, HelpCircle
} from "lucide-react";

interface Report {
    _id: string;
    reporterId: { name: string; email: string; phone?: string } | string;
    rideId?: string;
    type: "ACCIDENT" | "HARASSMENT" | "THEFT" | "OTHER";
    description: string;
    status: "PENDING" | "INVESTIGATING" | "RESOLVED";
    location?: { address?: string; latitude?: number; longitude?: number };
    createdAt: string;
    resolutionNotes?: string;
    driverName?: string;
    driverId?: string;
}

const TYPE_CONFIG = {
    ACCIDENT:   { label: "Accident",   emoji: "⚠️",  color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", border: "border-orange-400" },
    HARASSMENT: { label: "Harassment", emoji: "😡",  color: "bg-rose-100 text-rose-700 border-rose-200",       dot: "bg-rose-500",    border: "border-rose-500"   },
    THEFT:      { label: "Theft",      emoji: "🚨",  color: "bg-red-100 text-red-700 border-red-200",           dot: "bg-red-600",     border: "border-red-600"    },
    OTHER:      { label: "Other",      emoji: "📋",  color: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400",   border: "border-slate-400"  },
};

const STATUS_CONFIG = {
    PENDING:      { label: "Pending",      color: "bg-rose-500/10 text-rose-400 border-rose-500/20"    },
    INVESTIGATING:{ label: "Investigating",color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    RESOLVED:     { label: "Resolved",     color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

export default function EmergencyReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [resNotes, setResNotes] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "INVESTIGATING" | "RESOLVED">("ALL");
    const [liveAlertCount, setLiveAlertCount] = useState(0);
    const alertSound = useRef<boolean>(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/emergency-reports");
            setReports(response.data || []);
        } catch {
            toast.error("Failed to load emergency reports");
        } finally {
            setLoading(false);
        }
    };

    // Real-time socket listener for live alerts
    useEffect(() => {
        fetchReports();
        connectSocket();

        const handleLiveAlert = (newReport: Report) => {
            setReports(prev => {
                const exists = prev.some(r => r._id === newReport._id);
                if (exists) return prev;
                return [newReport, ...prev];
            });
            setLiveAlertCount(c => c + 1);
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-rose-600 shadow-2xl rounded-2xl pointer-events-auto flex overflow-hidden`}>
                    <div className="flex-1 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                <Siren className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-widest">🚨 New Emergency Report</p>
                                <p className="text-rose-200 text-[11px] font-bold mt-0.5">
                                    {TYPE_CONFIG[newReport.type]?.label} — {typeof newReport.reporterId === "object" ? newReport.reporterId?.name : "A user"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => toast.dismiss(t.id)} className="p-3 text-white/60 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ), { duration: 8000 });
        };

        socket.on("admin:emergency:alert", handleLiveAlert);
        return () => { socket.off("admin:emergency:alert", handleLiveAlert); };
    }, []);

    const handleUpdateStatus = async (id: string, status: string) => {
        if (status === "RESOLVED" && !resNotes) return toast.error("Please add resolution notes");
        try {
            await api.put(`/admin/emergency-reports/${id}`, { status, resolutionNotes: resNotes || undefined });
            toast.success(`Report marked as ${status}`);
            setReports(prev => prev.map(r => r._id === id ? { ...r, status: status as any, resolutionNotes: resNotes } : r));
            setSelectedReport(null);
            setResNotes("");
        } catch {
            toast.error("Failed to update report");
        }
    };

    const filtered = filterStatus === "ALL" ? reports : reports.filter(r => r.status === filterStatus);
    const pendingCount = reports.filter(r => r.status === "PENDING").length;

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#0A192F]">
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                <p className="text-white font-bold text-sm">Loading incident reports...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-[#0A192F]">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-rose-500 rounded-[20px] flex items-center justify-center shadow-xl shadow-rose-500/30">
                        <Siren className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            Safety <span className="text-rose-400">Reports</span>
                        </h1>
                        <p className="text-slate-400 font-medium text-sm mt-1">
                            Real-time passenger incident monitoring
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live status badge */}
                    <div className="flex items-center gap-2 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-rose-400 font-black text-xs uppercase tracking-widest">Live Monitoring</span>
                    </div>

                    {/* Pending badge */}
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                            <Bell className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400 font-black text-xs">{pendingCount} Pending</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Reports", value: reports.length, color: "text-white" },
                    { label: "Pending Action", value: reports.filter(r=>r.status==="PENDING").length, color: "text-rose-400" },
                    { label: "Investigating", value: reports.filter(r=>r.status==="INVESTIGATING").length, color: "text-amber-400" },
                    { label: "Resolved", value: reports.filter(r=>r.status==="RESOLVED").length, color: "text-emerald-400" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-[20px] p-5 border border-white/10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {(["ALL", "PENDING", "INVESTIGATING", "RESOLVED"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilterStatus(f)}
                        className={`px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all border ${
                            filterStatus === f
                                ? "bg-[#FFD700] text-[#0A192F] border-[#FFD700] shadow-lg"
                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                        }`}
                    >
                        {f === "ALL" ? `All (${reports.length})` : f}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Reports List */}
                <div className="lg:col-span-2 space-y-4">
                    {filtered.length === 0 ? (
                        <div className="bg-white/5 rounded-[32px] p-16 text-center border border-white/5 flex flex-col items-center gap-4">
                            <Shield className="w-16 h-16 text-slate-600" />
                            <h3 className="text-xl font-black text-white">No Reports Found</h3>
                            <p className="text-slate-500 font-medium text-sm">All clear — no incidents in this category.</p>
                        </div>
                    ) : (
                        filtered.map(report => {
                            const typeCfg = TYPE_CONFIG[report.type] || TYPE_CONFIG.OTHER;
                            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING;
                            const reporterName = typeof report.reporterId === "object" ? report.reporterId?.name : "Unknown User";
                            const reporterEmail = typeof report.reporterId === "object" ? report.reporterId?.email : "";

                            return (
                                <div
                                    key={report._id}
                                    className={`bg-white/5 rounded-[24px] p-6 border-l-4 border border-white/5 transition-all hover:bg-white/[0.07] ${typeCfg.border}`}
                                >
                                    {/* Top Row */}
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-lg">
                                                {typeCfg.emoji}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-white text-sm leading-none">{reporterName}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{reporterEmail}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${typeCfg.color}`}>
                                                {typeCfg.label}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusCfg.color}`}>
                                                {report.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-slate-300 font-medium text-sm leading-relaxed bg-black/20 p-4 rounded-2xl italic mb-4">
                                        "{report.description}"
                                    </p>

                                    {/* Meta Row */}
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-slate-600" />
                                                {new Date(report.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                            </div>
                                            {report.driverName && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg">
                                                    <Car className="w-3 h-3 text-[#FFD700]" />
                                                    <span className="text-slate-400">{report.driverName}</span>
                                                </div>
                                            )}
                                            {report.location?.address && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3 text-[#FFD700]" />
                                                    <span>{report.location.address}</span>
                                                </div>
                                            )}
                                        </div>

                                        {report.status !== "RESOLVED" && (
                                            <button
                                                onClick={() => setSelectedReport(report)}
                                                className="px-5 py-2.5 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-1.5 shadow-lg shadow-[#FFD700]/10"
                                            >
                                                Take Action
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                        {report.status === "RESOLVED" && report.resolutionNotes && (
                                            <p className="text-[10px] text-emerald-400 font-bold italic truncate max-w-[200px]">
                                                ✓ {report.resolutionNotes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    
                    {/* Incident Types Summary */}
                    <div className="bg-white/5 rounded-[24px] p-6 border border-white/10">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">By Incident Type</h3>
                        <div className="space-y-3">
                            {(["HARASSMENT", "ACCIDENT", "THEFT", "OTHER"] as const).map(type => {
                                const count = reports.filter(r => r.type === type).length;
                                const cfg = TYPE_CONFIG[type];
                                return (
                                    <div key={type} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{cfg.emoji}</span>
                                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">{cfg.label}</span>
                                        </div>
                                        <span className="font-black text-white text-sm">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Panel */}
                    {selectedReport && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-6 border border-white/10 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-[#FFD700]" />
                                    Take Action
                                </h3>
                                <button onClick={() => setSelectedReport(null)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            
                            {/* Report Summary */}
                            <div className="p-3 bg-black/20 rounded-xl mb-4 flex items-center gap-3">
                                <span className="text-lg">{TYPE_CONFIG[selectedReport.type]?.emoji}</span>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {TYPE_CONFIG[selectedReport.type]?.label} — {typeof selectedReport.reporterId === "object" ? selectedReport.reporterId?.name : "User"}
                                    </p>
                                    {selectedReport.driverName && (
                                        <p className="text-[11px] text-[#FFD700] font-bold">
                                            Driver: {selectedReport.driverName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Status Update Buttons */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => handleUpdateStatus(selectedReport._id, "INVESTIGATING")}
                                    className="flex-1 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                                >
                                    Investigate
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(selectedReport._id, "RESOLVED")}
                                    className="flex-1 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                >
                                    Resolve
                                </button>
                            </div>

                            <textarea
                                value={resNotes}
                                onChange={e => setResNotes(e.target.value)}
                                placeholder="Add resolution notes (required to resolve)..."
                                className="w-full h-28 p-4 bg-[#0A192F] border border-white/10 rounded-xl text-xs font-medium text-white focus:ring-1 ring-[#FFD700]/20 outline-none resize-none mb-4 placeholder:text-slate-600"
                            />
                            
                            <button
                                onClick={() => handleUpdateStatus(selectedReport._id, "RESOLVED")}
                                disabled={!resNotes.trim()}
                                className="w-full py-4 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-[11px] uppercase tracking-widest transition-all hover:bg-yellow-400 disabled:opacity-30"
                            >
                                Mark as Resolved
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
