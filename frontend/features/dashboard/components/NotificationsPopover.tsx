"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Bell, CheckSquare, Trash2, Clock, Info, ShieldAlert, CreditCard, Car, X } from "lucide-react";
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

interface NotificationsPopoverProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ isOpen, onClose }) => {
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
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

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
            case "RIDE_UPDATE": return <Car className="w-5 h-5 text-indigo-500" />;
            case "PAYMENT": return <CreditCard className="w-5 h-5 text-emerald-500" />;
            case "SYSTEM": return <ShieldAlert className="w-5 h-5 text-rose-500" />;
            default: return <Info className="w-5 h-5 text-amber-500" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-20 right-8 w-full max-w-sm z-[200] animate-in fade-in zoom-in duration-200 origin-top-right">
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white shadow-2xl overflow-hidden shadow-black/5">
                <div className="p-6 border-b border-white/50 flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-[#0A192F] uppercase tracking-tighter text-lg">Inbox</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                            {notifications.filter(n => !n.isRead).length} New Messages
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                            <button 
                                onClick={markAllAsRead} 
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors"
                                title="Mark all read"
                            >
                                <CheckSquare className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-3" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checking messages...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                <Bell className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="font-black text-slate-400 uppercase tracking-widest text-[11px] mb-1">Stay Tuned!</p>
                            <p className="text-slate-400 text-[10px] leading-relaxed">No new notifications at the moment.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div 
                                key={n._id} 
                                className={`group relative p-4 rounded-2xl mb-1 transition-all ${n.isRead ? 'hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50'}`}
                            >
                                <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-white' : 'bg-white shadow-sm'}`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h4 className={`font-black uppercase tracking-tight truncate text-[11px] ${n.isRead ? 'text-slate-500' : 'text-[#0A192F]'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <p className={`text-[11px] leading-snug line-clamp-2 ${n.isRead ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!n.isRead && (
                                        <button 
                                            onClick={() => markAsRead(n._id)}
                                            className="w-7 h-7 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20 active:scale-90 transition-all"
                                        >
                                            <CheckSquare className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteNotification(n._id)}
                                        className="w-7 h-7 bg-white text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg flex items-center justify-center border border-rose-100 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {notifications.length > 5 && (
                    <div className="p-4 bg-slate-50/50 text-center">
                        <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">
                            View All History
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
