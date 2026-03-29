"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    Ticket,
    Plus,
    Trash2,
    Calendar,
    Zap,
    Tag,
    Loader2,
    Activity,
    CheckCircle,
    X,
    ChevronRight,
    Search
} from "lucide-react";

interface Discount {
    _id: string;
    code: string;
    type: string;
    value: number;
    maxUsage: number;
    currentUsage: number;
    expiryDate: string;
    active: boolean;
    description: string;
    isPublic: boolean;
}

export default function AdminDiscountsPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        code: "",
        type: "PERCENTAGE",
        value: 0,
        maxUsage: 100,
        expiryDate: "",
        description: "",
        isPublic: true
    });

    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/discounts");
            setDiscounts(response.data);
        } catch (error) {
            toast.error("Cloud campaign sync failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/admin/discounts", formData);
            toast.success("Coupon engine updated!");
            setShowForm(false);
            fetchDiscounts();
        } catch (error) {
            toast.error("Failed to inject discount code");
        }
    };

    const handleDelete = async (id: string) => {
        if(!window.confirm("Terminate this campaign?")) return;
        try {
            await api.delete(`/admin/discounts/${id}`);
            toast.success("Code deactivated");
            fetchDiscounts();
        } catch (error) {
            toast.error("Recall failed");
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#0A192F]">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-white font-bold">Synchronizing Promo Engine...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#0A192F] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Marketing <span className="text-[#FFD700]">Vouchers</span></h1>
                    <p className="text-slate-400 font-medium mt-1">Growth hacking and loyalty engine management</p>
                </div>
                <button 
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-[#FFD700] text-[#0A192F] rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#FFD700]/10 hover:-translate-y-1 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Forge New Code
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {discounts.length === 0 ? (
                    <div className="col-span-full py-40 bg-white/5 rounded-[48px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center">
                        <Ticket className="w-20 h-20 text-slate-500 mb-6 opacity-20" />
                        <h3 className="text-xl font-black text-white mb-2">No Active Offers</h3>
                        <p className="text-sm font-bold text-slate-500">Initialize your first discount campaign to see it here.</p>
                    </div>
                ) : (
                    discounts.map(discount => (
                        <div key={discount._id} className="bg-white/5 rounded-[40px] p-8 shadow-sm border border-white/5 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700">
                                <Tag className="w-24 h-24 text-white" />
                            </div>
                            
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="px-4 py-2 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-xs tracking-[0.2em] italic">
                                    {discount.code}
                                </div>
                                <button 
                                    onClick={() => handleDelete(discount._id)}
                                    className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Value Injection</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter">
                                        {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `₹${discount.value}`}
                                        <span className="text-xs font-bold text-slate-500 uppercase ml-2 tracking-widest">Off</span>
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[#0A192F] rounded-2xl border border-white/5 font-black">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Utilization</p>
                                        <p className="text-sm text-white">{discount.currentUsage} / {discount.maxUsage}</p>
                                    </div>
                                    <div className="p-4 bg-[#0A192F] rounded-2xl border border-white/5 font-black">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                        <span className="text-[10px] text-emerald-400">Active</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 py-2 border-t border-white/5">
                                    <Calendar className="w-4 h-4 text-[#FFD700]" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expires {new Date(discount.expiryDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A192F]/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0A192F] w-full max-w-xl rounded-[48px] p-12 border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <Zap className="w-40 h-40 text-[#FFD700]" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Coupon <span className="text-[#FFD700]">Nexus</span></h2>
                            <button onClick={() => setShowForm(false)} className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Promo Code</label>
                                    <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full h-14 px-6 bg-white/5 rounded-2xl border-2 border-white/5 focus:border-[#FFD700] outline-none font-black text-sm text-white transition-all" placeholder="GOSUMMER24" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reward Type</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full h-14 px-6 bg-white/5 rounded-2xl border-2 border-white/5 font-bold text-sm text-white outline-none">
                                        <option value="PERCENTAGE">Percentage %</option>
                                        <option value="FLAT">Flat ₹ Amount</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Discount Value</label>
                                    <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full h-14 px-6 bg-white/5 rounded-2xl border-2 border-white/5 font-bold text-sm text-white outline-none" placeholder="20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Expiry Date</label>
                                    <input type="date" required value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full h-14 px-6 bg-white/5 rounded-2xl border-2 border-white/5 font-bold text-sm text-white outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Max Uses</label>
                                <input type="number" required value={formData.maxUsage} onChange={e => setFormData({...formData, maxUsage: Number(e.target.value)})} className="w-full h-14 px-6 bg-white/5 rounded-2xl border-2 border-white/5 font-bold text-sm text-white outline-none" placeholder="500" />
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isPublic} 
                                        onChange={e => setFormData({...formData, isPublic: e.target.checked})}
                                        className="w-5 h-5 rounded-lg border-2 border-white/10 bg-white/5 checked:bg-[#FFD700] transition-all cursor-pointer accent-[#FFD700]" 
                                    />
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Make this offer visible to all users</span>
                                </label>
                            </div>
                            <button type="submit" className="w-full py-6 bg-[#FFD700] text-[#0A192F] rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#FFD700]/10 hover:-translate-y-1 transition-all mt-6">Activate Promotion Code</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
