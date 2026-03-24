"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    ShieldCheck,
    AlertCircle,
    Loader2,
    Users,
    Search,
    ChevronRight,
    Eye,
    FileText,
    Image as ImageIcon,
    Car,
    X,
    Check,
    ExternalLink,
    Trash2
} from "lucide-react";

interface Driver {
    _id: string;
    name: string;
    email: string;
    status: string;
    role: string;
    profilePhoto?: string;
    license?: string;
    aadhaar?: string;
    vehicle?: {
        _id: string;
        numberPlate: string;
        vehicleModel: string;
        vehicleType: string;
        rc: string;
        vehiclePhotos: string[];
        status: string;
    };
}

export default function DriverVerificationPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/drivers");
            setDrivers(response.data);
        } catch (error: any) {
            toast.error("Failed to fetch drivers list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleAction = async (vehicleId: string, status: "APPROVED" | "REJECTED") => {
        console.warn(`🛡️ Audit Decision: ${status} for Vehicle ID: ${vehicleId}`); 
        try {
            const response = await api.put(`/admin/approve-driver/${vehicleId}`, { status });
            console.log("✅ Audit Success:", response.data);
            toast.success(`Driver ${status.toLowerCase()} successfully`);
            fetchDrivers(); 
            setSelectedDriver(null);
        } catch (error: any) {
            console.error("❌ Audit Failure:", error);
            toast.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to completely delete this driver? This action cannot be undone.")) return;

        try {
            await api.delete(`/admin/driver/${id}`);
            toast.success("Driver deleted successfully");
            fetchDrivers();
            setSelectedDriver(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete driver");
        }
    };

    const filteredDrivers = drivers.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.vehicle?.numberPlate.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === "ALL") return matchesSearch;
        if (filter === "PENDING") return matchesSearch && (d.status === "PENDING" || d.status === "AWAITING_APPROVAL");
        return matchesSearch && d.status === filter;
    });

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-bg-main transition-colors duration-500">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] dark:text-slate-400 font-medium font-bold">Loading Verification Portal...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#0A192F] transition-colors duration-500 min-h-screen">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white transition-colors tracking-tight italic uppercase">Go<span className="text-[#FFD700]">Ride</span> Drivers</h1>
                    <p className="text-slate-400 font-medium mt-1">Manage and audit vehicle operator applications</p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl shadow-sm border border-white/5">
                    {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${filter === f
                                ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {f === "PENDING" ? "Reviewing" : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main List Table Area */}
            <div className="bg-white/5 rounded-[32px] border border-white/5 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name, email or plate..."
                            className="w-full pl-11 pr-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-2 bg-white/5 rounded-xl border border-white/10 shadow-sm transition-all">
                            <Users className="w-3 h-3" />
                            {filteredDrivers.length} Candidates Found
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Operator Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Vehicle Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest text-center">Current Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest text-right">Rapid Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredDrivers.length > 0 ? (
                                filteredDrivers.map(driver => (
                                    <tr key={driver._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div
                                                className="flex items-center gap-4 cursor-pointer"
                                                onClick={() => setSelectedDriver(driver)}
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/5 group-hover:border-[#FFD700]/50 transition-all">
                                                    {driver.profilePhoto ? (
                                                        <img src={driver.profilePhoto} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                            <User className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-[#FFD700] transition-colors">{driver.name}</p>
                                                    <p className="text-xs text-slate-400 font-medium">{driver.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {driver.vehicle ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/5 rounded-lg text-slate-500 border border-white/5">
                                                        <Car className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{driver.vehicle.vehicleModel} <span className="text-[#FFD700] ml-1 opacity-70">({driver.vehicle.vehicleType})</span></p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase bg-white/5 px-2 py-0.5 rounded-md w-fit mt-1 border border-white/5">{driver.vehicle.numberPlate}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-slate-500">No vehicle data</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${driver.status === 'APPROVED' ? 'bg-emerald-400/10 text-emerald-400' :
                                                driver.status === 'REJECTED' ? 'bg-rose-400/10 text-rose-400' :
                                                    'bg-amber-400/10 text-amber-400'
                                                }`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {driver.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Delete Button (Permanent removal) */}
                                                <button
                                                    onClick={() => handleDelete(driver._id)}
                                                    title="Completely delete this driver"
                                                    className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all mr-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                {/* Action Buttons for Pending/Rejected */}
                                                {(driver.status === 'PENDING' || driver.status === 'AWAITING_APPROVAL' || driver.status === 'REJECTED') && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => driver.vehicle && handleAction(driver.vehicle._id, "REJECTED")}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${driver.status === 'REJECTED'
                                                                ? "bg-rose-100 text-rose-300 cursor-not-allowed opacity-50"
                                                                : "bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white shadow-sm"
                                                                }`}
                                                            disabled={driver.status === 'REJECTED' || !driver.vehicle}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => driver.vehicle && handleAction(driver.vehicle._id, "APPROVED")}
                                                            disabled={!driver.vehicle}
                                                            title={!driver.vehicle ? "Vehicle information required for approval" : "Approve this driver"}
                                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg ${!driver.vehicle
                                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                                                                }`}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            Approve
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Primary Review Button */}
                                                <button
                                                    onClick={() => setSelectedDriver(driver)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-[#0A192F] rounded-xl hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest border border-slate-100"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Review
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <Users className="w-12 h-12 opacity-10" />
                                            <p className="text-sm font-bold opacity-30">No drivers in this queue</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- IDENTITY MODAL --- */}
            {selectedDriver && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                    <div
                        className="absolute inset-0 bg-[#0A192F]/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedDriver(null)}
                    ></div>

                    <div className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[28px] overflow-hidden border-4 border-slate-50 shadow-xl relative">
                                    {selectedDriver.profilePhoto ? (
                                        <img src={selectedDriver.profilePhoto} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#0A192F] flex items-center justify-center text-[#FFD700]">
                                            <User className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-[#0A192F] tracking-tight">{selectedDriver.name}</h2>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-xs font-bold text-slate-400">{selectedDriver.email}</span>
                                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">Audit in Progress</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedDriver(null)}
                                className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-[#0A192F] transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* KYC Column */}
                                <section>
                                    <h3 className="text-[11px] font-black text-[#0A192F] uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-[#FFD700] rounded-full shadow-glow"></div>
                                        Identification Dossier
                                    </h3>
                                    <div className="space-y-6">
                                        {[
                                            { label: "Operating License", path: selectedDriver.license },
                                            { label: "Identity Document (Aadhaar)", path: selectedDriver.aadhaar }
                                        ].map((doc, i) => (
                                            <div key={i} className="group relative aspect-video rounded-[32px] overflow-hidden bg-white border border-slate-100 shadow-sm">
                                                {doc.path ? (
                                                    <>
                                                        <img src={doc.path} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                            <a href={doc.path} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-[#FFD700] text-[#0A192F] font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform">
                                                                <ExternalLink className="w-4 h-4" />
                                                                Expand Verification
                                                            </a>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                                                        <AlertCircle className="w-8 h-8 opacity-20" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Document Not Provided</p>
                                                    </div>
                                                )}
                                                <div className="absolute top-6 left-6">
                                                    <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black text-[#0A192F] border border-black/5 shadow-lg uppercase tracking-wider">
                                                        {doc.label}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Vehicle Column */}
                                <section>
                                    <h3 className="text-[11px] font-black text-[#0A192F] uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-[#FFD700] rounded-full shadow-glow"></div>
                                        Machine Assets
                                    </h3>
                                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                                        <div className="relative z-10 flex flex-col gap-8">
                                            <div className="w-full grid grid-cols-2 gap-4">
                                                {selectedDriver.vehicle?.vehiclePhotos && selectedDriver.vehicle.vehiclePhotos.length > 0 ? (
                                                    selectedDriver.vehicle.vehiclePhotos.map((photo, idx) => (
                                                        <div key={idx} className="aspect-video rounded-2xl overflow-hidden shadow-xl border-4 border-slate-50 hover:border-[#FFD700]/30 transition-all cursor-zoom-in">
                                                            <img src={photo} alt={`Vehicle ${idx + 1}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 aspect-video rounded-2xl bg-[#0A192F] flex items-center justify-center text-[#FFD700]">
                                                        <Car className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fleet Model & Type</p>
                                                    <p className="text-xl font-black text-[#0A192F]">{selectedDriver.vehicle?.vehicleModel || "Unknown"} <span className="text-slate-400 text-sm">({selectedDriver.vehicle?.vehicleType || "N/A"})</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">License ID</p>
                                                    <span className="inline-block px-4 py-1.5 bg-[#FFD700] text-[#0A192F] font-black text-xs rounded-lg shadow-sm border border-white/20">
                                                        {selectedDriver.vehicle?.numberPlate || "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Registration Dossier (RC)</p>
                                                {selectedDriver.vehicle?.rc ? (
                                                    <a href={selectedDriver.vehicle.rc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#0A192F] bg-slate-50 w-full p-4 rounded-2xl text-[10px] font-black hover:bg-[#FFD700] transition-all border border-slate-100 shadow-sm group/rc">
                                                        <div className="p-2 bg-white rounded-xl shadow-sm group-hover/rc:bg-[#0A192F] group-hover/rc:text-[#FFD700] transition-all">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="uppercase tracking-widest">Verify RC Document</p>
                                                            <p className="text-[9px] text-slate-400 font-bold group-hover:text-[#0A192F]">Click to open secure PDF viewer</p>
                                                        </div>
                                                        <ExternalLink className="w-5 h-5 opacity-20" />
                                                    </a>
                                                ) : (
                                                    <p className="text-xs italic text-slate-400 py-4 bg-slate-50/50 rounded-2xl text-center border border-dashed border-slate-200">Registration Proof Missing</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-8 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex items-center justify-end gap-4">
                            {selectedDriver.vehicle ? (
                                <>
                                    <button
                                        onClick={() => handleAction(selectedDriver.vehicle!._id, "REJECTED")}
                                        disabled={selectedDriver.status === 'REJECTED'}
                                        className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] border transition-all ${selectedDriver.status === 'REJECTED'
                                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                                            }`}
                                    >
                                        Reject Operator
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedDriver.vehicle!._id, "APPROVED")}
                                        disabled={selectedDriver.status === 'APPROVED'}
                                        className={`px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all ${selectedDriver.status === 'APPROVED'
                                            ? "bg-emerald-50 text-emerald-300 cursor-not-allowed"
                                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/40 hover:-translate-y-1 active:translate-y-0"
                                            }`}
                                    >
                                        Authorize to Drive
                                    </button>
                                </>
                            ) : (
                                <p className="text-xs font-bold text-rose-500 bg-rose-50 px-6 py-3 rounded-2xl border border-rose-100 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Approval requires vehicle on-boarding
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
