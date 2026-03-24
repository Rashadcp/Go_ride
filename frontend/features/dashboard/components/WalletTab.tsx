import { Wallet, Plus, CreditCard, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface WalletTabProps {
  user: any;
  setShowTopUpModal: (v: boolean) => void;
}

export function WalletTab({ user, setShowTopUpModal }: WalletTabProps) {
  return (
    <div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">Digital Wallet</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Manage your balance & payments</p>
          </div>
          <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowTopUpModal(true)}>Add Credits</Button>
        </div>
        
        {/* Main Balance Card */}
        <div className="bg-[#0A192F] p-10 rounded-[48px] shadow-2xl relative overflow-hidden text-white border border-[#FFD700]/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-[#FFD700] font-black uppercase tracking-[0.3em] text-[10px] mb-4">Current Balance</p>
            <h2 className="text-6xl font-black mb-8 tracking-tighter">Rs {(user?.walletBalance)?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                <CreditCard className="w-5 h-5 text-[#FFD700]" />
                <span className="font-bold text-sm">**** NO CARD</span>
              </div>
              <span className="text-slate-500 font-bold text-sm tracking-widest uppercase">Add a card in settings</span>
            </div>
          </div>
        </div>
        
        {/* Stats & Tools */}
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[32px] shadow-lg border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Spent this month</p>
                <h3 className="text-xl font-black text-[#0A192F]">Rs 0.00</h3>
              </div>
            </div>
            <div className="text-slate-400 font-black text-xs px-2 py-1 bg-slate-50 rounded-lg">0%</div>
          </div>
          <div className="bg-white p-8 rounded-[32px] shadow-lg border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-50 text-[#B8860B] rounded-2xl flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Savings</p>
                <h3 className="text-xl font-black text-[#0A192F]">Rs 0.00</h3>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions */}
        <div className="space-y-4 py-10 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Wallet className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="font-black text-slate-400 uppercase tracking-widest text-[11px]">No Recent Transactions</h3>
          <p className="text-slate-400 text-[10px] font-medium max-w-xs mx-auto">Your ride payments and top-ups will appear here once you start using Go Ride.</p>
        </div>
      </div>
    </div>
  );
}
