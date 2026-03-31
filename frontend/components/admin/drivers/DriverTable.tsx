"use client";

import React from "react";
import { 
    User, Eye, Edit2, History, Unlock, Ban, Trash2, Check, X 
} from "lucide-react";

import { Driver } from "@/lib/types/admin";


interface DriverTableProps {
    drivers: Driver[];
    onViewDocuments: (driver: Driver) => void;
    onEdit: (driver: Driver) => void;
    onViewHistory: (id: string) => void;
    onToggleBlock: (id: string, currentlyBlocked: boolean) => void;
    onDelete: (id: string) => void;
    onQuickAction: (vehicleId: string, status: "APPROVED" | "REJECTED") => void;
    getImageUrl: (path?: string) => string;
}

export default function DriverTable({ 
    drivers, 
    onViewDocuments, 
    onEdit, 
    onViewHistory, 
    onToggleBlock, 
    onDelete, 
    onQuickAction,
    getImageUrl
}: DriverTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Driver Identity</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset Details</th>
                        <th className="px-8 py-5 text-[10px] font-black text-[#0A192F] uppercase tracking-widest italic text-center">Audit Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {drivers.length > 0 ? (
                        drivers.map(driver => (
                            <tr key={driver._id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#0A192F] overflow-hidden flex-shrink-0 border border-[#0A192F] shadow-lg shadow-[#0A192F]/5 group-hover:border-[#FFD700] transition-all flex items-center justify-center">
                                            {driver.profilePhoto ? (
                                                <img src={getImageUrl(driver.profilePhoto)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-[#FFD700]" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-[#0A192F] tracking-tight flex items-center gap-1.5 uppercase italic italic-none">
                                                {driver.name}
                                                {driver.isBlocked && <Ban className="w-3 h-3 text-rose-500" />}
                                            </p>
                                            <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{driver.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {driver.vehicle ? (
                                        <div className="flex flex-col">
                                            <p className="text-[#0A192F] font-black text-[13px] tracking-tight">{driver.vehicle.vehicleModel}</p>
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">{driver.vehicle.numberPlate}</p>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-300 uppercase italic opacity-50">No Active Asset</span>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        driver.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        driver.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            driver.status === 'APPROVED' ? 'bg-emerald-500' :
                                            driver.status === 'REJECTED' ? 'bg-rose-500' :
                                            'bg-amber-500'
                                        }`}></span>
                                        {driver.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {/* Verification Quick Actions */}
                                        {(driver.status === 'PENDING' || driver.status === 'AWAITING_APPROVAL') && driver.vehicle && (
                                            <div className="flex items-center gap-1 mr-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                                <button
                                                    onClick={() => driver.vehicle && onQuickAction(driver.vehicle._id, "APPROVED")}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border border-transparent hover:border-emerald-200"
                                                    title="Quick Approve"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => driver.vehicle && onQuickAction(driver.vehicle._id, "REJECTED")}
                                                    className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all border border-transparent hover:border-rose-200"
                                                    title="Quick Reject"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => onViewDocuments(driver)}
                                            className="p-2.5 text-blue-500 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                                            title="Review Documents"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(driver)}
                                            className="p-2.5 text-amber-500 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-xl transition-all shadow-sm"
                                            title="Edit Unit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onViewHistory(driver._id)}
                                            className="p-2.5 text-indigo-500 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl transition-all shadow-sm"
                                            title="Audit Logs"
                                        >
                                            <History className="w-4 h-4" />
                                        </button>
                                        <div className="w-px h-5 bg-slate-100 mx-1.5" />
                                        <button
                                            onClick={() => onToggleBlock(driver._id, !!driver.isBlocked)}
                                            className={`p-2.5 rounded-xl transition-all border shadow-sm ${driver.isBlocked ? 'text-emerald-600 bg-emerald-100 border-emerald-200' : 'text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100'}`}
                                            title={driver.isBlocked ? "Unblock Unit" : "Block Unit"}
                                        >
                                            {driver.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => onDelete(driver._id)}
                                            className="p-2.5 text-slate-400 bg-slate-50 border border-slate-100 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all shadow-sm"
                                            title="Decommission Unit"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm italic">
                                No drivers found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
