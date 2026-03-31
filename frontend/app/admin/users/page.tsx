"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Shield,
    Trash2,
    Search,
    Users,
    Loader2,
    ChevronRight,
    Calendar,
    Clock,
    Edit2,
    Ban,
    Unlock,
    AlertTriangle,
    History,
    X,
    Navigation,
    Circle,
    UserCircle
} from "lucide-react";
import UserRideHistoryModal from "@/components/admin/UserRideHistoryModal";
import EditUserModal from "@/components/admin/EditUserModal";

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    role: string;
    profilePhoto?: string;
    phone?: string;
    addresses?: Array<{ label: string, address: string }>;
    isBlocked?: boolean;
    isSuspicious?: boolean;
    createdAt: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/users");
            setUsers(response.data);
        } catch (error: any) {
            toast.error("Failed to fetch users list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleBlockUser = async (id: string, currentlyBlocked: boolean) => {
        const action = currentlyBlocked ? "unblock" : "block";
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            await api.put(`/admin/users/block/${id}`);
            toast.success(`User ${action}ed successfully`);
            fetchUsers();
        } catch (error: any) {
            toast.error(`Failed to ${action} user`);
        }
    };

    const toggleFlagUser = async (id: string, currentlyFlagged: boolean) => {
        const action = currentlyFlagged ? "unflag" : "flag";
        try {
            await api.put(`/admin/users/flag/${id}`);
            toast.success(`User ${action}ged successfully`);
            fetchUsers();
        } catch (error: any) {
            toast.error(`Failed to ${action} user`);
        }
    };

    const handleSoftDeleteUser = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user account? This is a soft delete and the data will be retained for archival purposes.")) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success("User account deleted successfully");
            fetchUsers();
        } catch (error: any) {
            toast.error("Failed to delete user");
        }
    };

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    const viewRideHistory = (id: string) => {
        setSelectedUserId(id);
        setIsHistoryModalOpen(true);
    };

    const handleEditUser = (user: UserProfile) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-black uppercase tracking-widest italic">Loading users...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#0A192F] tracking-tight italic uppercase">Go<span className="text-[#FFD700]">Ride</span> Users</h1>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1">Update users and keep accounts safe</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <Users className="w-5 h-5 text-[#FFD700]" />
                        <span className="text-sm font-black text-[#0A192F] uppercase tracking-widest">{users.length} Total Users</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-[#0A192F] font-semibold focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">User</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Email & Phone</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Joined On</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#0A192F] uppercase tracking-widest italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map(user => (
                                <tr key={user._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#0A192F] border border-[#0A192F] shadow-lg shadow-[#0A192F]/5 flex items-center justify-center text-[#FFD700] font-black text-sm group-hover:border-[#FFD700] transition-all">
                                                {user.profilePhoto ? (
                                                    <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
                                                ) : (
                                                    user.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-[#0A192F] tracking-tight">{user.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Shield className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-tighter">Safe User</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-sm text-[#0A192F] font-black tracking-tight">
                                                <Mail className="w-4 h-4 text-[#FFD700]" />
                                                {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-2 text-[13px] text-slate-400 font-bold uppercase tracking-widest">
                                                    <Phone className="w-4 h-4" />
                                                    {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-[11px] font-black text-[#0A192F] uppercase tracking-tighter italic">
                                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                className="p-2.5 text-blue-500 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                                                title="Edit User"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => viewRideHistory(user._id)}
                                                className="p-2.5 text-violet-500 bg-violet-50 border border-violet-100 hover:bg-violet-100 rounded-xl transition-all shadow-sm"
                                                title="Ride History"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleFlagUser(user._id, !!user.isSuspicious)}
                                                className={`p-2.5 rounded-xl transition-all border shadow-sm ${user.isSuspicious ? 'text-amber-600 bg-amber-100 border-amber-200' : 'text-amber-500 bg-amber-50 border-amber-100 hover:bg-amber-100'}`}
                                                title={user.isSuspicious ? "Unflag Suspicious" : "Flag Suspicious"}
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleBlockUser(user._id, !!user.isBlocked)}
                                                className={`p-2.5 rounded-xl transition-all border shadow-sm ${user.isBlocked ? 'text-rose-600 bg-rose-100 border-rose-200' : 'text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100'}`}
                                                title={user.isBlocked ? "Unblock User" : "Block User"}
                                            >
                                                {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleSoftDeleteUser(user._id)}
                                                className="p-2.5 text-slate-400 bg-slate-50 border border-slate-100 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all shadow-sm"
                                                title="Soft Delete Account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserRideHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                userId={selectedUserId || ""}
            />

            <EditUserModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={editingUser}
                onUpdate={fetchUsers}
            />
        </div>
    );
}
