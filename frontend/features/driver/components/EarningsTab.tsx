import React from "react";
import { Wallet, TrendingUp, ArrowUpRight, DollarSign, History, Info } from "lucide-react";

interface EarningsTabProps {
    trips: any[];
    transactions: any[];
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ trips, transactions }) => {
    // Filter transactions relevant to earnings (CREDIT for wallet payments, DEBIT for commission deductions on cash)
    const earningsTransactions = transactions.filter(tx => 
        (tx.type === 'CREDIT' && tx.description.toLowerCase().includes('earnings')) ||
        (tx.type === 'DEBIT' && tx.description.toLowerCase().includes('platform fee'))
    );

    // Calculate Net Earnings: Sum of (CREDIT amounts) - Sum of (DEBIT commission amounts)
    // Actually, based on our backend logic:
    // - Wallet Earnings: CREDIT (Amount is already net)
    // - Cash Earnings: DEBIT (Amount is platform fee deducted from wallet)
    // - Total Wallet Net = Sum of all Driver Transactions (CREDITs are income, DEBITs are fees/payouts)
    
    const totalNetEarnings = transactions
        .filter(tx => tx.status === 'SUCCESS')
        .reduce((acc, curr) => curr.type === 'CREDIT' ? acc + curr.amount : acc - curr.amount, 0);

    const today = new Date().toDateString();
    const dailyEarnings = earningsTransactions
        .filter(tx => new Date(tx.createdAt).toDateString() === today)
        .reduce((acc, curr) => curr.type === 'CREDIT' ? acc + curr.amount : acc - curr.amount, 0);

    const completedTrips = trips.filter(t => t.status === 'COMPLETED');

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-[#0A192F]">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Earnings <span className="text-[#FFD700]">Hub</span></h2>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Live Financial Ledger & Performance</p>
                    </div>
                    <button className="px-8 py-4 bg-[#FFD700] text-[#0A192F] rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#FFD700]/10">
                        Request Payout
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet className="w-24 h-24 text-[#FFD700]" strokeWidth={1} />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Available Balance</p>
                        <h3 className="text-5xl font-black text-white italic mb-2">₹{totalNetEarnings.toFixed(0)}</h3>
                        <div className="flex items-center gap-2 text-emerald-500">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Net Profit</span>
                        </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="w-24 h-24 text-[#FFD700]" strokeWidth={1} />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Today's Revenue</p>
                        <h3 className="text-5xl font-black text-[#FFD700] italic mb-2">₹{dailyEarnings.toFixed(0)}</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{earningsTransactions.filter(tx => new Date(tx.createdAt).toDateString() === today).length} Transactions Today</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/20">
                                    <DollarSign className="w-6 h-6 text-[#FFD700]" />
                                </div>
                                <h4 className="font-black text-white uppercase italic tracking-tight text-lg">Metrics</h4>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl">
                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Trips</p>
                                    <p className="text-xl font-black text-white italic">{completedTrips.length}</p>
                                </div>
                                <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl">
                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Avg / Trip</p>
                                    <p className="text-xl font-black text-[#FFD700] italic">₹{(totalNetEarnings / (completedTrips.length || 1)).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[40px] p-8">
                            <div className="flex items-start gap-4">
                                <Info className="w-5 h-5 text-rose-500 shrink-0 mt-1" />
                                <div>
                                    <p className="text-white font-black text-xs uppercase tracking-tight mb-2 italic">Platform Fee Notice</p>
                                    <p className="text-rose-200/60 text-[10px] font-medium leading-relaxed">
                                        Platform commission (15-25%) is automatically deducted from wallet earnings or your balance for cash payments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Transactions */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 lg:p-10 h-full">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <History className="w-6 h-6 text-white/40" />
                                </div>
                                <h4 className="font-black text-white uppercase italic tracking-tight text-lg">Detailed Ledger</h4>
                            </div>

                            <div className="space-y-4">
                                {earningsTransactions.length > 0 ? (
                                    earningsTransactions.slice(0, 10).map((tx) => (
                                        <div key={tx._id} className="p-6 bg-white/[0.03] border border-white/5 rounded-[32px] hover:bg-white/[0.05] transition-all group">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <p className="text-white font-black uppercase italic tracking-tight text-sm group-hover:text-[#FFD700] transition-colors">
                                                        Ride {tx.description.split('Ride ')[1]?.split(' ')[0] || 'Settlement'}
                                                    </p>
                                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                                                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xl font-black italic ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(0)}
                                                    </p>
                                                    <p className="text-slate-600 text-[8px] font-black uppercase tracking-widest">{tx.method} Payment</p>
                                                </div>
                                            </div>
                                            
                                            {tx.metadata && (
                                                <div className="pt-4 border-t border-white/5 flex flex-wrap gap-y-4 items-center justify-between">
                                                    <div className="flex flex-wrap gap-4 lg:gap-8">
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Gross Fare</p>
                                                            <p className="text-[10px] font-bold text-slate-400">₹{tx.metadata.grossAmount || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Passenger Paid</p>
                                                            <p className="text-[10px] font-bold text-slate-400">₹{tx.metadata.discountedAmount || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Fee ({(tx.metadata.commissionRate * 100).toFixed(0)}%)</p>
                                                            <p className="text-[10px] font-bold text-rose-400/60">₹{tx.metadata.platformFee || '-'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="px-3 py-1 bg-[#FFD700]/10 rounded-full border border-[#FFD700]/20">
                                                        <span className="text-[8px] font-black text-[#FFD700] uppercase tracking-widest">Net: ₹{tx.metadata.netEarning || tx.amount}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">No financial records found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
