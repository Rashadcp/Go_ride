import { useState } from 'react';
import { 
  ArrowUpRight, Car, Bike, Star, MapPin, X, 
  Clock, Calendar, CreditCard, Shield, User as UserIcon,
  Navigation, Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from "next/image";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";

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

export function HistoryTab({ ridesHistory, setActiveTab, user }: { ridesHistory: any[]; setActiveTab: (t: string) => void; user: any }) {
  const [filter, setFilter] = useState<'ALL' | 'TAXI' | 'HOST_POOL' | 'JOIN_POOL'>('ALL');
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showRatingView, setShowRatingView] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  
  const userId = user?.id || user?._id;
  
  const handleRateSubmit = async () => {
    if (ratingValue === 0) return toast.error("Please select a star rating");
    try {
      await api.post("/rides/rate", {
        rideId: selectedRide._id,
        targetId: selectedRide.driverId?._id || selectedRide.driverId,
        rating: ratingValue,
        feedback: ratingFeedback
      });
      toast.success("Thank you for your feedback!");
      setShowRatingView(false);
      setRatingValue(0);
      setRatingFeedback("");
      setSelectedRide(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit rating");
    }
  };

  const filteredHistory = ridesHistory.filter((r: any) => {
    if (r.status !== 'COMPLETED') return false;
    if (filter === 'ALL') return true;
    
    if (filter === 'TAXI') return r.type === 'TAXI';
    
    const isCreator = String(r.createdBy?._id || r.createdBy) === String(userId);
    if (filter === 'HOST_POOL') return r.type === 'CARPOOL' && isCreator;
    if (filter === 'JOIN_POOL') return r.type === 'CARPOOL' && !isCreator;
    
    return false;
  });

  const totalSpent = filteredHistory.reduce((acc: number, ride: any) => {
    const isDriver = (ride.driverId === userId) || (ride.driverId?._id === userId);
    return isDriver ? acc : acc + (ride.price || 0);
  }, 0);

  const totalEarned = filteredHistory.reduce((acc: number, ride: any) => {
    const isDriver = (ride.driverId === userId) || (ride.driverId?._id === userId);
    return isDriver ? acc + (ride.price || 0) : acc;
  }, 0);

  const totalDistance = filteredHistory.reduce((acc: number, ride: any) => {
    return acc + (Number(ride.distance) || 0);
  }, 0);

  return (
    <div className="flex-1 bg-slate-50 p-6 sm:p-12 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">Ride History</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">See your past rides and spending</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-0 sm:min-w-[120px]">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">{filter === 'ALL' ? 'Total Spent' : `Spent on ${filter}`}</span>
              <span className="text-lg font-black text-[#0A192F]">Rs {totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
            </div>
            {totalEarned > 0 && (
              <div className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-0 sm:min-w-[120px]">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{filter === 'ALL' ? 'Total Earned' : `Earned from ${filter}`}</span>
                <span className="text-lg font-black text-emerald-600">Rs {totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
              </div>
            )}
            <div className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-0 sm:min-w-[120px]">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Distance</span>
              <span className="text-lg font-black text-[#00838F]">{totalDistance.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex justify-center sm:justify-start">
          <div className="p-1.5 bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-wrap gap-1">
            {[
              { id: 'ALL', label: 'All Rides' },
              { id: 'TAXI', label: user?.role === 'DRIVER' ? 'My Taxi Work' : 'Taxi Rides' },
              { id: 'HOST_POOL', label: user?.role === 'DRIVER' ? 'My Shared Rides' : 'Shared Rides' },
              ...(user?.role !== 'DRIVER' ? [{ id: 'JOIN_POOL', label: 'Joined Rides' }] : [])
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={`px-4 sm:px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  filter === t.id 
                    ? 'bg-[#0A192F] text-[#FFD700] shadow-lg scale-[1.02]' 
                    : 'text-slate-400 hover:text-[#0A192F] hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {filteredHistory.length > 0 ? filteredHistory.map((ride: any, i: number) => (
            <div key={ride.id || ride._id} 
              onClick={() => setSelectedRide(ride)}
              className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#FFD700]/50 transition-all group cursor-pointer relative overflow-hidden flex flex-col lg:flex-row gap-8 items-start lg:items-center animate-fade-in" 
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-4 sm:gap-5 min-w-0 lg:min-w-[220px] w-full lg:w-auto">
                <div className="w-16 h-16 bg-[#0A192F] text-[#FFD700] rounded-[24px] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500 shrink-0">
                  {ride.requestedVehicleType === 'car' || ride.requestedVehicleType === 'go' || ride.requestedVehicleType === 'sedan' ? <Car className="w-8 h-8" /> : ride.requestedVehicleType === 'bike' ? <Bike className="w-8 h-8" /> : <AutoRickshawIcon className="w-9 h-9" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-[#0A192F] text-[15px] uppercase tracking-tight truncate">{ride.requestedVehicleType || 'Ride'}</h4>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase">Completed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ride.type === 'TAXI' ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter bg-blue-50 text-blue-600">
                        Private Taxi
                      </span>
                    ) : String(ride.createdBy?._id || ride.createdBy) === String(userId) ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter bg-amber-100 text-amber-700">
                        Car Pool (Host)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700">
                        Car Pool (Guest)
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                      (ride.paymentMethod === 'WALLET' || (ride.type === 'CARPOOL' && ride.passengers?.find((p:any) => String(p.userId?._id || p.userId) === String(userId))?.paymentMethod === 'WALLET')) 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <CreditCard className="w-2.5 h-2.5" />
                      {ride.type === 'CARPOOL' && String(ride.createdBy?._id || ride.createdBy) !== String(userId)
                        ? (ride.passengers?.find((p: any) => String(p.userId?._id || p.userId) === String(userId))?.paymentMethod || 'CASH')
                        : (ride.paymentMethod || 'CASH')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-start gap-4 relative">
                  <div className="absolute left-[5px] top-[14px] bottom-[14px] w-[1px] bg-slate-100 group-hover:bg-[#FFD700]/30 transition-colors" />
                  <div className="flex flex-col items-center gap-1 mt-1.5 z-10">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-[#FFD700] bg-white" />
                    <div className="flex-1" />
                    <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="max-w-md">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Start Location</p>
                      <p className="text-[13px] font-bold text-[#0A192F] truncate leading-tight">{ride.pickup?.label || 'Start Location'}</p>
                    </div>
                    <div className="max-w-md">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">End Location</p>
                      <p className="text-[13px] font-bold text-[#0A192F] truncate leading-tight">{ride.drop?.label || 'End Location'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between w-full lg:w-[160px] gap-4 sm:gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                <div className="text-left lg:text-right w-full sm:w-auto">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">
                    {new Date(ride.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(ride.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[13px] font-black text-[#00838F] mt-1">{ride.distance?.toFixed(1) || '0.0'} KM TRIP</p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
                    {((ride.driverId === userId) || (ride.driverId?._id === userId)) ? 'Revenue' : 'Paid Amount'}
                  </p>
                  <h3 className={`text-2xl font-black tracking-tighter leading-none ${((ride.driverId === userId) || (ride.driverId?._id === userId)) ? 'text-emerald-600' : 'text-[#0A192F]'}`}>
                    ₹{ride.price || 0}
                  </h3>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-24 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-100 shadow-inner">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 opacity-40">
                <Car className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-[#0A192F] mb-3 tracking-tight">No Rides Found</h3>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-xs mx-auto opacity-60">You haven't taken any {filter !== 'ALL' ? filter.toLowerCase().replace('_', ' ') : ''} rides yet.</p>
              <Button variant="primary" className="mt-10 px-10 py-4 shadow-xl hover:shadow-[#FFD700]/20" onClick={() => { setFilter('ALL'); setActiveTab('dashboard'); }}>Start your first trip</Button>
            </div>
          )}
        </div>
      </div>

      {/* RIDE DETAILS MODAL */}
      {selectedRide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#0A192F]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-500">
            {/* Header with status map/background */}
            <div className="h-32 sm:h-40 bg-[#0A192F] relative flex items-center px-6 sm:px-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFD700]/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10" />
                
                <div className="relative z-10 w-full flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-2 block">
                          {((selectedRide.driverId === userId) || (selectedRide.driverId?._id === userId) || (selectedRide.driverId?._id === userId)) ? 'Payment Received' : 'Trip Summary'}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-2 sm:gap-3">
                          Rs {selectedRide.price}
                          <span className={`text-[8px] sm:text-[10px] py-0.5 sm:py-1 px-2 sm:px-3 rounded-full border border-white/20 font-black tracking-widest ${selectedRide.type === 'CARPOOL' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                            {selectedRide.type === 'CARPOOL' ? 'Shared' : 'Private'}
                          </span>
                        </h2>
                    </div>
                    <button 
                      onClick={() => setSelectedRide(null)}
                      className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-10 space-y-8 sm:space-y-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {/* Driver Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-10 border-b border-slate-100">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-3xl bg-slate-100 overflow-hidden relative border-4 border-white shadow-xl">
                            {selectedRide.driverId?.profilePhoto ? (
                                <Image src={selectedRide.driverId.profilePhoto} alt="Driver" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#0A192F] flex items-center justify-center text-[#FFD700]">
                                    <UserIcon className="w-10 h-10" strokeWidth={1} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver</p>
                            <h4 className="text-xl font-black text-[#0A192F] uppercase tracking-tighter">{selectedRide.driverId?.name || "GoRide Driver"}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg">
                                    <Star className="w-3.5 h-3.5 fill-[#FFA000] text-[#FFA000]" />
                                    <span className="text-[11px] font-black text-[#FFA000]">{selectedRide.driverId?.rating || "5.0"}</span>
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 ml-2 uppercase">Safe Driver</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Rating Action */}
                    {((selectedRide.driverId?._id || selectedRide.driverId) !== userId) && (
                      <div className="w-full sm:w-auto">
                        {!showRatingView ? (
                          <Button 
                            variant="primary" 
                            className="w-full px-8 py-3 bg-[#FFD700] text-[#0A192F] font-black uppercase text-[10px] tracking-widest h-auto"
                            onClick={() => setShowRatingView(true)}
                          >
                            Rate this Trip
                          </Button>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button key={s} onClick={() => setRatingValue(s)}>
                                  <Star className={`w-6 h-6 ${ratingValue >= s ? 'fill-[#FFD700] text-[#FFD700]' : 'text-slate-200'}`} />
                                </button>
                              ))}
                            </div>
                            <input 
                              placeholder="Any feedback? (Optional)" 
                              className="text-[10px] p-2 border border-slate-100 rounded-lg focus:outline-none focus:border-[#FFD700]"
                              value={ratingFeedback}
                              onChange={(e) => setRatingFeedback(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button onClick={handleRateSubmit} className="flex-1 py-1.5 h-auto text-[9px] font-black uppercase tracking-widest bg-[#0A192F] text-white">Submit</Button>
                              <Button onClick={() => setShowRatingView(false)} variant="outline" className="py-1.5 h-auto text-[9px] font-black uppercase tracking-widest border-slate-200">Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vehicle Identity */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex items-center gap-4 w-full sm:w-auto shadow-inner">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0A192F] shadow-sm">
                            {selectedRide.requestedVehicleType === 'car' ? <Car className="w-6 h-6" /> : selectedRide.requestedVehicleType === 'bike' ? <Bike className="w-6 h-6" /> : <AutoRickshawIcon className="w-7 h-7" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Info</p>
                            <p className="text-sm font-black text-[#0A192F] uppercase">{selectedRide.driverId?.vehicleNumber || "Verified Vehicle"}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {selectedRide.requestedVehicleType || "Car"} • {selectedRide.type === 'CARPOOL' ? 'Shared' : 'Private'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Logistics Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Navigation className="w-4 h-4 text-[#FFD700]" />
                                <h5 className="text-[11px] font-black text-[#0A192F] uppercase tracking-[0.2em]">Trip Path</h5>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center gap-1 mt-1.5">
                                    <div className="w-3 h-3 rounded-full border-2 border-[#FFD700]" />
                                    <div className="w-0.5 h-12 bg-slate-100" />
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pickup Information</p>
                                        <p className="text-sm font-bold text-[#0A192F] leading-snug">{selectedRide.pickup?.label}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Destination Target</p>
                                        <p className="text-sm font-bold text-[#0A192F] leading-snug">{selectedRide.drop?.label}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Info className="w-4 h-4 text-[#FFD700]" />
                                <h5 className="text-[11px] font-black text-[#0A192F] uppercase tracking-[0.2em]">Trip Info</h5>
                            </div>
                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-5 shadow-inner">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
                                    </div>
                                    <span className="text-sm font-black text-[#0A192F] uppercase tracking-tighter">~ {Math.round(selectedRide.duration / 60) || 15} Mins</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Date & Time</span>
                                    </div>
                                    <span className="text-sm font-black text-[#0A192F] uppercase tracking-tighter">
                                        {new Date(selectedRide.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(selectedRide.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-4 h-4 text-slate-400" />
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Method</span>
                                    </div>
                                    <span className="text-sm font-black text-[#0A192F] uppercase tracking-tighter">
                                        {selectedRide.type === 'CARPOOL' && String(selectedRide.createdBy?._id || selectedRide.createdBy) !== String(userId)
                                          ? (selectedRide.passengers?.find((p: any) => String(p.userId?._id || p.userId) === String(userId))?.paymentMethod || 'CASH')
                                          : (selectedRide.paymentMethod || 'CASH')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-[#0A192F] rounded-3xl p-6 flex items-center justify-between group cursor-default">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#FFD700] rounded-2xl flex items-center justify-center text-[#0A192F]">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.15em]">Security Verified</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Protected by GoRide Safety</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
