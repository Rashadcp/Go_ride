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
    const [searchTerm, setSearchTerm] = useState("");
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
            toast.error("Failed to load discounts");
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
            toast.success("Discount created successfully!");
            setShowForm(false);
            fetchDiscounts();
        } catch (error) {
            toast.error("Failed to create discount code");
        }
    };

    const handleDelete = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this discount?")) return;
        try {
            await api.delete(`/admin/discounts/${id}`);
            toast.success("Discount deleted");
            fetchDiscounts();
        } catch (error) {
            toast.error("Failed to delete discount");
        }
    };

    const filteredDiscounts = discounts.filter(d => 
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.value.toString().includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] min-h-screen">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-black uppercase tracking-widest italic">Loading discounts...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#0A192F] tracking-tight italic uppercase">Marketing <span className="text-[#FFD700]">Vouchers</span></h1>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1">Promo codes and loyalty campaign management</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FFD700] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Filter codes..." 
                            className="pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-[#0A192F] focus:ring-2 ring-[#FFD700]/10 transition-all outline-none w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-3 px-8 py-3.5 bg-[#F5C800] text-[#0A192F] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-[#F5C800]/20 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Create Promo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDiscounts.length === 0 ? (
                    <div className="col-span-full py-40 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                        <Ticket className="w-20 h-20 text-slate-200 mb-6" />
                        <h3 className="text-xl font-black text-[#0A192F] mb-2">No Discounts Found</h3>
                        <p className="text-sm font-bold text-slate-400">Create a new promo code to get started.</p>
                    </div>
                ) : (
                    filteredDiscounts.map(discount => (
                        <div key={discount._id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                                <Tag className="w-24 h-24 text-[#0A192F]" />
                            </div>
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="px-4 py-2 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-xs tracking-[0.2em] italic">
                                    {discount.code}
                                </div>
                                <button 
                                    onClick={() => handleDelete(discount._id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-5 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Discount Value</p>
                                    <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter">
                                        {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `₹${discount.value}`}
                                        <span className="text-xs font-bold text-slate-400 uppercase ml-2 tracking-widest">Off</span>
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Usage</p>
                                        <p className="text-sm font-black text-[#0A192F]">{discount.currentUsage} / {discount.maxUsage}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            Active
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                    <Calendar className="w-4 h-4 text-[#FFD700]" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires {new Date(discount.expiryDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A192F]/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[32px] p-10 border border-slate-100 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                            <Zap className="w-40 h-40 text-[#FFD700]" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-[#0A192F] tracking-tight italic uppercase">New <span className="text-[#FFD700]">Promo Code</span></h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Create a new discount campaign</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-slate-50 rounded-xl text-slate-400 hover:text-[#0A192F] hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-100"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Promo Code</label>
                                    <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full h-12 px-5 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#FFD700] focus:ring-2 ring-[#FFD700]/10 outline-none font-black text-sm text-[#0A192F] transition-all" placeholder="GOSUMMER24" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reward Type</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full h-12 px-5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-[#0A192F] outline-none appearance-none cursor-pointer">
                                        <option value="PERCENTAGE">Percentage %</option>
                                        <option value="FLAT">Flat ₹ Amount</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Value</label>
                                    <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full h-12 px-5 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#FFD700] focus:ring-2 ring-[#FFD700]/10 font-bold text-sm text-[#0A192F] outline-none transition-all" placeholder="20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                                    <input type="date" required value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full h-12 px-5 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#FFD700] focus:ring-2 ring-[#FFD700]/10 font-bold text-sm text-[#0A192F] outline-none transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Uses</label>
                                <input type="number" required value={formData.maxUsage} onChange={e => setFormData({...formData, maxUsage: Number(e.target.value)})} className="w-full h-12 px-5 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#FFD700] focus:ring-2 ring-[#FFD700]/10 font-bold text-sm text-[#0A192F] outline-none transition-all" placeholder="500" />
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isPublic} 
                                        onChange={e => setFormData({...formData, isPublic: e.target.checked})}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 bg-slate-50 checked:bg-[#FFD700] transition-all cursor-pointer accent-[#FFD700]" 
                                    />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#0A192F] transition-colors">Make this offer visible to all users</span>
                                </label>
                            </div>
                            <button type="submit" className="w-full py-4 bg-[#0A192F] text-[#FFD700] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-[#0A192F]/10 hover:bg-black transition-all mt-4">Activate Promotion Code</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
