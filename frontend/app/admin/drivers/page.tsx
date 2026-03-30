"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    User,
    ShieldCheck,
    AlertCircle,
    Loader2,
    Users,
    Search,
    Eye,
    FileText,
    Car,
    X,
    Check,
    ExternalLink,
    Trash2,
    Ban,
    Unlock,
    AlertTriangle,
    History,
    Edit2,
    Mail,
    Phone,
    Fingerprint,
    CreditCard
} from "lucide-react";
import UserRideHistoryModal from "@/components/admin/UserRideHistoryModal";
import EditUserModal from "@/components/admin/EditUserModal";

interface Driver {
    _id: string;
    name: string;
    email: string;
    status: string;
    role: string;
    profilePhoto?: string;
    license?: string;
    aadhaar?: string;
    isBlocked?: boolean;
    isSuspicious?: boolean;
    reportCount?: number;
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
        try {
            await api.put(`/admin/approve-driver/${vehicleId}`, { status });
            toast.success(`Driver ${status.toLowerCase()} successfully`);
            fetchDrivers();
            setSelectedDriver(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const toggleBlockUser = async (id: string, currentlyBlocked: boolean) => {
        const action = currentlyBlocked ? "unblock" : "block";
        if (!currentlyBlocked && !window.confirm(`Are you sure you want to block this driver?`)) return;
        try {
            await api.put(`/admin/users/block/${id}`);
            toast.success(`Driver ${action}ed successfully`);
            fetchDrivers();
            if (selectedDriver?._id === id) {
                setSelectedDriver(prev => prev ? { ...prev, isBlocked: !currentlyBlocked } : null);
            }
        } catch (error: any) {
            toast.error(`Failed to ${action} driver`);
        }
    };

    const toggleFlagUser = async (id: string, currentlyFlagged: boolean) => {
        const action = currentlyFlagged ? "unflag" : "flag";
        try {
            await api.put(`/admin/users/flag/${id}`);
            toast.success(`Driver ${action}ged successfully`);
            fetchDrivers();
            if (selectedDriver?._id === id) {
                setSelectedDriver(prev => prev ? { ...prev, isSuspicious: !currentlyFlagged } : null);
            }
        } catch (error: any) {
            toast.error(`Failed to ${action} driver`);
        }
    };

    const handleSoftDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this driver?")) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success("Driver deleted successfully");
            fetchDrivers();
            setSelectedDriver(null);
        } catch (error: any) {
            toast.error("Failed to delete driver");
        }
    };

    const [selectedUserIdForHistory, setSelectedUserIdForHistory] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const viewRideHistory = (id: string) => {
        setSelectedUserIdForHistory(id);
        setIsHistoryModalOpen(true);
    };

    const handleEditDriver = (driver: any) => {
        setEditingUser(driver);
        setIsEditModalOpen(true);
    };

