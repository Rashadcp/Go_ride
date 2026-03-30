"use client";

import React from "react";
import { History as HistoryIcon, Clock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface TripHistoryProps {
    trips: any[];
    loading: boolean;
}

export const TripHistory: React.FC<TripHistoryProps> = ({ trips, loading }) => {
    const { user } = useAuthStore();
    const userId = String(user?.id || user?._id);
    const [filter, setFilter] = React.useState<'ALL' | 'TAXI' | 'HOST_POOL' | 'JOIN_POOL'>('ALL');

    const filteredTrips = trips.filter(t => {
        if (t.status !== 'COMPLETED') return false;
        if (filter === 'ALL') return true;
        
        if (filter === 'TAXI') return t.type === 'TAXI';
        
        const isCreator = String(t.createdBy?._id || t.createdBy) === userId;
        if (filter === 'HOST_POOL') return t.type === 'CARPOOL' && isCreator;
        if (filter === 'JOIN_POOL') return t.type === 'CARPOOL' && !isCreator;
        
        return false;
    });

    const totalRevenue = filteredTrips.reduce((acc, curr) => acc + (curr.price || curr.fare || 0), 0);

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-[#0A192F]">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Trip <span className="text-[#FFD700]">History</span></h2>
                        <p className="text-slate-500 font-bold text-[9px] lg:text-[10px] uppercase tracking-[0.2em]">Summary of your completed engagements</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 lg:px-10 flex items-center gap-6 shadow-2xl w-full sm:w-auto justify-center">
                        <div className="text-center">
                            <p className="text-2xl lg:text-3xl font-black text-white italic leading-none">{filteredTrips.length}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">{filter === 'ALL' ? 'Completed' : `${filter} Hits`}</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-3xl font-black text-[#FFD700] italic leading-none">
                                ₹{totalRevenue.toFixed(0)}
                            </p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">{filter === 'ALL' ? 'Total Revenue' : `${filter} Revenue`}</p>
                        </div>
                    </div>
                </div>

                {/* Filter Toggle */}
                <div className="flex justify-center sm:justify-start mb-8">
                    <div className="p-1 bg-white/5 border border-white/10 rounded-[28px] flex flex-wrap gap-1">
                        {[
                            { id: 'ALL', label: 'All History' },
                            { id: 'TAXI', label: 'Private Taxi' },
                            { id: 'HOST_POOL', label: 'Car Pool (Host)' },
                            { id: 'JOIN_POOL', label: 'Car Pool (Guest)' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setFilter(t.id as any)}
                                className={`px-4 sm:px-6 py-3 rounded-[24px] text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    filter === t.id 
                                        ? 'bg-[#FFD700] text-[#0A192F] shadow-xl' 
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {loading && trips.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[40px] flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin mb-4" />
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest leading-none">Accessing Ledger...</p>
                        </div>
                    ) : filteredTrips.length > 0 ? (
                        filteredTrips.map((trip) => (
                            <div key={trip._id} className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 lg:p-10 hover:bg-white/[0.04] transition-all group relative overflow-hidden flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Clock className="w-24 h-24 text-white" strokeWidth={0.5} />
                                </div>
                                
                                <div className="flex flex-col sm:flex-row lg:items-center gap-6 flex-1 w-full">
                                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#FFD700] to-yellow-600 flex items-center justify-center shadow-2xl shrink-0 group-hover:scale-110 transition-transform duration-500">
                                        <HistoryIcon className="w-9 h-9 text-[#0A192F]" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 space-y-5">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-white font-black text-lg uppercase italic tracking-tighter leading-none">
                                                {new Date(trip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">COMPLETED</span>
                                            </div>
                                            {trip.type === 'TAXI' ? (
                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    Private Taxi
                                                </span>
                                            ) : String(trip.createdBy?._id || trip.createdBy) === userId ? (
                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    Car Pool (Host)
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Car Pool (Guest)
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                            <div className="absolute left-[7px] top-6 bottom-6 w-px bg-white/10" />
                                            <div className="flex items-start gap-4">
                                                <div className="w-4 h-4 rounded-full border-2 border-[#FFD700] bg-[#0A192F] z-10 mt-1" />
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Pickup Origin</p>
                                                    <p className="text-slate-200 text-xs font-bold truncate tracking-tight">{trip.pickup?.label || "Unknown Point"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-4 h-4 rounded-full border-2 border-slate-500 bg-[#0A192F] z-10 mt-1" />
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Terminal Point</p>
                                                    <p className="text-slate-400 text-xs font-bold truncate tracking-tight">{trip.drop?.label || trip.destination?.label || "Unknown Target"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-[180px] gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-white/5 relative z-10">
                                    <div className="flex flex-col items-start lg:items-end">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none text-right">Revenue</p>
                                        <p className="text-3xl font-black text-[#FFD700] italic leading-tight tracking-tighter">₹{(trip.price || trip.fare || 0).toFixed(0)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                {trip.type === 'CARPOOL' && String(trip.createdBy?._id || trip.createdBy) !== userId
                                                  ? (trip.passengers?.find((p: any) => String(p.userId?._id || p.userId) === userId)?.paymentMethod || 'CASH')
                                                  : (trip.paymentMethod || 'CASH')}
                                            </span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{trip.distance?.toFixed(1) || '0.0'} KM Session</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-32 bg-white/[0.01] border border-white/5 border-dashed rounded-[48px] flex flex-col items-center justify-center gap-4">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center opacity-20">
                                <HistoryIcon className="w-10 h-10 text-slate-500" />
                            </div>
                            <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.3em] italic">No completed trips found in your account history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
