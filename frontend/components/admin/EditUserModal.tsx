"use client";

import React, { useState, useEffect } from "react";
import { X, User as UserIcon, Mail, Phone, Shield, Save, Loader2, Activity } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    status?: string;
}

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile | null;
    onUpdate: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        role: "USER",
        status: "ACTIVE"
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: (user as any).phone || "",
                role: user.role || "USER",
                status: user.status || "ACTIVE"
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/admin/users/${user._id}`, formData);
            toast.success("User details updated successfully");
            onUpdate();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white relative">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black text-[#0A192F] italic uppercase tracking-tight leading-none mb-1">
                            Modify <span className="text-[#FFD700]">Identity</span>
                        </h2>
                        <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.2em] italic">Account Revision Protocol</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-[#0A192F] hover:bg-slate-50 rounded-2xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-slate-50/30">
                    <div className="space-y-6">
                        <div className="group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block italic group-focus-within:text-blue-500 transition-colors">Unit Designation</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 group-focus-within:scale-110 transition-all" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-[13px] font-black text-[#0A192F] uppercase tracking-tight focus:ring-4 ring-blue-500/5 border-blue-500/20 transition-all outline-none shadow-sm"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block italic group-focus-within:text-indigo-500 transition-colors">Registry Communication</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 group-focus-within:scale-110 transition-all" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-[13px] font-black text-[#0A192F] lowercase tracking-tight focus:ring-4 ring-indigo-500/5 border-indigo-500/20 transition-all outline-none shadow-sm"
                                    placeholder="Enter email address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block italic group-focus-within:text-emerald-500 transition-colors">Contact Protocol (Phone)</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 group-focus-within:scale-110 transition-all" />
                                <input
                                    type="text"
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-[13px] font-black text-[#0A192F] tracking-widest focus:ring-4 ring-emerald-500/5 border-emerald-500/20 transition-all outline-none shadow-sm"
                                    placeholder="Enter contact number"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block italic group-focus-within:text-[#FFD700] transition-colors">Access Level</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFD700] pointer-events-none" />
                                    <select 
                                        className="w-full pl-11 pr-5 py-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-[#0A192F] uppercase tracking-widest focus:ring-4 ring-[#FFD700]/5 border-[#FFD700]/20 transition-all outline-none appearance-none shadow-sm cursor-pointer"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="USER">User (Standard)</option>
                                        <option value="DRIVER">Driver (Operator)</option>
                                        <option value="ADMIN">Admin (Executive)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block italic group-focus-within:text-violet-500 transition-colors">System Status</label>
                                <div className="relative">
                                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-500 pointer-events-none" />
                                    <select 
                                        className="w-full pl-11 pr-5 py-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-[#0A192F] uppercase tracking-widest focus:ring-4 ring-violet-500/5 border-violet-500/20 transition-all outline-none appearance-none shadow-sm cursor-pointer"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">Status: Operational</option>
                                        <option value="INACTIVE">Status: Suspended</option>
                                        <option value="APPROVED">Status: Verified</option>
                                        <option value="REJECTED">Status: Denied</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4 relative z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-slate-400 font-black uppercase tracking-[0.2em] italic text-[10px] transition-all shadow-sm"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-6 py-4 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-2xl font-black uppercase tracking-[0.2em] italic text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-[#0A192F]/10 disabled:opacity-50 transition-all border border-[#0A192F]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" /> : <Save className="w-4 h-4 text-[#FFD700]" />}
                            Commit Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