    const filteredDrivers = drivers.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.vehicle?.numberPlate.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === "ALL") return matchesSearch;
        if (filter === "PENDING") return matchesSearch && (d.status === "PENDING" || d.status === "AWAITING_APPROVAL");
        return matchesSearch && d.status === filter;
    });

    const getImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http") || path.startsWith("data:")) return path;
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace("/api", "");
        return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] min-h-screen">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-black uppercase tracking-widest italic">Synchronizing Driver Audits...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC]">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#0A192F] tracking-tight italic uppercase">Driver <span className="text-[#FFD700]">Intelligence</span></h1>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1">Review and manage elite driver registrations</p>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? "bg-[#0A192F] text-[#FFD700] shadow-lg shadow-[#0A192F]/10"
                                : "text-slate-400 hover:text-[#0A192F] hover:bg-slate-50"
                                }`}
                        >
                            {f === "PENDING" ? "Auditing" : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Search by name, plate, or email..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-[#0A192F] font-black focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 italic">
                        <Users className="w-4 h-4 text-[#FFD700]" />
                        {filteredDrivers.length} Professional Units
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Driver Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#0A192F] uppercase tracking-widest italic text-center">Audit Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredDrivers.length > 0 ? (
                                filteredDrivers.map(driver => (
                                    <tr key={driver._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[#0A192F] overflow-hidden flex-shrink-0 border border-[#0A192F] shadow-lg shadow-[#0A192F]/5 group-hover:border-[#FFD700] transition-all flex items-center justify-center">
                                                    {driver.profilePhoto ? (
                                                        <img src={getImageUrl(driver.profilePhoto)} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-6 h-6 text-[#FFD700]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black text-[#0A192F] tracking-tight flex items-center gap-1.5 uppercase italic italic-none">
                                                        {driver.name}
                                                        {driver.isBlocked && <Ban className="w-3 h-3 text-rose-500" />}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{driver.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {driver.vehicle ? (
                                                <div className="flex flex-col">
                                                    <p className="text-[#0A192F] font-black text-[13px] tracking-tight">{driver.vehicle.vehicleModel}</p>
                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">{driver.vehicle.numberPlate}</p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase italic opacity-50">No Active Asset</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                driver.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                driver.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    driver.status === 'APPROVED' ? 'bg-emerald-500' :
                                                    driver.status === 'REJECTED' ? 'bg-rose-500' :
                                                    'bg-amber-500'
                                                }`}></span>
                                                {driver.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Verification Quick Actions */}
                                                {(driver.status === 'PENDING' || driver.status === 'AWAITING_APPROVAL') && driver.vehicle && (
                                                    <div className="flex items-center gap-1 mr-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                                        <button
                                                            onClick={() => driver.vehicle && handleAction(driver.vehicle._id, "APPROVED")}
                                                            className="p-2 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border border-transparent hover:border-emerald-200"
                                                            title="Quick Approve"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => driver.vehicle && handleAction(driver.vehicle._id, "REJECTED")}
                                                            className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all border border-transparent hover:border-rose-200"
                                                            title="Quick Reject"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => setSelectedDriver(driver)}
                                                    className="p-2.5 text-slate-300 hover:text-[#0A192F] hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
                                                    title="Review Documents"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditDriver(driver)}
                                                    className="p-2.5 text-slate-300 hover:text-[#0A192F] hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
                                                    title="Edit Unit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => viewRideHistory(driver._id)}
                                                    className="p-2.5 text-slate-300 hover:text-[#0A192F] hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
                                                    title="Audit Logs"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                                <div className="w-px h-5 bg-slate-100 mx-1.5" />
                                                <button
                                                    onClick={() => toggleBlockUser(driver._id, !!driver.isBlocked)}
                                                    className={`p-2.5 rounded-xl transition-all border ${driver.isBlocked ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100'}`}
                                                    title={driver.isBlocked ? "Unblock Unit" : "Block Unit"}
                                                >
                                                    {driver.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleSoftDelete(driver._id)}
                                                    className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                                    title="Decommission Unit"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm italic">
                                        No drivers found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- REVIEW MODAL --- */}
            {selectedDriver && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-md" onClick={() => setSelectedDriver(null)}></div>

                    <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[24px] overflow-hidden border-2 border-slate-50 shadow-inner bg-slate-50">
                                    {selectedDriver.profilePhoto ? (
                                        <img src={getImageUrl(selectedDriver.profilePhoto)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <User className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-[#0A192F] italic uppercase tracking-tight">{selectedDriver.name}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedDriver.email}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                        <span className="text-[#FFD700] uppercase font-black text-[10px] tracking-[0.2em] italic">Identity Audit</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDriver(null)} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-[#0A192F] hover:bg-slate-50 rounded-2xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Left Column: Documents */}
                                <div className="space-y-8">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                        <Fingerprint className="w-5 h-5 text-[#FFD700]" />
                                        Legal Credentials
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 gap-6">
                                        {[
                                            { label: "Driving Authority License", path: selectedDriver.license, icon: <CreditCard className="w-4 h-4" /> },
                                            { label: "National Identity (Aadhaar)", path: selectedDriver.aadhaar, icon: <ShieldCheck className="w-4 h-4" /> }
                                        ].map((doc, i) => (
                                            <div key={i} className="group relative rounded-[32px] overflow-hidden bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center justify-between mb-4 px-2">
                                                    <span className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest flex items-center gap-3 italic">
                                                        <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[#FFD700]">
                                                            {doc.icon}
                                                        </span>
                                                        {doc.label}
                                                    </span>
                                                    {doc.path && (
                                                        <a href={getImageUrl(doc.path)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-slate-50 text-[#0A192F] hover:bg-[#0A192F] hover:text-[#FFD700] rounded-xl transition-all shadow-sm">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="aspect-[4/3] rounded-[24px] bg-slate-100 overflow-hidden relative border border-slate-100 group-hover:border-[#FFD700]/30 transition-all">
                                                    {doc.path ? (
                                                        <img src={getImageUrl(doc.path)} alt={doc.label} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                                            <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
                                                            <span className="text-[10px] uppercase font-black tracking-widest">Document Registry Null</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Column: Vehicle */}
                                <div className="space-y-8">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                        <Car className="w-5 h-5 text-[#FFD700]" />
                                        Unit Specifications
                                    </h3>

                                    <div className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-8 shadow-sm">
                                        {/* Vehicle Photos */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {(() => {
                                                const vehicleObj = selectedDriver.vehicle as any;
                                                const photos = vehicleObj?.vehiclePhotos || 
                                                              vehicleObj?.photos || 
                                                              (vehicleObj?.photo ? [vehicleObj.photo] : 
                                                              (vehicleObj?.vehiclePhoto ? [vehicleObj.vehiclePhoto] : []));
                                                
                                                if (photos && Array.isArray(photos) && photos.length > 0) {
                                                    return photos.map((photo: string, idx: number) => (
                                                        <div key={idx} className="aspect-video rounded-[24px] overflow-hidden border border-slate-100 group relative">
                                                            <img src={getImageUrl(photo)} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                            <div className="absolute inset-0 bg-[#0A192F]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                <a href={getImageUrl(photo)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white text-[#0A192F] flex items-center justify-center rounded-[18px] shadow-2xl hover:scale-110 transition-all">
                                                                    <ExternalLink className="w-5 h-5" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ));
                                                }
                                                return (
                                                    <div className="col-span-2 py-12 flex flex-col items-center justify-center bg-slate-50 rounded-[24px] text-slate-200 border border-dashed border-slate-200">
                                                        <Car className="w-12 h-12 mb-3 opacity-10" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Exterior Images Unavailable</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unit Model</p>
                                                <p className="text-lg font-black text-[#0A192F] tracking-tight uppercase leading-none">
                                                    {selectedDriver.vehicle?.vehicleModel || "N/A"}
                                                </p>
                                                <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest">{selectedDriver.vehicle?.vehicleType || "GENERIC UNIT"}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Registry Number</p>
                                                <span className="bg-[#0A192F] text-[#FFD700] px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-[#0A192F]/10 tracking-widest">
                                                    {selectedDriver.vehicle?.numberPlate || "N/A"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Registry Cryptography (RC)</p>
                                            {selectedDriver.vehicle?.rc ? (
                                                <a href={getImageUrl(selectedDriver.vehicle.rc)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-slate-50 rounded-[24px] hover:bg-slate-100 transition-all border border-slate-100 group shadow-sm">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#FFD700] shadow-sm group-hover:scale-110 transition-transform">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest leading-none mb-1">Registration Proof</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Audit-ready documentation</p>
                                                    </div>
                                                    <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-[#0A192F] transition-colors" />
                                                </a>
                                            ) : (
                                                <div className="text-center py-6 bg-slate-50 rounded-[24px] text-[10px] font-black text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 italic shadow-inner">
                                                    Official RC proof pending upload
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-slate-50 bg-white flex items-center justify-end gap-5">
                            {selectedDriver.vehicle ? (
                                <>
                                    <button
                                        onClick={() => handleAction(selectedDriver.vehicle!._id, "REJECTED")}
                                        className="px-10 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] italic text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100"
                                    >
                                        Decline Intent
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedDriver.vehicle!._id, "APPROVED")}
                                        className="px-10 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] italic text-[#FFD700] bg-[#0A192F] hover:bg-black transition-all shadow-xl shadow-[#0A192F]/10 border border-[#0A192F]"
                                    >
                                        Authorize Driver
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-4 text-rose-600 text-[10px] font-black px-8 py-4 bg-rose-50 rounded-[20px] border border-rose-100 uppercase tracking-widest italic">
                                    <AlertCircle className="w-5 h-5" />
                                    Authorization requires complete asset profile
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <UserRideHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                userId={selectedUserIdForHistory || ""}
            />

            <EditUserModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={editingUser}
                onUpdate={fetchDrivers}
            />
        </div>
    );
}
