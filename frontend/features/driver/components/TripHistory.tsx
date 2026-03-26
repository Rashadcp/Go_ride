"use client";

import React from "react";
import { History as HistoryIcon, Clock, Loader2 } from "lucide-react";

interface TripHistoryProps {
    trips: any[];
    loading: boolean;
}

export const TripHistory: React.FC<TripHistoryProps> = ({ trips, loading }) => {
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
                            <p className="text-2xl lg:text-3xl font-black text-white italic leading-none">{trips.filter(t => t.status === 'COMPLETED').length}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">Completed</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-3xl font-black text-[#FFD700] italic leading-none">
                                ₹{trips.reduce((acc, curr) => acc + (curr.status === 'COMPLETED' ? (curr.price || curr.fare || 0) : 0), 0).toFixed(0)}
                            </p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">Revenue</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {loading && trips.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[40px] flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin mb-4" />
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Accessing Ledger...</p>
                        </div>
                    ) : trips.length > 0 ? (
                        trips.map((trip) => (
                            <div key={trip._id} className="bg-white/[0.02] border border-white/5 rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        trip.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                        trip.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    }`}>
                                        {trip.status}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                <Clock className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-white font-black text-sm uppercase italic tracking-tight">{new Date(trip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3 pl-2 border-l-2 border-white/5 ml-5">
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-full bg-[#FFD700] mt-1.5 shrink-0"></div>
                                                <p className="text-slate-300 text-[11px] font-bold leading-tight">{trip.pickup?.address || trip.pickup?.label || "Unknown Origin"}</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-full bg-slate-500 mt-1.5 shrink-0"></div>
                                                <p className="text-slate-400 text-[11px] font-bold leading-tight">{trip.destination?.address || trip.destination?.label || "Unknown Destination"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between lg:justify-end lg:flex-col lg:items-end gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right mb-1">Earned</p>
                                            <p className="text-2xl font-black text-white italic">₹{(trip.price || trip.fare || 0).toFixed(2)}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{trip.distance ? `${trip.distance.toFixed(1)} km` : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[40px]">
                            <HistoryIcon className="w-12 h-12 text-slate-700 mx-auto mb-6 opacity-20" />
                            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No trips recorded in history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
