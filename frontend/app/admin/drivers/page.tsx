"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
    Loader2,
    Users,
    Search
} from "lucide-react";

import UserRideHistoryModal from "@/components/admin/UserRideHistoryModal";
import EditUserModal from "@/components/admin/EditUserModal";
import VerificationModal from "@/components/admin/drivers/VerificationModal";
import DriverTable from "@/components/admin/drivers/DriverTable";

import { Driver } from "@/lib/types/admin";


export default function DriverVerificationPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/drivers");
            setDrivers(response.data);
        } catch (error: any) {
            toast.error("Failed to fetch drivers list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleAction = async (vehicleId: string, status: "APPROVED" | "REJECTED") => {
        try {
            await api.put(`/admin/approve-driver/${vehicleId}`, { status });
            toast.success(`Driver ${status.toLowerCase()} successfully`);
            fetchDrivers();
            setSelectedDriver(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update status");
        }
    };

    const toggleBlockUser = async (id: string, currentlyBlocked: boolean) => {
        const action = currentlyBlocked ? "unblock" : "block";
        if (!currentlyBlocked && !window.confirm(`Are you sure you want to block this driver?`)) return;
        try {
            await api.put(`/admin/users/block/${id}`);
            toast.success(`Driver ${action}ed successfully`);
            fetchDrivers();
            if (selectedDriver?._id === id) {
                setSelectedDriver(prev => prev ? { ...prev, isBlocked: !currentlyBlocked } : null);
            }
        } catch (error: any) {
            toast.error(`Failed to ${action} driver`);
        }
    };

    const handleSoftDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this driver?")) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success("Driver deleted successfully");
            fetchDrivers();
            setSelectedDriver(null);
        } catch (error: any) {
            toast.error("Failed to delete driver");
        }
    };

    const [selectedUserIdForHistory, setSelectedUserIdForHistory] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const viewRideHistory = (id: string) => {
        setSelectedUserIdForHistory(id);
        setIsHistoryModalOpen(true);
    };

    const handleEditDriver = (driver: any) => {
        setEditingUser(driver);
        setIsEditModalOpen(true);
    };

    const filteredDrivers = drivers.filter(d => {
        const matchesSearch = 
            (d.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (d.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (d.vehicle?.numberPlate?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        if (filter === "ALL") return matchesSearch;
        if (filter === "PENDING") return matchesSearch && (d.status === "PENDING" || d.status === "AWAITING_APPROVAL");
        return matchesSearch && d.status === filter;
    });

    const getImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http") || path.startsWith("data:")) return path;
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace("/api", "");
        return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] min-h-screen">
                <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
                <p className="text-[#0A192F] font-black uppercase tracking-widest italic">Synchronizing Driver Audits...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC]">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#0A192F] tracking-tight italic uppercase">Driver <span className="text-[#FFD700]">Intelligence</span></h1>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1">Review and manage elite driver registrations</p>
                </div>

                <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? "bg-[#0A192F] text-[#FFD700] shadow-lg shadow-[#0A192F]/10"
                                : "text-slate-400 hover:text-[#0A192F] hover:bg-slate-50"
                                }`}
                        >
                            {f === "PENDING" ? "Auditing" : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white gap-4">
                    <div className="relative w-full max-w-none sm:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Search by name, plate, or email..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-[#0A192F] font-black focus:ring-2 ring-[#FFD700]/10 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 italic">
                        <Users className="w-4 h-4 text-[#FFD700]" />
                        {filteredDrivers.length} Professional Units
                    </div>
                </div>

                <DriverTable 
                    drivers={filteredDrivers}
                    onViewDocuments={setSelectedDriver}
                    onEdit={handleEditDriver}
                    onViewHistory={viewRideHistory}
                    onToggleBlock={toggleBlockUser}
                    onDelete={handleSoftDelete}
                    onQuickAction={handleAction}
                    getImageUrl={getImageUrl}
                />
            </div>

            {selectedDriver && (
                <VerificationModal 
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                    onAction={handleAction}
                />
            )}

            <UserRideHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                userId={selectedUserIdForHistory || ""}
            />

            <EditUserModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={editingUser}
                onUpdate={fetchDrivers}
            />
        </div>
    );
}
