import { ArrowUpRight, Car, Bike, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const AutoRickshawIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <path d="M18 26h20c6.5 0 12.5 3.2 16.2 8.5L58 40v8H10V32.5A6.5 6.5 0 0 1 16.5 26H18Z" fill="currentColor" />
    <path d="M24 18h10c4.4 0 8 3.6 8 8H24v-8Z" fill="currentColor" opacity="0.8" />
    <path d="M18 26v-6a4 4 0 0 1 4-4h6v10H18Z" fill="currentColor" opacity="0.7" />
    <path d="M45 30h7.5L58 40h-9a4 4 0 0 1-4-4v-6Z" fill="currentColor" opacity="0.9" />
    <circle cx="22" cy="48" r="6" fill="#0A192F" />
    <circle cx="45" cy="48" r="6" fill="#0A192F" />
    <circle cx="22" cy="48" r="2.5" fill="white" />
    <circle cx="45" cy="48" r="2.5" fill="white" />
  </svg>
);

export function HistoryTab({ ridesHistory, setActiveTab }: { ridesHistory: any[]; setActiveTab: (t: string) => void }) {
  const totalSpent = ridesHistory.reduce((acc: number, ride: any) => acc + (ride.fare || 0), 0);
  const totalDistance = ridesHistory.reduce((acc: number, ride: any) => acc + Number(ride.distance || 0), 0);

  return (
    <div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">Ride History</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Track your journeys and expenses</p>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Spent</span>
              <span className="text-lg font-black text-[#0A192F]">Rs {totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Distance</span>
              <span className="text-lg font-black text-[#00838F]">{totalDistance.toFixed(1)} km</span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {ridesHistory.length > 0 ? ridesHistory.map((ride: any, i: number) => (
            <div key={ride.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#FFD700]/30 transition-all group relative overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-[#FFD700]/5 transition-colors" />
              <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                <div className="flex items-center gap-4 min-w-[180px]">
                  <div className="w-16 h-16 bg-[#0A192F] text-[#FFD700] rounded-[24px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    {ride.type === 'car' ? <Car className="w-8 h-8" /> : ride.type === 'bike' ? <Bike className="w-8 h-8" /> : <AutoRickshawIcon className="w-8 h-8" />}
                  </div>
                  <div>
                    <h4 className="font-black text-[#0A192F] text-sm uppercase tracking-tight">{ride.vehicle}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />
                      <span className="text-[10px] font-black text-slate-500">{ride.rating}.0 Rating</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-[#FFD700]" />
                      <div className="w-0.5 h-4 bg-slate-100" />
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pickup</p>
                        <p className="text-sm font-bold text-[#0A192F]">{ride.from}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Drop-off</p>
                        <p className="text-sm font-bold text-[#0A192F]">{ride.to}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{ride.date}</p>
                    <div className="flex items-center lg:justify-end gap-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tight">{ride.status}</span>
                      <span className="text-sm font-black text-[#00838F]">{ride.distance}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fare Paid</p>
                    <h3 className="text-2xl font-black text-[#0A192F] tracking-tighter">Rs {ride.price}</h3>
                  </div>
                </div>
                <button className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all p-3 bg-[#FFD700] text-[#0A192F] rounded-xl shadow-lg hover:bg-[#0A192F] hover:text-[#FFD700]">
                  <ArrowUpRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-[#0A192F] mb-2">No Rides Yet</h3>
              <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto text-balance">Your journey history will appear here once you take your first ride with Go Ride.</p>
              <Button variant="primary" className="mt-8" onClick={() => setActiveTab('dashboard')}>Book Your First Ride</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
