"use client";

import React from "react";
import { Star, Loader2, User } from "lucide-react";

interface ReviewsListProps {
    reviews: any[];
    user: any;
    onRefresh: () => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ reviews, user, onRefresh }) => {
    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-[#0A192F]">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Driver <span className="text-[#FFD700]">Reviews</span></h2>
                        <p className="text-slate-500 font-bold text-[9px] lg:text-[10px] uppercase tracking-[0.2em]">Real-time passenger feedback</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 lg:px-10 flex items-center gap-6 shadow-2xl w-full sm:w-auto justify-center">
                        <div className="text-center">
                            <p className="text-2xl lg:text-3xl font-black text-white italic leading-none">{user?.rating || "N/A"}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">Avg Rating</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-3xl font-black text-[#FFD700] italic leading-none">{reviews.length}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">Total Reviews</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 lg:w-6 lg:h-6 text-[#FFD700]" />
                        <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Passenger Reviews</h4>
                    </div>
                    <button 
                        onClick={onRefresh}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] lg:text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 transition-all active:scale-95 group"
                    >
                        <Loader2 className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                        Refresh
                    </button>
                </div>

                <div className="space-y-4">
                    {reviews.length > 0 ? (
                        reviews.map((rev) => (
                            <div key={rev._id} className="bg-white/[0.02] border border-white/5 rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 hover:bg-white/[0.04] transition-all group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-[#FFD700]/10 flex items-center justify-center overflow-hidden border border-[#FFD700]/20">
                                            {rev.userId?.profilePhoto ? (
                                                <img 
                                                    src={rev.userId.profilePhoto.startsWith('http') ? rev.userId.profilePhoto : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${rev.userId.profilePhoto}`} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.userId?.name || "P")}&background=FFD700&color=0A192F&bold=true`;
                                                    }}
                                                />
                                            ) : (
                                                <User className="text-[#FFD700] w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white uppercase italic tracking-tight text-sm lg:text-base">{rev.userId?.name || "Passenger"}</h4>
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <Star key={i} className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${i <= rev.rating ? "fill-[#FFD700] text-[#FFD700]" : "text-white/5"}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[8px] lg:text-[9px] font-black text-slate-600 uppercase tracking-widest">{new Date(rev.createdAt).toLocaleDateString()}</span>
                                </div>
                                {rev.feedback && (
                                    <div className="mt-4 lg:mt-6 pl-14 lg:pl-16">
                                        <p className="text-slate-400 text-xs lg:text-sm font-medium leading-relaxed italic">"{rev.feedback}"</p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[40px]">
                            <Star className="w-12 h-12 text-slate-700 mx-auto mb-6 opacity-20" />
                            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No reviews collected yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
