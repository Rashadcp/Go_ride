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
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-bg-main">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-bold">Accessing User Database...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col bg-[#0A192F] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Go<span className="text-[#FFD700]">Ride</span> Users</h1>
                    <p className="text-slate-400 font-medium mt-1">Manage platform users and account security</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white/5 px-6 py-3 rounded-2xl shadow-sm border border-white/10 flex items-center gap-3">
                        <Users className="w-5 h-5 text-[#FFD700]" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">{users.length} Total Users</span>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 rounded-[32px] border border-white/5 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full pl-11 pr-4 py-3 bg-[#0A192F] border border-white/10 rounded-xl text-sm text-white focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">User Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Contact Info</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Registered Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#FFD700] uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map(user => (
                                <tr key={user._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center text-[#FFD700] font-black text-sm">
                                                {user.profilePhoto ? (
                                                    <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
                                                ) : (
                                                    user.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{user.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Shield className="w-3 h-3 text-emerald-400/50" />
                                                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter">Verified Account</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                                <Mail className="w-3.5 h-3.5" />
                                                {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                                                title="Edit User"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => viewRideHistory(user._id)}
                                                className="p-2.5 text-slate-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 rounded-xl transition-all"
                                                title="Ride History"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleFlagUser(user._id, !!user.isSuspicious)}
                                                className={`p-2.5 rounded-xl transition-all ${user.isSuspicious ? 'text-orange-500 bg-orange-500/10' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-500/10'}`}
                                                title={user.isSuspicious ? "Unflag Suspicious" : "Flag Suspicious"}
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleBlockUser(user._id, !!user.isBlocked)}
                                                className={`p-2.5 rounded-xl transition-all ${user.isBlocked ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'}`}
                                                title={user.isBlocked ? "Unblock User" : "Block User"}
                                            >
                                                {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleSoftDeleteUser(user._id)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-600/10 rounded-xl transition-all"
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
