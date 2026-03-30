import { Wallet, Plus, CreditCard, ArrowDownLeft, ArrowUpRight, History as HistoryIcon, Clock, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface WalletTabProps {
  user: any;
  setShowTopUpModal: (v: boolean) => void;
  transactions?: any[];
  loading?: boolean;
}

export function WalletTab({ user, setShowTopUpModal, transactions = [], loading = false }: WalletTabProps) {
  // Filter only wallet-related transactions (Hide CASH/UPI settlements)
  // We include all CREDITS (top-ups) because they increase wallet balance
  // We include only WALLET DEBITS because CASH/UPI debits don't affect wallet balance
  const walletTransactions = transactions.filter(t => 
    t.type === 'CREDIT' || (t.type === 'DEBIT' && t.method === 'WALLET')
  );

  // Real stats calculation based on filtered wallet activity
  const spentThisMonth = walletTransactions
    .filter(t => t.type === 'DEBIT' && t.method === 'WALLET' && new Date(t.createdAt).getMonth() === new Date().getMonth())
    .reduce((acc, t) => acc + t.amount, 0);

  const totalAdded = walletTransactions
    .filter(t => t.type === 'CREDIT')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex-1 bg-slate-50 p-6 lg:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-[#0A192F] mb-1 tracking-tighter uppercase italic">Secure <span className="text-[#FFD700]">Wallet</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Real-time Financial Audit & Credit Management</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
             <div className="px-5 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] leading-none mb-1.5">Total Spent</span>
                <span className="text-base font-black text-[#0A192F] tracking-tighter italic">₹{spentThisMonth.toLocaleString('en-IN')}</span>
             </div>
             <div className="px-5 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none mb-1.5">Lifetime Add</span>
                <span className="text-base font-black text-emerald-600 tracking-tighter italic">₹{totalAdded.toLocaleString('en-IN')}</span>
             </div>
             <Button 
                variant="secondary"
                className="!bg-[#0A192F] !text-[#FFD700] hover:!bg-black px-7 py-5 rounded-2xl shadow-xl shadow-black/10 font-black uppercase tracking-widest text-[12px] flex items-center gap-3 transition-all hover:scale-[1.05] active:scale-95"
                onClick={() => setShowTopUpModal(true)}
             >
                <Plus className="w-5 h-5 shrink-0" />
                Add Credits
             </Button>
          </div>
        </div>
        
        {/* Main Balance Card */}
        <div className="bg-[#0A192F] p-10 lg:p-14 rounded-[48px] shadow-2xl relative overflow-hidden text-white group border border-[#FFD700]/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/5 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-[#FFD700]/10 transition-all duration-700" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-20 -mb-20 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="space-y-8">
                <div>
                    <p className="text-[#FFD700] font-black uppercase tracking-[0.4em] text-[10px] mb-4 opacity-80 flex items-center gap-3">
                        <Zap className="w-3.5 h-3.5 fill-[#FFD700]" />
                        Liquid Assets
                    </p>
                    <h2 className="text-7xl lg:text-8xl font-black tracking-tighter flex items-center gap-5 italic">
                        <span className="text-4xl lg:text-5xl text-[#FFD700]/30 not-italic font-light">₹</span>
                        {(user?.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <CreditCard className="w-4 h-4 text-[#FFD700]" />
                        <span className="font-black uppercase tracking-widest text-[9px] text-[#FFD700]/70">Secured Digital Vault</span>
                    </div>
                </div>
            </div>

            <div className="lg:text-right space-y-3 opacity-60 text-[#FFD700]/80">
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Account Identifier</p>
                <p className="text-xs font-black tracking-[0.2em] bg-white/5 px-4 py-2 rounded-xl border border-[#FFD700]/10">USER-{user?._id?.slice(-8).toUpperCase() || 'VOID'}</p>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0A192F] text-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg border border-[#FFD700]/20">
                      <HistoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[#0A192F] uppercase tracking-widest text-[13px] italic leading-none">Financial <span className="text-slate-300 font-bold">Ledger</span></h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time audit history</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-6 bg-white rounded-[48px] border border-slate-100 shadow-inner">
                    <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Deciphering Ledger Data...</p>
                </div>
            ) : walletTransactions.length > 0 ? (
                walletTransactions.map((t, idx) => (
                    <div key={t._id} className="bg-white p-7 rounded-[40px] border border-slate-100 flex items-center justify-between group hover:shadow-2xl hover:border-[#FFD700]/30 transition-all duration-500">
                        <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner transition-transform group-hover:rotate-12 duration-500 ${t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                {t.type === 'CREDIT' ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownLeft className="w-7 h-7" />}
                            </div>
                            <div>
                                <p className="font-black text-[#0A192F] text-[16px] tracking-tight mb-1 uppercase italic leading-none">
                                    {t.type === 'CREDIT' ? 'Wallet Credit' : 'Wallet Debit'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.description}</p>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                            <div className={`text-2xl font-black tracking-tighter italic ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-[#0A192F]'}`}>
                                {t.type === 'CREDIT' ? '+' : '-'} ₹{t.amount.toLocaleString('en-IN')}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${t.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {t.status}
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-24 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-100 transition-all hover:bg-slate-50/50">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100">
                        <Wallet className="w-12 h-12 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-[#0A192F] mb-2 uppercase tracking-tighter italic">Ledger is <span className="text-slate-300">Empty</span></h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] max-w-xs mx-auto opacity-60">No wallet-specific transactions found.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
