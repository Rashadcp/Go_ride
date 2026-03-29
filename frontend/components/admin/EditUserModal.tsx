"use client";

import React, { useState, useEffect } from "react";
import { X, User as UserIcon, Mail, Phone, Shield, Save, Loader2 } from "lucide-react";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/80 backdrop-blur-md">
            <div className="bg-[#112240] w-full max-w-md rounded-[32px] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
                            Edit <span className="text-[#FFD700]">User</span> Details
                        </h2>
                        <p className="text-slate-400 text-xs font-medium mt-1">Modify account information for {user.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Role</label>
                                <select 
                                    className="w-full px-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none appearance-none"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="USER">User</option>
                                    <option value="DRIVER">Driver</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Status</label>
                                <select 
                                    className="w-full px-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none appearance-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-[#FFD700] hover:bg-[#FFC800] text-[#0A192F] rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-[#FFD700]/10 disabled:opacity-50 transition-all"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Commit Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
