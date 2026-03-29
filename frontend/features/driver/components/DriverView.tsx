import { useEffect, useState } from "react";
import { Wallet, IndianRupee, Bell, HelpCircle, Navigation, Compass, MapPin, Plus, Zap, Users, User as UserProfile, Clock, Star, ShieldCheck, MessageCircle } from "lucide-react";
import { ChatModal } from "@/features/chat/components/ChatModal";
import dynamic from "next/dynamic";
import { useRideStore } from "@/features/ride/store/useRideStore";
import { useMapLogic } from "@/features/map/hooks/useMapLogic";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { socket, connectSocket } from "@/lib/socket";

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
      incomingCarpoolRequests,
      unreadChatMessages
   } = rideState;

   const [isChatOpen, setIsChatOpen] = useState(false);
   const [chatReceiver, setChatReceiver] = useState<any>(null);

   useEffect(() => {
      if (!user) return;

      connectSocket();
      socket.emit("join", {
         userId: user.id || user._id,
         role: "DRIVER"
      });
   }, [user?.id, user?._id]);

   useEffect(() => {
      if (!userLoc) {
         mapLogic.handleLocate();
      }
   }, [userLoc]);

   useEffect(() => {
      if (!user || !userLoc) return;

      socket.emit("driver-online", {
         driverId: user.id || user._id,
         location: { lat: userLoc[0], lng: userLoc[1] },
         name: user.name,
         profilePhoto: user.profilePhoto,
         rating: user?.rating ,
         vehicleType: (user as any).vehicleType || rideState.vehicleType || "go",
         isCarpool: true
      });

   }, [user?.id, user?._id, user?.name, user?.profilePhoto, user?.rating, userLoc, rideState.vehicleType]);

   const handleStartDriverTrip = async () => {
      if (!driverDest.coords || !user) {
         toast.error("Please select a destination first");
         return;
      }

      if (!userLoc || userLoc.length < 2 || !userLoc[0] || !userLoc[1]) {
         toast.error("Still identifying your current location. Please wait a moment.");
         mapLogic.handleLocate();
         return;
      }

      console.log("🚀 Starting Shared Ride with coords:", { pickup: userLoc, drop: driverDest.coords });

      try {
         const rideId = `POOL-${Date.now()}`;
         const isBike = rideState.vehicleType === 'bike';
         const perSeat = isBike ? 40 : 100;
         const totalFare = perSeat * seatsAvailable;
         const distance = rideState.routeInfo?.distance || 5;

         const response = await api.post('/rides/create-pool', {
            rideId,
            pickup: { lat: userLoc[0], lng: userLoc[1], label: "Current Location" },
            drop: { lat: driverDest.coords[0], lng: driverDest.coords[1], label: driverDest.query },
            price: totalFare,
            pricePerSeat: perSeat,
            distance,
            duration: rideState.routeInfo?.duration || 10,
            availableSeats: seatsAvailable,
            departureTime: new Date(Date.now() + 15 * 60000).toISOString(),
            vehicleType: rideState.vehicleType || "go"
         });

         rideState.setActiveRide(response.data);
         setIsDriverTripActive(true);
         socket.emit("join-ride", { driverId: user.id || user._id, rideId: response.data.rideId || response.data._id });
         toast.success("Trip activated! Looking for riders.");
      } catch (err: any) {
         console.error("❌ Driver trip activation error:", err);
         toast.error(err.response?.data?.message || "Failed to start trip");
      }
   };

   return (
      <>
         <div className="absolute inset-0 z-0">
            <MapComponent 
               userLoc={userLoc} 
               passengerLoc={userLoc} 
               stops={driverDest.coords ? [driverDest.coords] : []} 
               onLocate={mapLogic.handleLocate} 
               onRouteInfo={(dist: number, dur: number) => rideState.setRouteInfo({ distance: dist, duration: dur })} 
            />
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
                        <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                           {rideState.activeRide?.status === "ARRIVED" ? "At Pickup Point" :
                              rideState.activeRide?.status === "STARTED" ? "Trip in Progress" :
                                 (rideState.activeRide?.passengers?.length > 0) ? "Heading to Pickup" : "Looking for riders"}
                        </h3>
                        <p className="font-black text-[#FFD700] text-[12px] tracking-widest uppercase">
                           {rideState.activeRide?.availableSeats !== undefined ? rideState.activeRide.availableSeats : seatsAvailable} SEAT{(rideState.activeRide?.availableSeats ?? seatsAvailable) > 1 ? 'S' : ''} AVAILABLE
                        </p>
                     </div>
                  </div>

                  {(incomingCarpoolRequests?.length > 0 || (rideState.activeRide?.passengers?.length > 0)) ? (
                     <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
                        {/* Confirmed Passengers List */}
                        {rideState.activeRide?.passengers?.map((p: any, idx: number) => (
                           <div key={`p-${idx}`} className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-[24px] p-5 flex items-center justify-between group transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#0A192F]/10 shadow-sm">
                                    {(() => {
                                       const rawPhoto = p.photo || p.profilePhoto;
                                       const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
                                       let finalSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "P")}&background=FFD700&color=0A192F&bold=true`;
                                       
                                       if (rawPhoto) {
                                          if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) {
                                             finalSrc = rawPhoto;
                                          } else {
                                             finalSrc = `${baseUrl}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
                                          }
                                       }
                                       return <img src={finalSrc} alt="P" className="w-full h-full object-cover" />;
                                    })()}
                                 </div>
                                 <div className="text-left">
                                    <p className="font-black text-white text-base leading-tight">{p.name || "Confirmed Passenger"}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                       <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest bg-[#0A192F] px-2 py-0.5 rounded-md">Confirmed • {p.seats} Seat{p.seats > 1 ? 's' : ''}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                   onClick={() => {
                                     setChatReceiver({ id: p.userId?._id || p.userId, name: p.name });
                                     setIsChatOpen(true);
                                   }}
                                   className="w-10 h-10 bg-[#FFD700] text-[#0A192F] rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 relative"
                                 >
                                   <MessageCircle className="w-5 h-5" />
                                   {(() => {
                                      const passengerId = p.userId?._id || p.userId;
                                      const chatKey = `${rideState.activeRide?.rideId || rideState.activeRide?._id || ""}_${[String(user?.id || user?._id), String(passengerId)].sort().join("_")}`;
                                      const unreadCount = unreadChatMessages[chatKey] || 0;
                                      if (unreadCount > 0) return (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white shadow-xl animate-bounce font-black">
                                          {unreadCount}
                                        </span>
                                      );
                                      return null;
                                   })()}
                                 </button>
                                 <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                                    <ShieldCheck className="w-4 h-4" />
                                 </div>
                              </div>
                           </div>
                        ))}

                        {/* Incoming requests (existing code) */}
                        {incomingCarpoolRequests.map((req: any, idx: number) => (
                           <div key={`req-${idx}`} className="bg-white/5 border border-white/10 rounded-[24px] p-5 flex flex-col gap-4 group transition-all hover:bg-white/10 active:scale-[0.98]">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#FFD700]/30 shadow-lg">
                                    {(() => {
                                       const rawPhoto = req.passengerPhoto || req.photo || req.profilePhoto;
                                       const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
                                       let finalSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.name || "P")}&background=FFD700&color=0A192F&bold=true`;
                                       
                                       if (rawPhoto) {
                                          if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) {
                                             finalSrc = rawPhoto;
                                          } else {
                                             finalSrc = `${baseUrl}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
                                          }
                                       }
                                       return <img src={finalSrc} alt="Req" className="w-full h-full object-cover" />;
                                    })()}
                                 </div>
                                    <div className="text-left">
                                       <p className="font-black text-white text-base leading-tight">{req.name || "New Passenger"}</p>
                                       <div className="flex items-center gap-1.5 mt-1">
                                          <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />
                                          <span className="text-[10px] font-black text-[#FFD700]">4.9 • {req.seats} Seat{req.seats > 1 ? 's' : ''}</span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wants to Join</p>
                                 </div>
                              </div>

                              <div className="flex gap-2">
                                 <button
                                    onClick={() => {
                                       socket.emit("carpool:join:accept", {
                                          rideId: rideState.activeRide?.rideId || req.rideId,
                                          userId: req.userId,
                                          name: req.name,
                                          photo: req.photo || req.passengerPhoto, // Include photo
                                          seats: req.seats,
                                          passengerSocketId: req.passengerSocketId,
                                          paymentMethod: req.paymentMethod
                                       });
                                       rideState.setIncomingCarpoolRequests((prev: any[]) => prev.filter((r) => r.userId !== req.userId));
                                    }}
                                    className="flex-1 py-3 bg-[#FFD700] hover:bg-yellow-400 text-[#0A192F] rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg"
                                 >
                                    Accept & Add
                                 </button>
                                 <button
                                    onClick={() => {
                                       socket.emit("carpool:join:reject", {
                                          rideId: rideState.activeRide?.rideId || req.rideId,
                                          userId: req.userId,
                                          passengerSocketId: req.passengerSocketId
                                       });
                                       rideState.setIncomingCarpoolRequests((prev: any[]) => prev.filter((r) => r.userId !== req.userId));
                                       toast.error("Request declined");
                                    }}
                                    className="px-5 py-3 bg-white/10 hover:bg-rose-500/20 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                                 >
                                    Decline
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="bg-white/5 border border-white/10 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 relative z-10 text-center">
                        <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center">
                           <Users className="text-slate-400 w-6 h-6" />
                        </div>
                        <p className="text-[15px] font-bold text-slate-300">Matching with passengers securely along your chosen route...</p>
                     </div>
                  )}

                                 {/* Status Control Buttons - Premium Implementation */}
                  <div className="flex flex-col gap-3 mt-6 relative z-10 font-sans">
                     {(!rideState.activeRide?.status || ["OPEN", "ACCEPTED", "CONFIRMED", "MATCHED", "FULL"].includes(rideState.activeRide.status)) && (
                        <button
                           onClick={() => {
                              const rideId = rideState.activeRide?.rideId || rideState.activeRide?._id;
                              if (!rideId) return toast.error("No active ride found");
                              socket.emit("update-ride-status", { rideId, status: "ARRIVED", driverId: user.id });
                              rideState.setActiveRide((prev: any) => ({ ...prev, status: "ARRIVED" }));
                              toast.success("Updated: Arrived at Pickup!");
                           }}
                           className="w-full py-4 bg-[#FFD700] hover:bg-yellow-400 text-[#0A192F] rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] shadow-xl shadow-[#FFD700]/10 flex items-center justify-center gap-3 active:scale-95"
                        >
                           <MapPin className="w-5 h-5" />
                           Im at Pickup Point
                        </button>
                     )}

                     {rideState.activeRide?.status === "ARRIVED" && (
                        <button
                           onClick={() => {
                              const rideId = rideState.activeRide?.rideId || rideState.activeRide?._id;
                              if (!rideId) return toast.error("No active ride found");
                              socket.emit("update-ride-status", { rideId, status: "STARTED", driverId: user.id });
                              rideState.setActiveRide((prev: any) => ({ ...prev, status: "STARTED" }));
                              toast.success("Trip officially started!");
                           }}
                           className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95"
                        >
                           <Zap className="w-5 h-5" />
                           Begin Journey
                        </button>
                     )}

                     {rideState.activeRide?.status === "STARTED" && (
                        <button
                           onClick={() => {
                              const rideId = rideState.activeRide?.rideId || rideState.activeRide?._id;
                              if (!rideId) return toast.error("No active ride found");
                              socket.emit("update-ride-status", { rideId, status: "COMPLETED", driverId: user.id });
                              rideState.resetRideState();
                              setIsDriverTripActive(false);
                              toast.success("Ride completed successfully!");
                           }}
                           className="w-full py-4 bg-white hover:bg-slate-50 text-[#0A192F] rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3 active:scale-95 border border-slate-200"
                        >
                           <ShieldCheck className="w-5 h-5" />
                           Complete Ride
                        </button>
                     )}
                  </div>

                  <button
                     onClick={() => { setIsDriverTripActive(false); rideState.resetRideState(); }}
                     className="w-full mt-4 py-4 relative z-10 bg-transparent hover:bg-rose-500/10 border border-white/10 text-slate-400 hover:text-rose-500 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
                  >
                     Cancel Entire Trip
                  </button>
               </div>
            </div>
         )}
       {isChatOpen && chatReceiver && (
         <ChatModal 
           isOpen={isChatOpen}
           onClose={() => setIsChatOpen(false)}
           rideId={rideState.activeRide?.rideId || rideState.activeRide?._id || ""}
           userId={user?.id || user?._id || ""}
           receiverId={chatReceiver.id}
           receiverName={chatReceiver.name}
           senderName={user.firstName ? `${user.firstName} ${user.lastName}` : (user.name || "Driver")}
         />
       )}
      </>
   );
}
