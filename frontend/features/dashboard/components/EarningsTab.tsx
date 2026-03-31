import { IndianRupee, TrendingUp, CheckCircle2, Star, Zap, Clock, Calendar, CreditCard, Shield, User as UserIcon, Navigation, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function EarningsTab({ ridesHistory = [], user, isDriver = false }: { ridesHistory?: any[]; user?: any; isDriver?: boolean }) {
  const completedRides = ridesHistory.filter((ride: any) => ride.status === 'COMPLETED');
  const userId = String(user?.id || user?._id);

  // Relevant rides for the current user in their current mode
  const currentModeRides = completedRides.filter((ride: any) => {
    if (isDriver) {
      // For carpool driver, they are the driverId
      return String(ride.driverId?._id || ride.driverId) === userId;
    } else {
      // For passenger, they are the one who created the request OR are in passengers array
      const isCreator = String(ride.createdBy?._id || ride.createdBy) === userId;
      const isPassenger = ride.passengers?.some((p: any) => String(p.userId?._id || p.userId) === userId);
      return isCreator || isPassenger;
    }
  });

  const totalAmount = currentModeRides.reduce((sum, ride) => sum + Number(ride.price || 0), 0);
  const totalTrips = currentModeRides.length;
  const averageAmount = totalTrips > 0 ? totalAmount / totalTrips : 0;
  
  const now = new Date();
  const thisMonth = now.getMonth();
  const todayStr = now.toDateString();

  const monthlyAmount = currentModeRides.reduce((sum, ride) => {
    return new Date(ride.createdAt).getMonth() === thisMonth ? sum + Number(ride.price || 0) : sum;
  }, 0);

  const todayAmount = currentModeRides.reduce((sum, ride) => {
    return new Date(ride.createdAt).toDateString() === todayStr ? sum + Number(ride.price || 0) : sum;
  }, 0);

  const dailyTarget = isDriver ? 2000 : 500; // Target earnings vs Budget limit
  const progressPercent = Math.min(100, (todayAmount / dailyTarget) * 100);

  const topRouteRide = currentModeRides[0];

  return (
    <div className="flex-1 bg-slate-50 p-6 sm:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">
              {isDriver ? 'Earnings Dashboard' : 'Spending Insights'}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
              {isDriver ? 'Monitor your revenue & performance' : 'Track your travel expenses & patterns'}
            </p>
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
          <div className={isDriver ? "bg-[#0A192F] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group border border-[#FFD700]/20" : "bg-[#00838F] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group"}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.2em] mb-4">
              {isDriver ? 'Total Revenue' : 'Total Spent'}
            </p>
            <h3 className="text-4xl font-black tracking-tighter mb-2">Rs {totalAmount.toFixed(0)}</h3>
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[11px] font-bold text-slate-300">{totalTrips} completed trips</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Engagement Count</p>
            <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">{totalTrips}</h3>
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[11px] font-bold">Avg. {isDriver ? 'Earning' : 'Spend'} Rs {averageAmount.toFixed(0)}</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Frequent Route</p>
            <h2 className="text-lg font-black text-[#0A192F] leading-tight mb-2 truncate">
              {topRouteRide ? `${topRouteRide.pickup?.label?.split(',')[0]} → ${topRouteRide.drop?.label?.split(',')[0]}` : 'No sessions yet'}
            </h2>
            <div className="flex items-center gap-2 text-[#B8860B]">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-[11px] font-bold">{Number(user?.rating || 5).toFixed(1)} Rating Score</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-8">
          {/* Recent List */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest">
                {isDriver ? 'Recent Payouts' : 'Recent Trip Charges'}
              </h3>
              <button className="text-[10px] font-black text-[#00838F] uppercase hover:underline">Full Report</button>
            </div>
            <div className="space-y-4 py-12 text-center bg-white rounded-[32px] border border-slate-100 min-h-[300px] flex flex-col justify-center">
              {currentModeRides.length > 0 ? (
                <div className="w-full max-w-2xl mx-auto px-6 space-y-4">
                  {currentModeRides.slice(0, 5).map((ride: any) => (
                    <div key={ride._id || ride.rideId} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:border-[#FFD700]/30 transition-all cursor-pointer group">
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black text-[#0A192F] truncate group-hover:text-[#00838F] transition-colors">{ride.pickup?.label?.split(',')[0]} to {ride.drop?.label?.split(',')[0]}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{new Date(ride.createdAt).toLocaleDateString()} • {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[#0A192F]">Rs {Number(ride.price || 0).toFixed(0)}</p>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Settled</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No activity history found</p>
                </>
              )}
            </div>
          </div>
          
          {/* Goals & Progress */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FFD700]" />
              <h4 className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest mb-8">Daily {isDriver ? 'Goal' : 'Budget'} Progress</h4>
              <div className="relative w-36 h-36 mx-auto mb-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-50" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={402} strokeDashoffset={402 - (402 * progressPercent / 100)} strokeLinecap="round" className="text-[#FFD700] transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-[#0A192F]">{progressPercent.toFixed(0)}%</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{isDriver ? 'of Revenue' : 'of Budget'}</span>
                </div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's {isDriver ? 'Target' : 'Limit'}: Rs {dailyTarget}</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#FFD700] h-full transition-all duration-700 shadow-[0_0_10px_rgba(255,215,0,0.4)]" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="pt-2">
                  <p className="text-sm font-black text-[#0A192F]">Rs {todayAmount.toFixed(0)} {isDriver ? 'Earned' : 'Spent'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">₹{monthlyAmount.toFixed(0)} total this month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
