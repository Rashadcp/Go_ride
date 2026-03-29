"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Bell, CheckSquare, Trash2, Clock, Info, ShieldAlert, CreditCard, Car } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: "INFO" | "RIDE_UPDATE" | "PAYMENT" | "SYSTEM";
    isRead: boolean;
    createdAt: string;
}

export const NotificationsTab: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get("/notifications");
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            toast.error("Failed to mark as read");
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch("/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success("All caught up!");
        } catch (error) {
            toast.error("Failed to mark all as read");
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            toast.success("Notification removed");
        } catch (error) {
            toast.error("Failed to delete notification");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "RIDE_UPDATE": return <Car className="w-5 h-5 text-blue-400" />;
            case "PAYMENT": return <CreditCard className="w-5 h-5 text-emerald-400" />;
            case "SYSTEM": return <ShieldAlert className="w-5 h-5 text-rose-400" />;
            default: return <Info className="w-5 h-5 text-[#FFD700]" />;
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0A192F]">
                <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Notifications...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0A192F] overflow-hidden p-6 lg:p-10">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                {/* Header */}
                <div className="flex items-end justify-between mb-10 shrink-0">
                    <div>
                        <h2 className="text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                            Inbox <span className="text-[#FFD700]">Activity</span>
                        </h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            {notifications.filter(n => !n.isRead).length} Unread Messages
                        </p>
                    </div>
                    {notifications.length > 0 && (
                        <button 
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                        >
                            <CheckSquare className="w-4 h-4 text-[#FFD700]" />
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                    {notifications.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                            <Bell className="w-10 h-10 text-slate-600 mb-4" />
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">No notifications found</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div 
                                key={n._id}
                                className={`group relative p-6 rounded-[32px] border transition-all duration-300 ${n.isRead ? 'bg-white/5 border-white/5 opacity-80' : 'bg-white/[0.08] border-white/10 shadow-2xl shadow-[#FFD700]/5'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-white/5 text-slate-500' : 'bg-[#FFD700]/10 text-[#FFD700]'}`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4 mb-1">
                                            <h3 className={`font-black uppercase tracking-tight truncate ${n.isRead ? 'text-slate-400' : 'text-white'}`}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${n.isRead ? 'text-slate-500' : 'text-slate-300 font-medium'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions Overlay */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!n.isRead && (
                                        <button 
                                            onClick={() => markAsRead(n._id)}
                                            className="w-10 h-10 bg-[#FFD700] text-[#0A192F] rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                                            title="Mark as read"
                                        >
                                            <CheckSquare className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteNotification(n._id)}
                                        className="w-10 h-10 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center active:scale-90 transition-all border border-rose-500/20"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
