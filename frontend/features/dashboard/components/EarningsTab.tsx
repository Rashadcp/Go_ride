import { IndianRupee, TrendingUp, CheckCircle2, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function EarningsTab({ ridesHistory = [], user }: { ridesHistory?: any[]; user?: any }) {
  const completedRides = ridesHistory.filter((ride: any) => ride.status === 'COMPLETED');
  const totalSpent = completedRides.reduce((sum: number, ride: any) => {
    if (String(ride.createdBy?._id || ride.createdBy) === String(user?.id || user?._id)) {
      return sum + Number(ride.price || 0);
    }
    return sum;
  }, 0);
  const totalTrips = completedRides.filter((ride: any) => String(ride.createdBy?._id || ride.createdBy) === String(user?.id || user?._id)).length;
  const topRouteRide = completedRides[0];
  const averageSpend = totalTrips > 0 ? totalSpent / totalTrips : 0;
  const thisMonth = new Date().getMonth();
  const monthlySpend = completedRides.reduce((sum: number, ride: any) => {
    const isPassengerRide = String(ride.createdBy?._id || ride.createdBy) === String(user?.id || user?._id);
    if (!isPassengerRide) return sum;
    const rideDate = new Date(ride.createdAt);
    return rideDate.getMonth() === thisMonth ? sum + Number(ride.price || 0) : sum;
  }, 0);

  return (
    <div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">Earnings Dashboard</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Monitor your revenue & driver performance</p>
          </div>
          <div className="flex gap-3">
            <div className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Live Updates</span>
            </div>
          </div>
        </div>
        
        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#0A192F] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group border border-[#FFD700]/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.2em] mb-4">Total Revenue</p>
            <h3 className="text-4xl font-black tracking-tighter mb-2">Rs {totalSpent.toFixed(2)}</h3>
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[11px] font-bold">{totalTrips > 0 ? `${totalTrips} completed rides` : 'No data yet'}</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Completed Rides</p>
            <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">{totalTrips}</h3>
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[11px] font-bold">Avg spend Rs {averageSpend.toFixed(0)}</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Top Route</p>
            <h2 className="text-lg font-black text-[#0A192F] leading-tight mb-2 truncate">
              {topRouteRide ? `${topRouteRide.pickup?.label || 'Pickup'} to ${topRouteRide.drop?.label || 'Destination'}` : 'No rides yet'}
            </h2>
            <div className="flex items-center gap-2 text-[#B8860B]">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-[11px] font-bold">{Number(user?.rating || 5).toFixed(1)} Avg. Rating</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-8">
          {/* Recent Earnings List */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest">Recent Payouts</h3>
              <button className="text-[10px] font-black text-[#00838F] uppercase hover:underline">View All</button>
            </div>
            <div className="space-y-4 py-12 text-center bg-white rounded-[32px] border border-slate-100">
              {completedRides.length > 0 ? (
                <div className="w-full max-w-2xl mx-auto px-6 space-y-4">
                  {completedRides.slice(0, 5).map((ride: any) => (
                    <div key={ride._id || ride.rideId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black text-[#0A192F] truncate">{ride.pickup?.label || "Pickup"} to {ride.drop?.label || "Destination"}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{new Date(ride.createdAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-black text-[#0A192F]">Rs {Number(ride.price || 0).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No payout history available</p>
                </>
              )}
            </div>
          </div>
          
          {/* Goals & Breakdown */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]" />
              <h4 className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest mb-8">Daily Progress</h4>
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 * 0.25} strokeLinecap="round" className="text-[#FFD700] transition-all duration-1000 shadow-lg" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-[#0A192F]">75%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">of Goal</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target: Rs 2,000</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#FFD700] h-full" style={{ width: `${Math.min(100, (monthlySpend / 2000) * 100)}%` }} />
                </div>
                <p className="text-sm font-black text-[#0A192F]">Rs {monthlySpend.toFixed(0)} spent this month</p>
              </div>
            </div>
            
            <div className="bg-[#FFD700] p-8 rounded-[40px] shadow-xl shadow-[#FFD700]/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-6 text-[#0A192F]">
                  <Zap className="w-6 h-6 fill-current" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">Surge Bonus</h4>
                </div>
                <p className="text-sm font-bold text-[#0A192F]/80 leading-snug mb-8 text-balance">
                  Earn extra during high demand hours!
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
