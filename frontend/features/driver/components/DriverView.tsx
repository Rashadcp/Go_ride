import { useEffect, useMemo, useState } from "react";
import { Wallet, IndianRupee, Bell, HelpCircle, Navigation, Compass, MapPin, Plus, Zap, Users, User as UserProfile, Clock, Star, ShieldCheck, MessageCircle, CheckCircle2, XCircle, TimerReset } from "lucide-react";
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
   const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
   const [processingPassengerId, setProcessingPassengerId] = useState<string | null>(null);
   const [localConfirmedPassengers, setLocalConfirmedPassengers] = useState<any[]>([]);

   const resolveProfileImage = (rawPhoto: string | undefined, name: string) => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

      if (!rawPhoto) {
         return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "P")}&background=FFD700&color=0A192F&bold=true`;
      }

      if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) {
         return rawPhoto;
      }

      return `${baseUrl}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
   };

   const pendingRequests = useMemo(() => {
      const uniqueRequests = new Map<string, any>();

      (incomingCarpoolRequests || []).forEach((request: any, index: number) => {
         const key = String(request.userId || request.passengerSocketId || index);
         if (!uniqueRequests.has(key)) {
            uniqueRequests.set(key, request);
         }
      });

      return Array.from(uniqueRequests.values());
   }, [incomingCarpoolRequests]);

   const ridePassengers = Array.isArray(rideState.activeRide?.passengers) ? rideState.activeRide.passengers : [];
   const confirmedPassengers = (ridePassengers.length > 0 ? ridePassengers : localConfirmedPassengers).filter(
      (p: any) => String(p?.tripStatus || "ACCEPTED").toUpperCase() !== "COMPLETED"
   );
   const displayedAvailableSeats = rideState.activeRide?.availableSeats ?? Math.max(0, seatsAvailable - confirmedPassengers.reduce((sum: number, p: any) => sum + Number(p?.seats || 1), 0));

   useEffect(() => {
      if (!rideState.activeRide) {
         setLocalConfirmedPassengers((prev) => (prev.length > 0 ? [] : prev));
         return;
      }

      if (ridePassengers.length === 0) {
         return;
      }

      setLocalConfirmedPassengers((prev) => {
         const isSame =
            prev.length === ridePassengers.length &&
            prev.every((entry: any, index: number) => {
               const nextEntry = ridePassengers[index];
               return (
                  String(entry?.userId?._id || entry?.userId || "") === String(nextEntry?.userId?._id || nextEntry?.userId || "") &&
                  String(entry?.tripStatus || "ACCEPTED") === String(nextEntry?.tripStatus || "ACCEPTED") &&
                  Number(entry?.seats || 1) === Number(nextEntry?.seats || 1)
               );
            });

         return isSame ? prev : ridePassengers;
      });
   }, [rideState.activeRide, ridePassengers]);

   const handleAcceptJoinRequest = (req: any) => {
      const requestKey = String(req.userId || req.passengerSocketId);
      setProcessingRequestId(requestKey);

      // Remove the request card immediately so the host UI feels instant.
      rideState.setIncomingCarpoolRequests((prev: any[]) =>
         prev.filter((r) => String(r.userId || r.passengerSocketId) !== requestKey)
      );

      setLocalConfirmedPassengers((prev: any[]) => {
         const alreadyAdded = prev.some(
            (passenger: any) => String(passenger.userId?._id || passenger.userId || "") === String(req.userId)
         );
         if (alreadyAdded) return prev;

         return [
            ...prev,
            {
               userId: req.userId,
               name: req.name,
               photo: req.photo || req.passengerPhoto || req.profilePhoto,
               seats: req.seats || 1,
               tripStatus: "ACCEPTED",
               paymentMethod: req.paymentMethod || "CASH",
               joinedAt: new Date().toISOString()
            }
         ];
      });

      rideState.setActiveRide((prev: any) => {
         if (!prev) return prev;

         const existingPassengers = Array.isArray(prev.passengers) ? prev.passengers : [];
         const alreadyAdded = existingPassengers.some(
            (passenger: any) => String(passenger.userId?._id || passenger.userId || "") === String(req.userId)
         );

         if (alreadyAdded) {
            return prev;
         }

         const nextAvailableSeats = Math.max(0, Number(prev.availableSeats ?? seatsAvailable) - Number(req.seats || 1));

         return {
            ...prev,
            passengers: [
               ...existingPassengers,
               {
                  userId: req.userId,
                  name: req.name,
                  photo: req.photo || req.passengerPhoto || req.profilePhoto,
                  seats: req.seats || 1,
                  tripStatus: "ACCEPTED",
                  paymentMethod: req.paymentMethod || "CASH",
                  joinedAt: new Date().toISOString()
               }
            ],
            availableSeats: nextAvailableSeats,
            status: nextAvailableSeats === 0 ? "FULL" : prev.status
         };
      });

      toast.success(`${req.name || "Passenger"} added to your ride`);

      socket.emit("carpool:join:accept", {
         rideId: rideState.activeRide?.rideId || req.rideId,
         userId: req.userId,
         name: req.name,
         photo: req.photo || req.passengerPhoto,
         seats: req.seats,
         passengerSocketId: req.passengerSocketId,
         paymentMethod: req.paymentMethod,
         seatId: req.seatId,
         pickupLabel: req.pickupLabel,
         pickup: req.pickup,
         dropLabel: req.dropLabel,
         drop: req.drop || req.destination, // Standardize on drop/destination
         distance: req.distance
      });

      setProcessingRequestId(null);
   };

   const handleRejectJoinRequest = (req: any) => {
      const requestKey = String(req.userId || req.passengerSocketId);
      setProcessingRequestId(requestKey);

      // Drop the card from the queue before the socket round-trip.
      rideState.setIncomingCarpoolRequests((prev: any[]) =>
         prev.filter((r) => String(r.userId || r.passengerSocketId) !== requestKey)
      );

      toast.error("Request declined");

      socket.emit("carpool:join:reject", {
         rideId: rideState.activeRide?.rideId || req.rideId,
         userId: req.userId,
         passengerSocketId: req.passengerSocketId
      });

      setProcessingRequestId(null);
   };

   const handleEndPassengerTrip = (passenger: any) => {
      const passengerId = String(passenger.userId?._id || passenger.userId || "");
      if (!passengerId) return;

      setProcessingPassengerId(passengerId);
      socket.emit("carpool:passenger:end", {
         rideId: rideState.activeRide?.rideId || rideState.activeRide?._id,
         userId: passengerId
      });
      setProcessingPassengerId(null);
      toast.success(`${passenger.name || "Passenger"} marked as dropped off`);
   };

   const getPassengerTripAction = (passenger: any) => {
      const tripStatus = passenger.tripStatus || "ACCEPTED";

      if (tripStatus === "ARRIVED") {
         return {
            label: "Started",
            className: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400/20",
            nextStatus: "STARTED" as const
         };
      }

      if (tripStatus === "STARTED") {
         return {
            label: "End",
            className: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border-rose-400/20",
            nextStatus: "COMPLETED" as const
         };
      }

      return {
         label: "Reached",
         className: "bg-[#FFD700] hover:bg-yellow-400 text-[#0A192F] border-[#FFD700]/20",
         nextStatus: "ARRIVED" as const
      };
   };

   const handlePassengerTripProgress = (passenger: any) => {
      const passengerId = String(passenger.userId?._id || passenger.userId || "");
      const rideId = rideState.activeRide?.rideId || rideState.activeRide?._id;
      if (!passengerId || !rideId) return;

      const action = getPassengerTripAction(passenger);

      if (action.nextStatus === "COMPLETED") {
         handleEndPassengerTrip(passenger);
         return;
      }

      socket.emit("carpool:passenger:status", {
         rideId,
         userId: passengerId,
         status: action.nextStatus
      });

      rideState.setActiveRide((prev: any) => {
         if (!prev) return prev;
         return {
            ...prev,
            passengers: (prev.passengers || []).map((entry: any) =>
               String(entry.userId?._id || entry.userId || "") === passengerId
                  ? { ...entry, tripStatus: action.nextStatus }
                  : entry
            )
         };
      });

      setLocalConfirmedPassengers((prev: any[]) =>
         prev.map((entry: any) =>
            String(entry.userId?._id || entry.userId || "") === passengerId
               ? { ...entry, tripStatus: action.nextStatus }
               : entry
         )
      );

      toast.success(`${passenger.name || "Passenger"} marked as ${action.label.toLowerCase()}`, { id: "ride-status" });
   };

   useEffect(() => {
      if (!user) return;

      connectSocket();
      socket.emit("join", {
         userId: user.id || user._id,
         role: "DRIVER"
      });

      // Host needs this to render pending passenger cards.
      // Backend emits `carpool:join:new_request` to `driver:${ride.driverId}`.
      const handleCarpoolJoinNewRequest = (data: any) => {
         const incoming = data || {};
         if (!incoming.rideId) return;

         rideState.setIncomingCarpoolRequests((prev: any[]) => {
            const requestKey = String(incoming.userId || incoming.passengerSocketId || incoming.id || incoming._id || "");
            if (!requestKey) return prev;

            const alreadyExists = prev.some((r: any) => {
               const rKey = String(r.userId || r.passengerSocketId || r.id || r._id || "");
               return rKey && rKey === requestKey;
            });
            if (alreadyExists) return prev;

            return [...prev, incoming];
         });

         toast.success(`New passenger request received`);
      };

      const handleRideUpdate = (updatedRide: any) => {
         const currentRide = useRideStore.getState().activeRide;
         if (!currentRide) return;

         const currentRideId = currentRide.rideId || currentRide._id;
         const updatedRideId = updatedRide?.rideId || updatedRide?._id;

         if (String(currentRideId) === String(updatedRideId)) {
            useRideStore.getState().setActiveRide((prev: any) => ({ ...(prev || {}), ...updatedRide }));
         }
      };

      socket.on("ride:update", handleRideUpdate);
      socket.on("carpool:join:new_request", handleCarpoolJoinNewRequest);

      return () => {
         socket.off("ride:update", handleRideUpdate);
         socket.off("carpool:join:new_request", handleCarpoolJoinNewRequest);
      };
   }, [user?.id, user?._id]);

   const handleEndDriverTrip = async () => {
      try {
         if (rideState.activeRide?.rideId || rideState.activeRide?._id) {
             socket.emit("driver:session:end", { 
                rideId: rideState.activeRide.rideId || rideState.activeRide._id, 
                driverId: user.id || user._id
             });
         }
         rideState.resetRideState();
         toast.success("Driving session ended. Going offline.");
      } catch (err) {
         toast.error("Failed to end driving session.");
      }
   };

   const handleCancelDriverTrip = async () => {
      if (!confirm("Are you sure you want to cancel this entire carpool trip? All passengers will be notified.")) return;
      
      try {
          if (rideState.activeRide?.rideId || rideState.activeRide?._id) {
              socket.emit("carpool:ride:cancel", { 
                 rideId: rideState.activeRide.rideId || rideState.activeRide._id, 
                 driverId: user.id || user._id
              });
          }
          rideState.resetRideState();
          toast.error("Trip cancelled. You are now offline.");
      } catch (err) {
          toast.error("Failed to cancel trip.");
      }
   };

   useEffect(() => {
      if (!userLoc) {
         mapLogic.handleLocate();
      }
   }, [userLoc]);

   // Throttling socket updates for general availability
   const [lastSentLoc, setLastSentLoc] = useState<[number, number] | null>(null);

   useEffect(() => {
      const dId = user?.id || user?._id;
      if (!dId || !userLoc || !isDriverTripActive) return;

      // Distance check (threshold: 5 meters approx)
      if (lastSentLoc) {
         const dist = Math.sqrt(
            Math.pow(userLoc[0] - lastSentLoc[0], 2) + 
            Math.pow(userLoc[1] - lastSentLoc[1], 2)
         );
         // 0.00005 deg is roughly 5-6 meters
         if (dist < 0.00005 && rideState.activeRide?.status === "OPEN") return;
      }

      const locPayload = { lat: userLoc[0], lng: userLoc[1] };

      // General availability update (so nearby passengers see them moving)
      socket.emit("driver-online", {
         driverId: dId,
         location: locPayload,
         name: user.name,
         profilePhoto: user.profilePhoto,
         rating: user?.rating,
         vehicleType: rideState.vehicleType || (user as any).vehicleType || "go",
         isCarpool: true
      });

      setLastSentLoc(userLoc);

      // Specific live trip tracking update (so current passenger sees them moving)
      if (rideState.activeRide) {
         socket.emit("driver:location:update", {
            driverId: dId,
            location: locPayload
         });
      }

   }, [user?.id, user?._id, user?.name, user?.profilePhoto, user?.rating, userLoc, rideState.vehicleType, rideState.activeRide, lastSentLoc, isDriverTripActive]);

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
         toast.success("Trip activated! Looking for riders.", { id: 'ride-status' });
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

         <div className="absolute top-20 lg:top-10 left-4 lg:left-10 right-4 lg:right-auto z-30 lg:w-[440px] pointer-events-none flex flex-col gap-4 lg:gap-6">
            <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden flex flex-col relative z-20 pointer-events-auto transition-all p-5 sm:p-6 lg:p-7">
               <h3 className="text-[24px] sm:text-[28px] font-black text-[#0A192F] mb-5 sm:mb-6 tracking-tight">Share My Ride</h3>

               <div className="relative flex flex-col gap-4">
                  <div className="absolute left-[23px] top-[26px] bottom-[26px] w-[3px] bg-slate-200" />

                  <div className="relative flex items-center gap-3 sm:gap-4 z-10">
                     <div className="w-[12px] h-[12px] bg-black rounded-full shrink-0 ml-[17px]" />
                     <div className="flex-1 bg-slate-100/80 rounded-xl px-4 h-[50px] flex items-center shrink-0 border border-transparent">
                        <input className="w-full bg-transparent border-none outline-none text-[#000000] font-bold text-[15px] placeholder:text-slate-500" value="Current Location" readOnly disabled />
                     </div>
                  </div>

                  <div className="relative flex items-center gap-3 sm:gap-4 z-10">
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
                           <p className="font-black text-[#0A192F] text-[17px]">Empty Seats</p>
                           <p className="text-[13px] font-bold text-slate-400 mt-0.5">Fill your car to earn more</p>
                        </div>
                        {rideState.vehicleType !== 'bike' && (
                           <div className="flex items-center gap-4 bg-slate-100 rounded-2xl px-2 py-1.5 border border-slate-200">
                              <button onClick={() => setSeatsAvailable(Math.max(1, seatsAvailable - 1))} className="w-10 h-10 flex items-center justify-center text-[#0A192F] hover:bg-white rounded-[10px] transition-colors shadow-sm"><span className="text-2xl font-black mt-[-4px]">-</span></button>
                              <span className="text-xl font-black w-4 text-center text-[#0A192F]">{seatsAvailable}</span>
                              <button onClick={() => setSeatsAvailable(Math.min(6, seatsAvailable + 1))} className="w-10 h-10 flex items-center justify-center text-[#0A192F] rounded-[10px] transition-colors shadow-sm hover:bg-white"><Plus className="w-5 h-5" /></button>
                           </div>
                        )}
                     </div>
                     <button onClick={handleStartDriverTrip} className="w-full py-5 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-[20px] font-black text-[15px] uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50">
                        Start Driving Now
                     </button>
                  </div>
               )}
            </div>
         </div>

         {isDriverTripActive && (
            <div className="absolute bottom-24 lg:bottom-10 left-4 lg:left-1/2 right-4 lg:right-auto lg:-translate-x-1/2 z-30 lg:w-[440px] pointer-events-none flex flex-col justify-end">
               <div className="bg-[#0A192F]/95 backdrop-blur-3xl text-white rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-5 sm:p-6 lg:p-8 border border-[#FFD700]/20 pointer-events-auto shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl -mr-10 -mt-20" />
                  <div className="flex items-start sm:items-center gap-3 sm:gap-5 mb-6 sm:mb-8 relative z-10 border-b border-white/10 pb-5 sm:pb-6">
                     <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl border border-[#FFD700]/40 animate-ping" />
                        <Compass className="w-7 h-7 text-[#FFD700] animate-pulse" />
                     </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
                            {rideState.activeRide?.status === "ARRIVED" ? "I Have Arrived" :
                               rideState.activeRide?.status === "STARTED" ? "Trip Started" :
                                  (confirmedPassengers.length > 0) ? "Passenger Pickup" : "Waiting for Riders"}
                         </h3>
                         <p className="font-black text-[#FFD700] text-[12px] tracking-widest uppercase">
                            {rideState.activeRide?.requestedVehicleType === 'bike' 
                               ? 'Bike Trip Live'
                               : `${displayedAvailableSeats} SEAT${displayedAvailableSeats > 1 ? 'S' : ''} AVAILABLE`
                            }
                         </p>
                      </div>
                      <button 
                         onClick={handleCancelDriverTrip}
                         className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 transition-all hover:bg-rose-500/20 active:scale-95"
                         title="Cancel Entire Trip"
                      >
                         <XCircle className="h-6 w-6" />
                      </button>
                  </div>

                  {(pendingRequests.length > 0 || confirmedPassengers.length > 0) ? (
                     <div className="flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pending</p>
                              <p className="mt-2 text-2xl font-black text-white">{pendingRequests.length}</p>
                           </div>
                           <div className="rounded-[20px] border border-[#FFD700]/20 bg-[#FFD700]/10 px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD700]">Onboard</p>
                              <p className="mt-2 text-2xl font-black text-white">{confirmedPassengers.length}</p>
                           </div>
                           <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Seats Left</p>
                              <p className="mt-2 text-2xl font-black text-white">{displayedAvailableSeats}</p>
                           </div>
                        </div>

                        {pendingRequests.length > 0 && (
                           <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                 <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#FFD700]">Join Requests</p>
                                 <div className="rounded-full border border-[#FFD700]/25 bg-[#FFD700]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD700]">
                                    {pendingRequests.length} waiting
                                 </div>
                              </div>

                              <div className="flex flex-col gap-2.5">
                                 {pendingRequests.map((req: any, idx: number) => {
                                    const requestKey = String(req.userId || req.passengerSocketId || idx);
                                    const isBusy = processingRequestId === requestKey;
                                    const seatsRequested = Number(req.seats || 1);
                                    const canAccept = (rideState.activeRide?.availableSeats ?? seatsAvailable) >= seatsRequested;

                                    return (
                                       <div key={`req-${requestKey}`} className="rounded-[20px] border border-white/10 bg-[#07111f]/90 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
                                          <div className="flex items-start gap-3">
                                             <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[16px] border-2 border-[#FFD700]/25 bg-white shadow-lg">
                                                <img
                                                   src={resolveProfileImage(req.passengerPhoto || req.photo || req.profilePhoto, req.name || "Passenger")}
                                                   alt={req.name || "Passenger"}
                                                   className="h-full w-full object-cover"
                                                />
                                                <div className="absolute -bottom-1 -right-1 rounded-full bg-[#FFD700] p-1 text-[#0A192F] shadow-lg">
                                                   <Users className="h-3 w-3" />
                                                </div>
                                             </div>

                                             <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                   <div>
                                                      <p className="truncate text-[15px] font-black text-white">{req.name || "New Passenger"}</p>
                                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                         <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-200">
                                                            {seatsRequested} seat{seatsRequested > 1 ? "s" : ""}
                                                         </span>
                                                         <span className="rounded-full bg-[#FFD700]/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#FFD700]">
                                                            {req.paymentMethod || "Cash"}
                                                         </span>
                                                         <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                                                            <Star className="h-3 w-3 fill-current" />
                                                            {(Number(req.rating) || 4.8).toFixed(1)}
                                                         </span>
                                                      </div>
                                                   </div>

                                                   <div className="rounded-xl border border-white/8 bg-white/5 px-2.5 py-1.5 text-right">
                                                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">Decision</p>
                                                      <p className="mt-0.5 text-[12px] font-black text-white">{canAccept ? "Ready" : "Full"}</p>
                                                   </div>
                                                </div>

                                                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                                   <button
                                                      onClick={() => handleAcceptJoinRequest(req)}
                                                      disabled={!canAccept || isBusy}
                                                      className="flex-1 rounded-xl bg-[#FFD700] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#0A192F] shadow-lg transition-all hover:scale-[1.01] hover:bg-yellow-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                                   >
                                                      <span className="flex items-center justify-center gap-2">
                                                         <CheckCircle2 className="h-4 w-4" />
                                                         Accept
                                                      </span>
                                                   </button>
                                                   <button
                                                      onClick={() => handleRejectJoinRequest(req)}
                                                      disabled={isBusy}
                                                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-rose-500/18 hover:text-rose-100 active:scale-95 disabled:opacity-40"
                                                   >
                                                      <span className="flex items-center justify-center gap-2">
                                                         <XCircle className="h-4 w-4" />
                                                         Decline
                                                      </span>
                                                   </button>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        )}

                        {confirmedPassengers.length > 0 && (
                           <div className="rounded-[28px] border border-[#FFD700]/20 bg-[#FFD700]/8 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                 <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#FFD700]">Confirmed Riders</p>
                                 <div className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                                    live onboard
                                 </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                 {confirmedPassengers.map((p: any, idx: number) => {
                                    const passengerId = String(p.userId?._id || p.userId || idx);
                                    const isEndingPassenger = processingPassengerId === passengerId;
                                    const tripAction = getPassengerTripAction(p);

                                    return (
                                    <div key={`p-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[18px] border border-[#FFD700]/12 bg-[#091322]/92 px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.14)] gap-3">
                                       <div className="flex min-w-0 items-center gap-2.5">
                                          <div className="h-9 w-9 overflow-hidden rounded-[12px] border border-white/10 bg-white shadow-sm shrink-0">
                                             <img
                                                src={resolveProfileImage(p.photo || p.profilePhoto || p.userId?.profilePhoto, p.name || p.userId?.name || "Passenger")}
                                                alt={p.name || p.userId?.name || "Passenger"}
                                                className="h-full w-full object-cover"
                                             />
                                          </div>
                                          <div className="min-w-0 text-left">
                                             <p className="truncate text-[13px] font-black text-white">{p.name || p.userId?.name || "Confirmed Passenger"}</p>
                                             <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                               <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-200">
                                                  {p.seats} seat{p.seats > 1 ? "s" : ""}
                                               </span>
                                                <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                                                   {(p.tripStatus || "ACCEPTED").toLowerCase()}
                                                </span>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                                          <button
                                             onClick={() => handlePassengerTripProgress(p)}
                                             disabled={isEndingPassenger}
                                             className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all active:scale-95 disabled:opacity-40 ${tripAction.className}`}
                                          >
                                             {tripAction.label}
                                          </button>
                                          <button
                                             onClick={() => {
                                                setChatReceiver({ id: p.userId?._id || p.userId, name: p.name });
                                                setIsChatOpen(true);
                                             }}
                                             className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD700] text-[#0A192F] shadow-lg transition-transform hover:scale-105 active:scale-95"
                                          >
                                             <MessageCircle className="w-4 h-4" />
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
                                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                                             <ShieldCheck className="w-3.5 h-3.5" />
                                          </div>
                                       </div>
                                    </div>
                                    );
                                 })}
                              </div>
                           </div>
                        )}
                     </div>
                  ) : (
                     <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] border border-white/10 rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 relative z-10 text-center">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                           <Users className="text-slate-400 w-6 h-6" />
                        </div>
                        <p className="text-[14px] font-bold text-slate-300">Waiting for riders</p>
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                           <TimerReset className="h-3.5 w-3.5" />
                           waiting live
                        </div>
                        <div className="w-full mt-2">
                           {(rideState.activeRide?.passengers?.length > 0) ? (
                              <button
                                 onClick={handleEndDriverTrip}
                                 className="px-6 py-4 bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-widest text-[11px] rounded-[22px] hover:bg-emerald-500/30 transition-all font-black border border-emerald-500/30 w-full flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 shadow-lg"
                              >
                                 <CheckCircle2 className="w-4 h-4" />
                                 Complete Session
                              </button>
                           ) : (
                              <button
                                 onClick={handleCancelDriverTrip}
                                 className="px-6 py-4 bg-rose-500/10 text-rose-300 font-bold uppercase tracking-widest text-[11px] rounded-[22px] hover:bg-rose-500/20 transition-all font-black border border-rose-500/20 w-full flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 shadow-sm"
                              >
                                 <XCircle className="w-4 h-4" />
                                 Cancel Trip
                              </button>
                           )}
                        </div>
                     </div>
                  )}

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
