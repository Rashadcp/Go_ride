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
    userId: {
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
        address: string;
    };
    destination: {
        address: string;
    };
    status: string;
    fare: number;
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
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "CANCELLED":
                return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            case "STARTED":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            default:
                return "bg-slate-500/10 text-slate-400 border-slate-500/20";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/80 backdrop-blur-md">
            <div className="bg-[#112240] w-full max-w-4xl max-h-[90vh] rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">
                            Ride <span className="text-[#FFD700]">History</span>
                        </h2>
                        <p className="text-slate-400 text-sm font-medium mt-1">Activity log for user ID: {userId}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Retrieving Logs...</p>
                        </div>
                    ) : rides.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/10">
                            <Navigation className="w-12 h-12 text-slate-600 mb-4" />
                            <p className="text-slate-400 font-semibold tracking-tight">No ride history found</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {rides.map(ride => (
                                <div key={ride._id} className="bg-white/2 border border-white/5 rounded-3xl p-6 hover:border-[#FFD700]/20 transition-all group">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusStyle(ride.status)}`}>
                                                        {getStatusIcon(ride.status)}
                                                        {ride.status}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        ID: {ride.rideId}
                                                    </span>
                                                </div>
                                                <div className="text-[#FFD700] font-black text-lg">
                                                    ₹{ride.fare}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">
                                                        <Circle className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Pickup</p>
                                                        <p className="text-sm font-bold text-white leading-snug">{ride.pickup.address}</p>
                                                    </div>
                                                </div>
                                                <div className="ml-1.5 h-6 w-px bg-white/10" />
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">
                                                        <MapPin className="w-3 h-3 text-rose-400 fill-rose-400/20" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Destination</p>
                                                        <p className="text-sm font-bold text-white leading-snug">{ride.destination.address}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-px bg-white/5 self-stretch hidden lg:block" />

                                        <div className="flex lg:flex-col items-center justify-between lg:w-48 gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                                                    {ride.driverId?.profilePhoto ? (
                                                        <img src={ride.driverId.profilePhoto} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-5 h-5 text-slate-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</p>
                                                    <p className="text-xs font-bold text-white">{ride.driverId?.name || "N/A"}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end lg:items-center gap-1">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">{format(new Date(ride.createdAt), "dd MMM yyyy")}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
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

                <div className="p-8 border-t border-white/5 bg-white/2 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all"
                    >
                        Close Logs
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserRideHistoryModal;
