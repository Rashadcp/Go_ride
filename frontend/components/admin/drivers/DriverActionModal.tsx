"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Ban, Check, Shield, Unlock, X } from "lucide-react";
import { Driver } from "@/lib/types/admin";

type DriverActionType = "APPROVED" | "REJECTED" | "BLOCK";

interface DriverActionModalProps {
    driver: Driver;
    onClose: () => void;
    onConfirm: (action: DriverActionType) => Promise<void> | void;
}

const ACTION_COPY: Record<DriverActionType, {
    title: string;
    description: string;
    buttonLabel: string;
    tone: string;
    icon: React.ReactNode;
}> = {
    APPROVED: {
        title: "Approve Driver",
        description: "This will activate the driver profile and allow the account to start taking rides.",
        buttonLabel: "Confirm Approval",
        tone: "bg-emerald-500 text-white border-emerald-500",
        icon: <Check className="w-5 h-5" />
    },
    REJECTED: {
        title: "Reject Driver",
        description: "This keeps the account from going live until the onboarding details are corrected and reviewed again.",
        buttonLabel: "Confirm Rejection",
        tone: "bg-rose-500 text-white border-rose-500",
        icon: <X className="w-5 h-5" />
    },
    BLOCK: {
        title: "Block Driver",
        description: "This immediately prevents the driver from accessing protected platform actions until unblocked by an admin.",
        buttonLabel: "Confirm Block Change",
        tone: "bg-[#0A192F] text-[#FFD700] border-[#0A192F]",
        icon: <Ban className="w-5 h-5" />
    }
};

export default function DriverActionModal({ driver, onClose, onConfirm }: DriverActionModalProps) {
    const [selectedAction, setSelectedAction] = useState<DriverActionType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableActions = useMemo(() => {
        const actions: DriverActionType[] = [];

        if (driver.vehicle && (driver.status === "PENDING" || driver.status === "AWAITING_APPROVAL")) {
            actions.push("APPROVED", "REJECTED");
        }

        actions.push("BLOCK");

        return actions;
    }, [driver]);

    const blockLabel = driver.isBlocked ? "Unblock Driver" : "Block Driver";
    const confirmationCopy = selectedAction ? ACTION_COPY[selectedAction] : null;

    const handleConfirm = async () => {
        if (!selectedAction) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm(selectedAction);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0A192F]/65 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-slate-100 bg-white shadow-2xl">
                <div className="border-b border-slate-100 bg-white px-8 py-7">
                    <div className="flex items-start justify-between gap-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Driver Control Center</p>
                            <h2 className="text-2xl font-black uppercase italic tracking-tight text-[#0A192F]">{driver.name}</h2>
                            <p className="text-sm font-bold text-slate-400">{driver.email}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-[#0A192F]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-8 bg-slate-50/60 px-8 py-8">
                    <div className="grid gap-4 md:grid-cols-3">
                        {availableActions.map((action) => {
                            const active = selectedAction === action;
                            const isBlockAction = action === "BLOCK";

                            return (
                                <button
                                    key={action}
                                    onClick={() => setSelectedAction(action)}
                                    className={`rounded-[28px] border p-5 text-left transition-all ${
                                        active
                                            ? "border-[#0A192F] bg-white shadow-lg shadow-[#0A192F]/5"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                    }`}
                                >
                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#0A192F]">
                                        {isBlockAction ? (driver.isBlocked ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />) : action === "APPROVED" ? <Check className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-rose-500" />}
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-[#0A192F]">
                                        {isBlockAction ? blockLabel : ACTION_COPY[action].title}
                                    </h3>
                                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
                                        {isBlockAction
                                            ? driver.isBlocked
                                                ? "Restore account access and let the driver resume normal platform usage."
                                                : "Suspend access immediately while keeping the profile available for later review."
                                            : ACTION_COPY[action].description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-inner">
                        {confirmationCopy ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[#0A192F]">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                                        {selectedAction === "BLOCK" ? <AlertTriangle className="w-5 h-5 text-[#0A192F]" /> : confirmationCopy.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Confirmation Required</p>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-[#0A192F]">
                                            {selectedAction === "BLOCK" ? blockLabel : confirmationCopy.title}
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-sm font-bold leading-relaxed text-slate-500">
                                    {selectedAction === "BLOCK"
                                        ? driver.isBlocked
                                            ? "You are about to remove the block from this driver account."
                                            : "You are about to block this driver account."
                                        : confirmationCopy.description}
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 text-slate-400">
                                <Shield className="w-5 h-5 text-[#FFD700]" />
                                <p className="text-sm font-bold">Choose an action above to review the confirmation state.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4 border-t border-slate-100 bg-white px-8 py-6">
                    <button
                        onClick={onClose}
                        className="rounded-[18px] border border-slate-200 bg-slate-50 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 transition-all hover:bg-slate-100 hover:text-[#0A192F]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedAction || isSubmitting}
                        className={`rounded-[18px] border px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] transition-all disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
                            selectedAction ? (selectedAction === "BLOCK" ? ACTION_COPY.BLOCK.tone : ACTION_COPY[selectedAction].tone) : "border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                    >
                        {isSubmitting
                            ? "Processing..."
                            : selectedAction === "BLOCK"
                                ? driver.isBlocked ? "Confirm Unblock" : "Confirm Block"
                                : confirmationCopy?.buttonLabel || "Select Action"}
                    </button>
                </div>
            </div>
        </div>
    );
}
