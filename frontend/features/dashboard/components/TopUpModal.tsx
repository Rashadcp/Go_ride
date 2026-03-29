"use client";

import { useState } from "react";
import { X, ChevronRight, Loader2, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "@/lib/axios";

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export function TopUpModal({ isOpen, onClose, user }: TopUpModalProps) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleTopUp = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return toast.error("Please enter a valid amount");
        }

        setLoading(true);
        try {
            // 1. Create Order on Backend
            const { data } = await api.post("/payment/create", {
                amount: Number(amount),
                method: "RAZORPAY"
            });

            const { order, key_id } = data;

            // 2. Initialize Razorpay Checkout
            const options = {
                key: key_id,
                amount: order.amount,
                currency: order.currency,
                name: "Go Ride Mobility",
                description: "Wallet Credit Addition",
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await api.post("/payment/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: Number(amount)
                        });

                        if (verifyRes.data) {
                            toast.success(`Success! ₹${amount} added to wallet.`);
                            onClose();
                            window.location.reload();
                        }
                    } catch (err) {
                        toast.error("Verification failed. Contact support.");
                    }
                },
                prefill: {
                    name: `${user.firstName || ''} ${user.lastName || ''}`,
                    email: user.email,
                },
                theme: {
                    color: "#FFD700",
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error(err);
            toast.error("Failed to initialize payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-0 bg-[#0A192F]/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl border border-slate-200 relative animate-in slide-in-from-bottom-8 duration-500">
                {/* Header Canvas */}
                <div className="bg-[#0A192F] p-8 lg:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700] mb-2 block font-[family-name:var(--font-montserrat)]">Secure Terminal</span>
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Add <span className="text-[#FFD700]">Credits</span></h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all hover:rotate-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 lg:p-12 space-y-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1 font-[family-name:var(--font-montserrat)]">Transaction Amount (INR)</label>
                        <div className="relative group">
                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-light text-slate-300 group-focus-within:text-[#FFD700] transition-colors">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-16 pr-8 py-8 bg-slate-50 border border-slate-100 rounded-3xl text-4xl font-black text-[#0A192F] tracking-tighter focus:outline-none focus:border-[#FFD700] focus:ring-4 focus:ring-[#FFD700]/5 transition-all shadow-inner placeholder:text-slate-200"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {["500", "1000", "5000"].map((val) => (
                            <button
                                key={val}
                                onClick={() => setAmount(val)}
                                className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${amount === val ? 'bg-[#FFD700] border-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20' : 'bg-white border-slate-100 text-slate-500 hover:border-[#FFD700] hover:text-[#FFD700]'}`}
                            >
                                +₹{val}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0A192F]">Payment Protocol</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PCI-DSS Compliant Encryption</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleTopUp}
                            disabled={loading}
                            className="w-full py-6 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-black/20 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Finalize Deposit <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 opacity-30 group grayscale hover:grayscale-0 transition-opacity">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Secured via</span>
                        <Sparkles className="w-3 h-3 text-[#FFD700]" />
                        <span className="text-[9px] font-black uppercase italic tracking-tighter text-[#0A192F]">RazorPay</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
