"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    AlertTriangle,
    Shield,
    CheckCircle,
    Clock,
    User,
    MapPin,
    MessageSquare,
    Loader2,
    Filter,
    Search,
    ChevronRight,
    ExternalLink
} from "lucide-react";

interface Report {
    _id: string;
    reporterId: { name: string, email: string };
    type: string;
    description: string;
    status: string;
    location?: { address: string };
    createdAt: string;
    resolutionNotes?: string;
}

export default function EmergencyReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [resNotes, setResNotes] = useState("");

    const fetchReports = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/emergency-reports");
            setReports(response.data);
        } catch (error: any) {
            toast.error("Failed to load emergency reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleResolve = async (id: string) => {
        if (!resNotes) return toast.error("Please add resolution notes");
        try {
            await api.put(`/admin/emergency-reports/${id}`, {
                status: "RESOLVED",
                resolutionNotes: resNotes
            });
            toast.success("Security incident resolved");
            fetchReports();
            setSelectedReport(null);
            setResNotes("");
        } catch (error: any) {
            toast.error("Failed to update report");
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#0A192F]">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-white font-bold">Accessing Secure Incident Logs...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#0A192F] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-500 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-rose-500/20">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Security <span className="text-rose-500">Response</span> Center</h1>
                        <p className="text-slate-400 font-medium mt-1">Real-time emergency monitoring and incident resolution</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-rose-500 font-black text-xs uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Live Dispatch Connection
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                    {reports.length === 0 ? (
                        <div className="bg-white/5 rounded-[40px] p-20 text-center border border-white/5 flex flex-col items-center">
                            <Shield className="w-16 h-16 text-emerald-400 mb-6 opacity-20" />
                            <h3 className="text-xl font-black text-white mb-1">No Active Threats</h3>
                            <p className="text-sm font-bold text-slate-500">All registered incidents have been cleared.</p>
                        </div>
                    ) : (
                        reports.map(report => (
                            <div key={report._id} className={`bg-white/5 rounded-[32px] p-8 border-l-8 shadow-sm transition-all hover:bg-white/[0.07] ${report.status === 'PENDING' ? 'border-rose-500' : 'border-emerald-400'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/5">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white leading-none mb-1">{report.reporterId?.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(report.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${report.status === 'PENDING' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-400/10 text-emerald-400'}`}>
                                        {report.status}
                                    </span>
                                </div>

                                <div className="mb-8">
                                    <h4 className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.2em] mb-2">{report.type} REPORT</h4>
                                    <p className="text-slate-300 font-medium leading-relaxed bg-[#0A192F] p-6 rounded-2xl border border-white/5 italic">
                                        "{report.description}"
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <MapPin className="w-4 h-4 text-[#FFD700]" />
                                        {report.location?.address || "Location Tracking active"}
                                    </div>
                                    {report.status === 'PENDING' && (
                                        <button 
                                            onClick={() => setSelectedReport(report)}
                                            className="px-6 py-3 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#FFD700]/10 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            Take Action
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-8">
                    <div className="bg-white/5 rounded-[48px] p-10 text-white relative overflow-hidden border border-white/10">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Shield className="w-32 h-32" />
                        </div>
                        <h3 className="text-2xl font-black mb-6 tracking-tight relative z-10">Security <br />Heatmap</h3>
                        <div className="space-y-4 relative z-10">
                            {[
                                { label: "Response Time", val: "4.2m", color: "text-emerald-400" },
                                { label: "Resolution Rate", val: "98.5%", color: "text-[#FFD700]" },
                                { label: "Active Escalations", val: "0", color: "text-rose-400" }
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                    <span className={`text-sm font-black ${stat.color}`}>{stat.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedReport && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-[40px] p-8 border border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-[#FFD700]" />
                                Resolution Notes
                            </h3>
                            <textarea
                                value={resNotes}
                                onChange={(e) => setResNotes(e.target.value)}
                                placeholder="Describe the measures taken..."
                                className="w-full h-40 p-5 bg-[#0A192F] border border-white/10 rounded-[28px] text-sm font-medium text-white focus:ring-2 ring-[#FFD700]/10 outline-none transition-all resize-none mb-6"
                            />
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setSelectedReport(null)}
                                    className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleResolve(selectedReport._id)}
                                    className="flex-[2] py-4 bg-[#FFD700] text-[#0A192F] rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#FFD700]/10 hover:scale-105 transition-all"
                                >
                                    Mark as Resolved
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
