"use client";

import React, { useState, useEffect } from "react";
import { 
    Bell, 
    Send, 
    Users, 
    ShieldCheck, 
    User as UserIcon,
    AlertCircle,
    CheckCircle2,
    Search,
    ChevronRight,
    ArrowLeft
} from "lucide-react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
}

export default function NotificationsPage() {
    const [targetType, setTargetType] = useState<"ALL" | "DRIVERS" | "USERS" | "SPECIFIC">("ALL");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState<"INFO" | "RIDE_UPDATE" | "PAYMENT" | "SYSTEM">("SYSTEM");
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (targetType === "SPECIFIC") {
            fetchAllUsers();
        }
    }, [targetType]);

    const fetchAllUsers = async () => {
        setSearchLoading(true);
        try {
            const res = await api.get("/admin/users");
            setAllUsers(res.data);
        } catch (error) {
            toast.error("Failed to load user list");
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Please provide both title and message");
            return;
        }

        if (targetType === "SPECIFIC" && !selectedUser) {
            toast.error("Please select a target user");
            return;
        }

        setLoading(true);
        try {
            await api.post("/admin/notifications", {
                targetType,
                targetId: selectedUser?._id,
                title,
                message,
                type
            });
            toast.success(`Notification broadcasted to ${targetType === 'SPECIFIC' ? selectedUser?.name : targetType}`);
            setTitle("");
            setMessage("");
            if (targetType === "SPECIFIC") {
                setSelectedUser(null);
                setSearchTerm("");
            }
        } catch (error) {
            toast.error("Failed to send notification");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = allUsers.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 bg-[#F8FAFC] min-h-full transition-all duration-300">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#0A192F] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#0A192F]/20">
                        <Bell className="w-8 h-8 text-[#FFD700]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[#0A192F] tracking-tighter uppercase italic">Broadcast Center</h1>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1">Real-time system-wide communication layer</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">1. Select Target Audience</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { id: "ALL", label: "Everyone", icon: Bell, color: "bg-blue-500" },
                                    { id: "DRIVERS", label: "Drivers", icon: ShieldCheck, color: "bg-[#FFD700]" },
                                    { id: "USERS", label: "Passengers", icon: Users, color: "bg-green-500" },
                                    { id: "SPECIFIC", label: "Individual", icon: UserIcon, color: "bg-slate-700" }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setTargetType(item.id as any)}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-[24px] border-2 transition-all group ${
                                            targetType === item.id 
                                                ? "border-[#000] bg-slate-50 scale-[1.02]" 
                                                : "border-slate-50 hover:border-slate-200"
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${item.color} shadow-lg transition-transform group-hover:scale-110`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${targetType === item.id ? "text-[#000]" : "text-slate-400"}`}>
                                            {item.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {targetType === "SPECIFIC" && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">2. Select Recipient</p>
                                {selectedUser ? (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#0A192F] rounded-xl flex items-center justify-center text-[#FFD700] font-black">
                                                {selectedUser.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-[#0A192F] text-sm uppercase italic">{selectedUser.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{selectedUser.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <input 
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-all"
                                        />
                                        {searchTerm && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-50">
                                                {searchLoading ? (
                                                    <div className="p-4 text-center text-xs font-black text-slate-400 animate-pulse">Searching Engine...</div>
                                                ) : filteredUsers.length > 0 ? (
                                                    filteredUsers.map(u => (
                                                        <button 
                                                            key={u._id}
                                                            onClick={() => setSelectedUser(u)}
                                                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all text-left group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-[#FFD700] group-hover:text-[#0A192F]">
                                                                    {u.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black text-[#0A192F] uppercase italic">{u.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-slate-200" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-xs font-black text-slate-400">No member found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                {targetType === "SPECIFIC" ? "3." : "2."} Compose Message
                            </p>
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Subject Header</span>
                                    <input 
                                        type="text"
                                        placeholder="Enter notification title..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-black placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-all"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Detailed Message</span>
                                    <textarea 
                                        rows={4}
                                        placeholder="Write your broadcast message here..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-all resize-none"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                onClick={handleSend}
                                disabled={loading}
                                className="w-full py-5 bg-[#0A192F] text-[#FFD700] rounded-[24px] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-[#0A192F]/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <Send className={`w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${loading ? 'animate-pulse' : ''}`} />
                                {loading ? "Broadcasting..." : "Dispatch Notification"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview / Rules Panel */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-[#0A192F] uppercase tracking-widest mb-6 italic">Live Preview</h3>
                        <div className="bg-[#0A192F] rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full -mr-16 -mt-16" />
                            <div className="relative flex gap-4">
                                <div className="w-12 h-12 bg-[#FFD700] rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                    <Bell className="w-6 h-6 text-[#0A192F]" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[#FFD700] text-[10px] font-black uppercase tracking-widest">Notification</p>
                                    <h4 className="text-white font-black uppercase italic text-sm line-clamp-1">{title || "Your Title Here"}</h4>
                                    <p className="text-slate-400 text-xs font-bold leading-relaxed line-clamp-3">
                                        {message || "Enter a message to see how it will look on the user's screen."}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-slate-300 font-black uppercase mt-6 tracking-widest animate-pulse italic">
                            Mock Mobile App Alert
                        </p>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 space-y-6">
                        <div className="flex items-center gap-3 text-[#0A192F]">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Broadcast Protocols</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Real-time Socket delivery enabled</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Persistent database storage</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Immediate push to mobile apps</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
