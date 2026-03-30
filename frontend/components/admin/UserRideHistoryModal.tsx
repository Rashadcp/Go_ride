"use client";

import React, { useEffect, useState } from "react";
import { 
    X, 
    Calendar, 
    MapPin, 
    Navigation, 
    Circle, 
    User as UserIcon, 
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    ArrowRight
} from "lucide-react";
import api from "@/lib/axios";
import { format } from "date-fns";

interface Ride {
    _id: string;
    rideId: string;
    createdBy: {
        _id: string;
        name: string;
        email: string;
        profilePhoto?: string;
    };
    driverId?: {
        _id: string;
        name: string;
        email: string;
        profilePhoto?: string;
    };
    pickup: {
        label: string;
    };
    drop: {
        label: string;
    };
    status: string;
    price: number;
    createdAt: string;
}

interface UserRideHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const UserRideHistoryModal: React.FC<UserRideHistoryModalProps> = ({ isOpen, onClose, userId }) => {
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const response = await api.get(`/admin/users/ride-history/${userId}`);
                    setRides(response.data);
                } catch (error) {
                    console.error("Failed to fetch ride history", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, userId]);

    if (!isOpen) return null;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "CANCELLED":
                return "bg-rose-50 text-rose-600 border-rose-100";
            case "STARTED":
                return "bg-amber-50 text-amber-600 border-amber-100";
            default:
                return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return <CheckCircle2 className="w-3.5 h-3.5" />;
            case "CANCELLED":
                return <XCircle className="w-3.5 h-3.5" />;
            default:
                return <Clock className="w-3.5 h-3.5" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white relative">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-[#0A192F] italic uppercase tracking-tight leading-none mb-1">
                            Ride <span className="text-[#FFD700]">Intelligence</span>
                        </h2>
                        <div className="flex items-center gap-3">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Log Archive</p>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                            <p className="text-[#0A192F] text-[10px] font-black uppercase tracking-widest">{userId}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-[#0A192F] hover:bg-slate-50 rounded-2xl transition-all"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6">
                            <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                            <p className="text-[#0A192F] font-black uppercase tracking-[0.3em] text-[10px] italic">Retrieving Historical Data...</p>
                        </div>
                    ) : rides.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
                            <Navigation className="w-16 h-16 text-slate-100 mb-6" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] italic">No logistical history recorded</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {rides.map(ride => (
                                <div key={ride._id} className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-md hover:border-[#FFD700]/20 transition-all group overflow-hidden relative">
                                    {/* Abstract background element */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-[#FFD700]/10 transition-colors"></div>
                                    
                                    <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                                        <div className="flex-1 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] italic ${getStatusStyle(ride.status)} shadow-sm`}>
                                                        {getStatusIcon(ride.status)}
                                                        {ride.status}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                                                        Registry ID: {ride.rideId}
                                                    </span>
                                                </div>
                                                <div className="text-[#0A192F] font-black text-2xl tracking-tighter">
                                                    ₹{ride.price}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1.5 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-emerald-500 shadow-inner">
                                                        <Circle className="w-4 h-4 fill-emerald-500/10" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Logistical Origin</p>
                                                        <p className="text-sm font-black text-[#0A192F] leading-snug uppercase tracking-tight">{ride.pickup.label}</p>
                                                    </div>
                                                </div>
                                                <div className="ml-5 h-8 w-px border-l-2 border-dashed border-slate-100" />
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1.5 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-rose-500 shadow-inner">
                                                        <MapPin className="w-5 h-5 fill-rose-500/10" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Final Terminus</p>
                                                        <p className="text-sm font-black text-[#0A192F] leading-snug uppercase tracking-tight">{ride.drop.label}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-px bg-slate-50 self-stretch hidden lg:block" />

                                        <div className="flex lg:flex-col items-center justify-between lg:w-56 gap-6">
                                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[24px] w-full border border-slate-100 shadow-inner">
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                                                    {ride.driverId?.profilePhoto ? (
                                                        <img src={ride.driverId.profilePhoto} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-6 h-6 text-slate-200" />
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">Specialist</p>
                                                    <p className="text-[11px] font-black text-[#0A192F] uppercase truncate">{ride.driverId?.name || "Unassigned"}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end lg:items-center gap-2">
                                                <div className="flex items-center gap-2 text-[#0A192F] bg-[#FFD700] px-3 py-1.5 rounded-xl shadow-lg shadow-[#FFD700]/10">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-[11px] font-black uppercase tracking-tighter">{format(new Date(ride.createdAt), "dd MMM yyyy")}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {format(new Date(ride.createdAt), "hh:mm a")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-10 border-t border-slate-50 bg-white flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-12 py-4 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-[20px] font-black uppercase tracking-[0.3em] italic text-[10px] transition-all shadow-xl shadow-[#0A192F]/10 border border-[#0A192F]"
                    >
                        Deactivate Console
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserRideHistoryModal;
