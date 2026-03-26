"use client";

import React from "react";
import { Wallet, TrendingUp, ArrowUpRight, DollarSign } from "lucide-react";

interface EarningsTabProps {
    trips: any[];
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ trips }) => {
    const completedTrips = trips.filter(t => t.status === 'COMPLETED');
    const totalEarnings = completedTrips.reduce((acc, curr) => acc + (curr.price || curr.fare || 0), 0);
    
    // Simple mock logic for daily/weekly (can be improved with date filtering)
    const today = new Date().toDateString();
    const dailyEarnings = completedTrips
        .filter(t => new Date(t.createdAt).toDateString() === today)
        .reduce((acc, curr) => acc + (curr.price || curr.fare || 0), 0);

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-[#0A192F]">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-12 italic uppercase">Earnings <span className="text-[#FFD700]">Hub</span></h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet className="w-24 h-24 text-[#FFD700]" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Revenue</p>
                        <h3 className="text-5xl font-black text-white italic mb-2">₹{totalEarnings.toFixed(0)}</h3>
                        <div className="flex items-center gap-2 text-emerald-500">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Lifetime Payout</span>
                        </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="w-24 h-24 text-[#FFD700]" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Today's Earnings</p>
                        <h3 className="text-5xl font-black text-[#FFD700] italic mb-2">₹{dailyEarnings.toFixed(0)}</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{completedTrips.filter(t => new Date(t.createdAt).toDateString() === today).length} Trips Today</p>
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 lg:p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/20">
                            <DollarSign className="w-6 h-6 text-[#FFD700]" />
                        </div>
                        <div>
                            <h4 className="font-black text-white uppercase italic tracking-tight text-lg">Financial Breakdown</h4>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">A review of your performance metrics</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                            <div>
                                <p className="text-white font-black uppercase italic tracking-tight">Completed Rides</p>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Succesful engagements</p>
                            </div>
                            <p className="text-2xl font-black text-white italic">{completedTrips.length}</p>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                            <div>
                                <p className="text-white font-black uppercase italic tracking-tight">Average per Trip</p>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Mean revenue</p>
                            </div>
                            <p className="text-2xl font-black text-[#FFD700] italic">₹{(totalEarnings / (completedTrips.length || 1)).toFixed(0)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
