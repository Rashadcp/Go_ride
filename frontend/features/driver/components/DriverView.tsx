import { Wallet, IndianRupee, Bell, HelpCircle, Navigation, Compass, MapPin, Plus, Zap, Users, User as UserProfile, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { useRideStore } from "@/features/ride/store/useRideStore";
import { useMapLogic } from "@/features/map/hooks/useMapLogic";
import api from "@/lib/axios";
import toast from "react-hot-toast";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
  ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

export function DriverView({ user, isNotificationsOpen, setIsNotificationsOpen }: any) {
  const rideState = useRideStore();
  const mapLogic = useMapLogic();

  const {
    userLoc,
    driverDest,
    isDriverTripActive,
    seatsAvailable,
    bookedCount,
    setSeatsAvailable,
    setIsDriverTripActive,
    incomingCarpoolRequests
  } = rideState;

  const handleStartDriverTrip = async () => {
    if (!driverDest.coords || !user) {
        toast.error("Please select a destination first");
        return;
    }
    try {
        const rideId = `POOL-${Date.now()}`;
        await api.post('/rides/create-pool', {
            rideId,
            pickup: { lat: userLoc?.[0], lng: userLoc?.[1], label: "Current Location" },
            drop: { lat: driverDest.coords[0], lng: driverDest.coords[1], label: driverDest.query },
            price: 150 * seatsAvailable,
            pricePerSeat: 150,
            distance: 5,
            duration: 10,
            availableSeats: seatsAvailable,
            departureTime: new Date(Date.now() + 15 * 60000).toISOString()
        });
        
        setIsDriverTripActive(true);
        toast.success("Trip activated! Looking for riders.");
    } catch (err) {
        toast.error("Failed to start trip");
    }
  };

  return (
    <>
      <div className="absolute inset-0 z-0">
         <MapComponent userLoc={userLoc} passengerLoc={userLoc} stops={driverDest.coords ? [driverDest.coords] : []} onLocate={mapLogic.handleLocate} onRouteInfo={() => {}} />
      </div>

      <div className="absolute top-10 left-10 z-30 w-[440px] pointer-events-none flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden flex flex-col relative z-20 pointer-events-auto transition-all p-7">
           <h3 className="text-[28px] font-black text-[#0A192F] mb-6 tracking-tight">Share My Ride</h3>
           
           <div className="relative flex flex-col gap-4">
              <div className="absolute left-[23px] top-[26px] bottom-[26px] w-[3px] bg-slate-200" />
              
              <div className="relative flex items-center gap-4 z-10">
                 <div className="w-[12px] h-[12px] bg-black rounded-full shrink-0 ml-[17px]" />
                 <div className="flex-1 bg-slate-100/80 rounded-xl px-4 h-[50px] flex items-center shrink-0 border border-transparent">
                    <input className="w-full bg-transparent border-none outline-none text-[#000000] font-bold text-[15px] placeholder:text-slate-500" value="Current Location" readOnly disabled />
                 </div>
              </div>

              <div className="relative flex items-center gap-4 z-10">
                 <div className="w-[14px] h-[14px] bg-white border-[3px] border-black shrink-0 ml-[16px]" />
                 <div className="flex-1 bg-slate-100/80 rounded-xl px-4 h-[50px] flex items-center focus-within:bg-slate-200/80 focus-within:border-slate-300 transition-all shrink-0 border border-transparent">
                    <input 
                       className="w-full bg-transparent border-none outline-none text-[#000000] font-bold text-[15px] placeholder:text-slate-500" 
                       placeholder="Where are you heading?" 
                       value={driverDest.query || ''} 
                       onChange={(e) => mapLogic.handleDriverInputChange(e.target.value, setIsDriverTripActive)}
                    />
                 </div>
              </div>
           </div>

           {driverDest.showSuggestions && driverDest.suggestions?.length > 0 && (
              <div className="mt-5 border border-slate-100 bg-white rounded-2xl max-h-[250px] overflow-y-auto w-full custom-scrollbar shadow-lg relative z-20">
                 {driverDest.suggestions.map((sug: any, idx: number) => (
                    <button key={idx} onClick={() => mapLogic.selectDriverSuggestion(sug)} className="w-full px-5 py-3 text-left flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                       <div className="w-9 h-9 bg-slate-100 rounded-full flex justify-center items-center text-slate-500 group-hover:text-black transition-colors shrink-0">
                          <MapPin className="w-4 h-4" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="font-bold text-[14px] text-black truncate">{sug.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{sug.city || sug.country}</p>
                       </div>
                    </button>
                 ))}
              </div>
           )}

           {!isDriverTripActive && (
             <div className="mt-8 pt-6 border-t border-slate-100">
               <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 shadow-inner mx-0">
                  <button onClick={() => { rideState.setVehicleType('go'); setSeatsAvailable(4); }} className={`flex-1 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${rideState.vehicleType !== 'bike' ? 'bg-white shadow-md text-[#0A192F]' : 'text-slate-400 hover:text-slate-600'}`}>Car</button>
                  <button onClick={() => { rideState.setVehicleType('bike'); setSeatsAvailable(1); }} className={`flex-1 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${rideState.vehicleType === 'bike' ? 'bg-[#FFD700] shadow-md text-[#0A192F]' : 'text-slate-400 hover:text-slate-600'}`}>Bike</button>
               </div>

               <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="font-black text-[#0A192F] text-[17px]">Available Seats</p>
                    <p className="text-[13px] font-bold text-slate-400 mt-0.5">Maximize your earnings</p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-100 rounded-2xl px-2 py-1.5 border border-slate-200">
                     <button onClick={() => setSeatsAvailable(Math.max(1, seatsAvailable - 1))} className="w-10 h-10 flex items-center justify-center text-[#0A192F] hover:bg-white rounded-[10px] transition-colors shadow-sm"><span className="text-2xl font-black mt-[-4px]">-</span></button>
                     <span className="text-xl font-black w-4 text-center text-[#0A192F]">{seatsAvailable}</span>
                     <button onClick={() => setSeatsAvailable(Math.min(rideState.vehicleType === 'bike' ? 1 : 6, seatsAvailable + 1))} className={`w-10 h-10 flex items-center justify-center text-[#0A192F] rounded-[10px] transition-colors shadow-sm ${rideState.vehicleType === 'bike' && seatsAvailable >= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`} disabled={rideState.vehicleType === 'bike' && seatsAvailable >= 1}><Plus className="w-5 h-5" /></button>
                  </div>
               </div>
               <button onClick={handleStartDriverTrip} className="w-full py-5 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-[20px] font-black text-[15px] uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50">
                   Start Shared Ride
               </button>
             </div>
           )}
        </div>
      </div>

      {isDriverTripActive && (
         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-[440px] pointer-events-none flex flex-col justify-end">
            <div className="bg-[#0A192F]/95 backdrop-blur-3xl text-white rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-8 border border-[#FFD700]/20 pointer-events-auto shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl -mr-10 -mt-20" />
               <div className="flex items-center gap-5 mb-8 relative z-10 border-b border-white/10 pb-6">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 relative shrink-0">
                     <div className="absolute inset-0 rounded-2xl border border-[#FFD700]/40 animate-ping" />
                     <Compass className="w-7 h-7 text-[#FFD700] animate-pulse" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white tracking-tight mb-1">Looking for riders</h3>
                     <p className="font-black text-[#FFD700] text-[12px] tracking-widest uppercase">{seatsAvailable} SEAT{seatsAvailable > 1 ? 'S' : ''} AVAILABLE</p>
                  </div>
               </div>
               
               {incomingCarpoolRequests?.length > 0 ? (
                  <div className="flex flex-col gap-3">
                     {/* Incoming requests mapped here */}
                     <p className="text-sm font-bold text-slate-300">Requests parsing...</p>
                  </div>
               ) : (
                  <div className="bg-white/5 border border-white/10 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 relative z-10 text-center">
                     <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center">
                        <Users className="text-slate-400 w-6 h-6" />
                     </div>
                     <p className="text-[15px] font-bold text-slate-300">Matching with passengers securely along your chosen route...</p>
                  </div>
               )}
               
               <button onClick={() => setIsDriverTripActive(false)} className="w-full mt-6 py-5 relative z-10 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] transition-all">Cancel Trip</button>
            </div>
         </div>
      )}
    </>
  );
}
