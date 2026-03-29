import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import {
  Wallet, IndianRupee, Bell, HelpCircle, Navigation, Compass, MapPin, Plus,
  X, ArrowLeft, Loader2, GripVertical, Trash2, Car, Users, Star, XCircle, Bike, ShieldCheck, Banknote, CreditCard, QrCode, Phone, MessageSquare
} from "lucide-react";
import dynamic from "next/dynamic";

import { useRideStore } from "@/features/ride/store/useRideStore";
import { useMapLogic } from "@/features/map/hooks/useMapLogic";
import { useRideSocket } from "@/features/ride/hooks/useRideSocket";
import { socket } from "@/lib/socket";
import toast from "react-hot-toast";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center font-medium text-slate-400">Loading Map...</div>
});

const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;

export function PassengerView({ user, isNotificationsOpen, setIsNotificationsOpen }: any) {
  const rideState = useRideStore();
  const mapLogic = useMapLogic();
  const { handleCancelRide } = useRideSocket(user, false);

  const [isExpanding, setIsExpanding] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingStep, setRatingStep] = useState(1);

  const {
    userLoc, stops, routeInfo, activeRide,
    isSearchOpen, isRouteSearched, searchStarted,
    visibleNearbyDrivers, availableCarpools,
    loadingDrivers, isRequestingRide, dashboardStep,
    isSharedRide, vehicleType, paymentMethod, setPaymentMethod
  } = rideState;

  const [searchCountdown, setSearchCountdown] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRequestingRide && !activeRide) {
      setSearchCountdown(300); // 5 minutes countdown search
      interval = setInterval(() => {
        setSearchCountdown((prev: number | null) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            rideState.setIsRequestingRide(false);
            toast.error("No driver found. Please try again.");
            socket.emit("cancel-ride-request", { passengerId: user?.id || user?._id || "507f1f77bcf86cd799439011" });
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setSearchCountdown(null);
    }
    return () => clearInterval(interval);
  }, [isRequestingRide, activeRide]);

  const CAR_STYLES = [
    { id: 'bike', name: 'Bike', baseFare: 20, ratePerKm: 6, icon: Bike, desc: 'Fast & Affordable', time: '2 min', person: 1 },
    { id: 'auto', name: 'Auto Riksha', baseFare: 40, ratePerKm: 10, icon: Users, desc: 'Quick rides, no bargaining', time: '3 min', person: 3 },
    { id: 'go', name: 'Go', baseFare: 60, ratePerKm: 15, icon: Car, desc: 'Affordable, everyday rides', time: '5 min', person: 4 },
    { id: 'sedan', name: 'Sedan', baseFare: 80, ratePerKm: 20, icon: Car, desc: 'Extra legroom, premium', time: '6 min', person: 4 },
    { id: 'xl', name: 'XL', baseFare: 110, ratePerKm: 28, icon: Users, desc: 'Comfortable SUVs for groups', time: '8 min', person: 6 }
  ];

  const calculateFare = (vType: string) => {
    const style = CAR_STYLES.find(s => s.id === vType) || CAR_STYLES[2];
    const distance = routeInfo?.distance || 0;
    const finalFare = Math.max(style.baseFare, style.baseFare + (distance * style.ratePerKm));
    return Math.round(finalFare);
  };

  const estimatedRideFare = calculateFare(vehicleType);

  const handleRequestRide = () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    const currentFare = isSharedRide ? (vehicleType === 'bike' ? 40 : 100) : estimatedRideFare;
    if (paymentMethod === "WALLET" && (user.walletBalance || 0) < currentFare) {
      toast.error(`Insufficient wallet balance. You need at least Rs ${currentFare} to book this ride.`);
      return;
    }

    const dropLoc = stops.find((s: any) => s.id !== 'pickup') || stops[stops.length - 1];
    const pickupLoc = stops.find((s: any) => s.id === 'pickup');

    if (!dropLoc?.coords || !userLoc) {
      toast.error("Please ensure pick-up and destination are selected.");
      return;
    }

    if (isRequestingRide) return;

    rideState.setIsRequestingRide(true);

    const isBike = vehicleType === 'bike';
    const sharedFare = isBike ? 40 : 100;

    const payload = {
      passengerId: user.id || user._id || "507f1f77bcf86cd799439011",
      passengerName: user.firstName ? `${user.firstName} ${user.lastName}` : (user.name || "Passenger"),
      passengerPhoto: user.profilePhoto,
      pickup: pickupLoc?.coords
        ? { lat: pickupLoc.coords[0], lng: pickupLoc.coords[1], label: pickupLoc.query }
        : { lat: userLoc[0], lng: userLoc[1], label: "Current Location" },
      destination: { lat: dropLoc.coords[0], lng: dropLoc.coords[1], label: dropLoc.query },
      requestedVehicleType: isSharedRide ? "carpool" : vehicleType,
      isSharedRide,
      fare: isSharedRide ? sharedFare : estimatedRideFare,
      distance: routeInfo?.distance || 0,
      duration: routeInfo?.duration || 0,
      paymentMethod
    };

    socket.emit("ride-request", payload);
    toast.success("Searching for nearby drivers...");
  };

  const handleJoinCarpool = (rideId: string) => {
    const isBike = availableCarpools.find(p => p.rideId === rideId)?.vehicleType === 'bike';
    const sharedFare = isBike ? 40 : 100;

    if (paymentMethod === "WALLET" && (user.walletBalance || 0) < sharedFare) {
      toast.error(`Not enough wallet balance to join this pool. (Minimum Rs ${sharedFare} required)`);
      return;
    }

    const dropLoc = stops.find((s: any) => s.id !== 'pickup') || stops[stops.length - 1];
    socket.emit("carpool:join:request", {
      rideId,
      userId: user?.id || user?._id || "507f1f77bcf86cd799439011",
      name: user?.name || (user?.firstName ? `${user.firstName} ${user.lastName}` : "Passenger"),
      seats: 1,
      pickup: userLoc,
      drop: dropLoc?.coords
    });
    toast.success("Requested to join carpool");
  };

  const pickup = stops.find((s: any) => s.id === 'pickup') || { id: 'pickup', query: '', coords: null, suggestions: [], showSuggestions: false };
  const dropoff = stops.find((s: any) => s.id === 'dropoff') || stops.find((s: any) => s.id === '1') || { id: 'dropoff', query: '', coords: null, suggestions: [], showSuggestions: false };
  const middleStops = stops.filter((s: any) => s.id !== 'pickup' && s.id !== 'dropoff' && s.id !== '1');
  const displayStops = [pickup, ...middleStops, dropoff];

  const handleAddStop = () => {
    const newId = `stop-${Date.now()}`;
    const newStops = [...displayStops];
    newStops.splice(newStops.length - 1, 0, { id: newId, query: '', coords: null, suggestions: [], showSuggestions: false });
    rideState.setStops(newStops);
  };

  const handleRemoveStop = (id: string) => {
    rideState.setStops(stops.filter((s: any) => s.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const newStops = [...displayStops];
    const draggedStop = newStops[dragIndex];
    newStops.splice(dragIndex, 1);
    newStops.splice(dropIndex, 0, draggedStop);

    newStops.forEach((stop, idx) => {
      if (idx === 0) stop.id = 'pickup';
      else if (idx === newStops.length - 1) stop.id = 'dropoff';
      else if (stop.id === 'pickup' || stop.id === 'dropoff') {
        stop.id = `stop-${Date.now()}-${idx}`;
      }
    });
    rideState.setStops(newStops);
  };

  return (
    <>
      <div className="absolute inset-0 z-0">
        <MapComponent
          userLoc={userLoc}
          passengerLoc={userLoc}
          rideStatus={activeRide?.status}
          stops={displayStops
            .filter((s: any) => s.coords !== null) // Only show pins for locations that are explicitly selected/set
            .map((s: any) => s.coords)
          }
          onLocate={mapLogic.handleLocate}
          onRouteInfo={(dist: number, dur: number) => rideState.setRouteInfo({ distance: dist, duration: dur })}
          nearbyDrivers={activeRide ? (activeRide.driverInfo ? [activeRide.driverInfo] : []) : visibleNearbyDrivers}
        />
      </div>

      {/* Unified Left Panel (Flexible Box) */}
      <div className="absolute top-10 left-10 z-30 w-[440px] max-h-[calc(100vh-80px)] pointer-events-none flex flex-col gap-6">

        {/* Floating Search Bar (Uber UI) */}
        <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden flex flex-col relative z-20 pointer-events-auto transition-all shrink-0">
          <div className="px-5 py-5 flex items-start gap-4 relative">
            {(stops.some((s: any) => s.query || s.coords) || isRouteSearched) ? (
              <button
                onClick={() => {
                  rideState.resetRideState();
                }}
                className="mt-1 w-8 h-8 shrink-0 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-black rounded-full transition-all" title="Clear & Close">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8 shrink-0" />
            )}

            <div className="absolute left-[39px] top-[40px] bottom-[30px] w-[3px] bg-slate-200" />

            <div className="flex-1 flex flex-col gap-3 min-w-0 z-10 w-full relative">
              {displayStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="relative flex items-center gap-2 group/row"
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                >
                  <div className="absolute -left-[43px] flex items-center justify-center w-6 h-full pointer-events-none">
                    {idx === 0 ? (
                      <div className="w-[9px] h-[9px] bg-black rounded-full z-10" />
                    ) : idx === displayStops.length - 1 ? (
                      <div className="w-[11px] h-[11px] bg-white border-[3px] border-black z-10" />
                    ) : (
                      <div className="w-[9px] h-[9px] bg-slate-400 rounded-full z-10" />
                    )}
                  </div>
                  <div className="flex-1 bg-slate-100/80 rounded-xl pl-1 pr-4 h-[44px] flex items-center transition-colors focus-within:bg-slate-200/80 group shrink-0">
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      className="cursor-move p-1.5 text-slate-300 hover:text-slate-600 opacity-0 group-hover/row:opacity-100 transition-opacity"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <input
                      className="w-full bg-transparent border-none outline-none text-[#000000] font-bold text-[15px] placeholder:text-slate-500 ml-1"
                      placeholder={idx === 0 ? "Current Location" : (idx === displayStops.length - 1 ? "Where to?" : "Add stop...")}
                      value={stop.query || ""}
                      onChange={(e) => mapLogic.handleInputChange(stop.id, e.target.value)}
                      onFocus={() => rideState.setIsSearchOpen(true)}
                    />
                    {idx === 0 && (
                      <button onClick={(e) => { e.preventDefault(); mapLogic.handleLocate(); }} className="w-7 h-7 flex items-center justify-center text-blue-500 bg-white rounded-full shadow-sm hover:scale-110 hover:text-blue-700 transition-all ml-2 shrink-0" title="Use Current GPS">
                        <Compass className="w-4 h-4" />
                      </button>
                    )}
                    {(idx !== 0 && idx !== displayStops.length - 1) && (
                      <button onClick={() => handleRemoveStop(stop.id)} className="w-7 h-7 flex items-center justify-center text-rose-500 bg-white rounded-full shadow-sm hover:scale-110 transition-all ml-2 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {(idx === displayStops.length - 1 && displayStops.length < 5) && (
                      <button onClick={handleAddStop} className="w-7 h-7 flex items-center justify-center text-black bg-white rounded-full shadow-sm hover:scale-110 transition-all ml-2 shrink-0" title="Add Stop">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar">
            {isSearchOpen && stops.some((s: any) => s.showSuggestions && s.suggestions?.length > 0) && (
              <div className="border-t border-slate-100 bg-white max-h-[350px] overflow-y-auto w-full pb-2">
                {stops.find((s: any) => s.showSuggestions)?.suggestions.map((sug: any, idx: number) => {
                  const activeStop = stops.find((s: any) => s.showSuggestions)!;
                  return (
                    <button key={idx} onClick={() => mapLogic.selectSuggestion(activeStop.id, sug)} className="w-full px-6 py-4 text-left flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex justify-center items-center text-slate-500 group-hover:text-black transition-colors shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] text-black truncate">{sug.name}</p>
                        <p className="text-[12px] font-semibold text-slate-500 truncate mt-0.5">{sug.city || sug.country}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Action Panel (Right Side) */}
      <div className="absolute top-28 right-8 z-30 w-[420px] h-[calc(100vh-140px)] pointer-events-none flex flex-col justify-start">

        {/* Ride Choices Panel */}
        {isRouteSearched && !activeRide && (
          <div className="bg-white/95 backdrop-blur-3xl rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.3)] p-6 pb-6 border border-white/50 pointer-events-auto flex flex-col h-full overflow-hidden">
            <h3 className="text-2xl font-black text-[#0A192F] mb-6 tracking-tight text-center shrink-0">Choose a ride</h3>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 shadow-inner mx-2 shrink-0">
              <button onClick={() => { rideState.setIsSharedRide(false); rideState.setVehicleType('go'); }} className={`flex-1 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${!isSharedRide ? 'bg-white shadow-md text-[#0A192F]' : 'text-slate-400 hover:text-slate-600'}`}>Private</button>
              <button onClick={() => { rideState.setIsSharedRide(true); rideState.setVehicleType('go'); }} className={`flex-1 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${isSharedRide ? 'bg-[#FFD700] shadow-md text-[#0A192F]' : 'text-slate-400 hover:text-slate-600'}`}>Shared (-40%)</button>
            </div>

            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto px-2 custom-scrollbar">
              {isSharedRide ? (
                <>
                  {availableCarpools.length > 0 ? (
                    availableCarpools.map((pool) => (
                      <button
                        key={pool.rideId}
                        onClick={() => handleJoinCarpool(pool.rideId)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-50 hover:border-[#0A192F]/20 hover:bg-slate-50 transition-all group shrink-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow-md shrink-0 border border-slate-100">
                            {pool.driverPhoto ? (
                              <img src={pool.driverPhoto} alt="Driver" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#FFD700] flex items-center justify-center">
                                {pool.vehicleType === 'bike' ? (
                                  <Bike className="w-7 h-7 text-[#0A192F]" />
                                ) : (
                                  <Car className="w-7 h-7 text-[#0A192F]" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-left flex flex-col">
                            <p className="font-extrabold text-[#0A192F] text-[16px]">{pool.driverName || "Driver"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
                                <Star className="w-2.5 h-2.5 fill-amber-500" />
                                <span>{pool.driverRating || 4.8}</span>
                              </div>
                              <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-tighter">{pool.vehicleType === 'bike' ? 'Bike Pool' : 'Car Pool'}</span>
                              <span className="text-[10px] font-bold text-slate-500">{pool.availableSeats} seats left</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[18px] text-[#0A192F]">Rs {pool.pricePerSeat || (pool.vehicleType === 'bike' ? 40 : 100)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Join Now</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="text-slate-300 w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-bold text-[14px]">No active carpools currently match your route.</p>
                      <p className="text-slate-400 text-[11px] mt-1 italic">Click 'Request' below to start a new shared session.</p>
                    </div>
                  )}
                </>
              ) : (
                CAR_STYLES.map(style => {
                  const isSelected = vehicleType === style.id;
                  const carFare = calculateFare(style.id);
                  return (
                    <button 
                      key={style.id} 
                      onClick={() => rideState.setVehicleType(style.id as any)} 
                      className={`w-full flex items-center justify-between p-4 rounded-3xl border-2 transition-all group shrink-0 relative overflow-hidden ${isSelected ? 'border-[#0A192F] bg-[#0A192F]/5 shadow-xl' : 'border-slate-50 hover:border-[#0A192F]/20 hover:bg-slate-50'}`}
                    >
                      {isSelected && <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/10 rounded-full -mr-12 -mt-12" />}
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-[#0A192F] text-[#FFD700] shadow-2xl scale-110' : 'bg-white text-slate-300 shadow-sm border border-slate-100'}`}>
                          <style.icon className="w-8 h-8" />
                        </div>
                        <div className="text-left flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <p className={`font-black tracking-tight transition-colors ${isSelected ? 'text-[#0A192F] text-[20px]' : 'text-slate-700 text-[18px]'}`}>{style.name}</p>
                            <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#0A192F] text-[#FFD700]' : 'bg-slate-100 text-slate-400'}`}>
                              <Users className="w-3 h-3" />
                              <span className="text-[10px] font-black">{style.person}</span>
                            </div>
                          </div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{style.time} • {style.desc}</p>
                        </div>
                      </div>
                      <div className="text-right relative z-10">
                        <p className={`font-black text-[22px] tracking-tighter leading-none ${isSelected ? 'text-[#0A192F]' : 'text-slate-400'}`}>₹{carFare}</p>
                        <p className={`text-[10px] font-black uppercase mt-1 ${isSelected ? 'text-[#0A192F]/40' : 'text-slate-300'}`}>Minimum ₹{style.baseFare}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Payment Selection Section */}
            {!isSharedRide && (
              <div className="mt-4 px-2 space-y-3 shrink-0">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">Payment Method</p>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-[22px]">
                   <button 
                    onClick={() => setPaymentMethod("WALLET")}
                    className={`flex-1 py-3 px-2 rounded-[18px] transition-all flex items-center justify-center gap-2 ${paymentMethod === "WALLET" ? 'bg-[#0A192F] text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                   >
                     <Wallet className="w-4 h-4" />
                     <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[10px] font-black uppercase">Wallet</span>
                        <span className="text-[8px] font-bold opacity-60">Rs {user?.walletBalance || 0}</span>
                     </div>
                   </button>
                   <button 
                    onClick={() => setPaymentMethod("UPI")}
                    className={`flex-1 py-3 px-2 rounded-[18px] transition-all flex items-center justify-center gap-2 ${paymentMethod === "UPI" ? 'bg-[#0A192F] text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                   >
                     <QrCode className="w-4 h-4" />
                     <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[10px] font-black uppercase">UPI</span>
                        <span className="text-[8px] font-bold opacity-60">Razorpay</span>
                     </div>
                   </button>
                   <button 
                    onClick={() => setPaymentMethod("CASH")}
                    className={`flex-1 py-3 px-2 rounded-[18px] transition-all flex items-center justify-center gap-2 ${paymentMethod === "CASH" ? 'bg-[#0A192F] text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                   >
                     <Banknote className="w-4 h-4" />
                     <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[10px] font-black uppercase">Cash</span>
                        <span className="text-[8px] font-bold opacity-60">Pay Driver</span>
                     </div>
                   </button>
                </div>
              </div>
            )}

            <div className="px-2 mt-4 shrink-0 pt-2 border-t border-slate-100 bg-white/95">
              <button
                onClick={handleRequestRide}
                disabled={isRequestingRide || loadingDrivers}
                className="w-full py-5 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-[20px] font-black text-[15px] uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex flex-col items-center justify-center gap-1 shrink-0"
              >
                {isRequestingRide ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Searching Drivers</span>
                    </div>
                    {searchCountdown !== null && (
                      <span className="text-[11px] opacity-70 tracking-widest font-bold">
                        {Math.floor(searchCountdown / 60)}:{(searchCountdown % 60).toString().padStart(2, '0')} remaining
                      </span>
                    )}
                  </>
                ) : (
                  <span>{isSharedRide ? "Request Shared Ride" : `Request ${CAR_STYLES.find(s => s.id === vehicleType)?.name || "Ride"}`}</span>
                )}
              </button>

              {isRequestingRide && (
                <button
                  onClick={() => {
                    rideState.setIsRequestingRide(false);
                    socket.emit("cancel-ride-request", { passengerId: user?.id || user?._id || "507f1f77bcf86cd799439011" });
                    toast.error("Search cancelled.");
                  }}
                  className="w-full mt-3 py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-[18px] font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Ride Panel (Only show if user is NOT the driver) */}
        {activeRide && (activeRide.driverId !== (user?.id || user?._id)) && (
          <div className="bg-white/95 backdrop-blur-3xl rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] p-0 border border-white/20 pointer-events-auto shrink-0 relative overflow-hidden transition-all duration-700 w-[420px]">
            {/* Glassy Background Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />
            
            {/* Header Section: ETA & Status */}
            <div className="p-8 pb-6 relative z-10 border-b border-slate-100/50 bg-slate-50/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {activeRide.status === "SEARCHING" ? "Searching for driver" :
                   activeRide.status === "ACCEPTED" ? "Driver arriving" :
                   activeRide.status === "ARRIVED" ? "Driver is here" :
                   activeRide.status === "STARTED" ? "Trip in progress" : "Trip Summary"}
                </span>
                <div className="flex items-center gap-1.5">
                  {activeRide.isSharedRide && (
                    <div className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Shared</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Live Sync</span>
                  </div>
                </div>
              </div>

              {/* Reset Control (Minimalist) */}
              <button
                onClick={() => rideState.resetRideState()}
                className="absolute top-8 right-8 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600"
                title="Reset Ride"
              >
                <X className="w-4 h-4" />
              </button>

              {(() => {
                const getDriverDistance = () => {
                  const drvLoc = activeRide?.driverInfo?.location || (activeRide?.driverLocation?.lat ? activeRide.driverLocation : null);
                  if (!userLoc || !drvLoc) return null;
                  const dLat = (drvLoc.lat - userLoc[0]) * Math.PI / 180;
                  const dLon = (drvLoc.lng - userLoc[1]) * Math.PI / 180;
                  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLoc[0] * Math.PI / 180) * Math.cos(drvLoc.lat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  return 6371 * c; // km
                };
                const dist = getDriverDistance();
                
                return (
                  <div className="flex flex-col gap-1">
                    <h2 className="text-4xl font-black text-[#0A192F] tracking-tighter leading-tight italic">
                      {activeRide.status === "ARRIVED" ? "At Pickup" :
                       activeRide.status === "STARTED" ? "On Trip" :
                       activeRide.status === "SEARCHING" ? "Searching..." :
                       (activeRide.eta || (dist ? `${dist.toFixed(1)} km away` : 'On the Way'))}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activeRide.status === "ACCEPTED" && (
                        <p className="text-[13px] font-bold text-slate-500">Pick-up in approx. {activeRide.eta || '5 mins'}</p>
                      )}
                      {activeRide.isSharedRide && (
                        <span className="text-[11px] font-black text-[#0A192F] bg-[#FFD700] px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm">
                          {activeRide.passengers?.length || 1} Seat Booked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Subtle Progress Bar */}
            <div className="flex gap-1 h-1 bg-slate-50 relative z-20">
              <div className={`h-full transition-all duration-1000 ${['ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CONFIRMED'].includes(activeRide.status) ? 'bg-[#0A192F] flex-1' : 'w-0'}`} />
              <div className={`h-full transition-all duration-1000 ${['ARRIVED', 'STARTED', 'COMPLETED', 'CONFIRMED'].includes(activeRide.status) ? 'bg-[#0A192F] flex-1' : 'w-0'}`} />
              <div className={`h-full transition-all duration-1000 ${['STARTED', 'COMPLETED'].includes(activeRide.status) ? 'bg-[#0A192F] flex-1' : 'w-0'}`} />
            </div>

            {/* Content Body */}
            <div className="p-8 pt-6 space-y-6">
              <div className="space-y-6">
                  {/* Driver Header */}
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 mb-1">
                        <h4 className="font-extrabold text-xl text-[#0A192F] tracking-tight truncate max-w-[180px]">
                          {activeRide.driverInfo?.name || activeRide.driverName || "Jasir o"}
                        </h4>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                            <Star className="w-3 h-3 fill-slate-900 text-slate-900" />
                            <span className="text-[11px] font-bold text-[#0A192F]">{activeRide.driverInfo?.rating || activeRide.driverRating || "4.9"}</span>
                        </div>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 tracking-wide uppercase">
                        {activeRide.driverInfo?.vehicleModel || activeRide.vehicleModel || "Premium Transport"}
                      </p>
                      
                      {/* Communication Controls */}
                      <div className="flex items-center gap-2 mt-3">
                         <a 
                           href={`tel:${activeRide.driverInfo?.phone || activeRide.driverPhone || '0000000000'}`}
                           className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0A192F] text-[#FFD700] rounded-xl hover:bg-black transition-all shadow-md group"
                           title="Call Driver"
                         >
                           <Phone className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Call</span>
                         </a>
                         <button 
                           onClick={() => toast.success("Chat feature coming soon!")}
                           className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-[#0A192F] rounded-xl border border-slate-200 hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-widest"
                           title="Chat with Driver"
                         >
                           <MessageSquare className="w-4 h-4" />
                           Chat
                         </button>
                      </div>
                    </div>

                    <div className="relative group">
                       <div className="w-20 h-20 bg-slate-50 rounded-[24px] overflow-hidden border-2 border-slate-100 shadow-md transform group-hover:scale-105 transition-all duration-500">
                         {(() => {
                           const rawPhoto = activeRide.driverInfo?.profilePhoto || activeRide.driverInfo?.photo || activeRide.driverPhoto;
                           if (!rawPhoto) return (
                             <div className="w-full h-full flex items-center justify-center bg-[#0A192F] text-white">
                               <Users className="w-8 h-8 opacity-40" />
                             </div>
                           );

                           let finalSrc = rawPhoto;
                           const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

                           if (rawPhoto.includes('amazonaws.com') && rawPhoto.includes('goride/profiles/')) {
                             const filename = rawPhoto.split('/').pop();
                             finalSrc = `${baseUrl}/api/auth/profile-photo/${filename}`;
                           } else if (!rawPhoto.startsWith('http') && !rawPhoto.startsWith('data:')) {
                             const cleanPath = rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`;
                             finalSrc = `${baseUrl}${cleanPath}`;
                           }

                           return (
                             <img 
                               src={finalSrc} 
                               alt="Driver" 
                               className="w-full h-full object-cover" 
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.onerror = null;
                                 target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRide.driverInfo?.name || activeRide.driverName || "Driver")}&background=0A192F&color=FFFFFF&bold=true`;
                               }}
                             />
                           );
                         })()}
                       </div>
                       <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-lg" />
                    </div>
                  </div>

                  {/* Identification Card */}
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[24px] border border-slate-100 group">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">State Registry Number</span>
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-slate-300" />
                         <span className="font-black text-[18px] text-[#0A192F] tracking-widest font-mono">
                           {activeRide.driverInfo?.vehiclePlate || activeRide.vehiclePlate || "TN 01 AB 1234"}
                         </span>
                         <div className="w-2 h-2 rounded-full bg-slate-300" />
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm transition-transform group-hover:scale-110">
                      <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                  </div>
              </div>

              {/* Action Area */}
              <div className="mt-8 flex flex-col gap-4">
                {activeRide.status !== "COMPLETED" && activeRide.status !== "STARTED" && (
                  <button 
                    onClick={handleCancelRide} 
                    className="w-full py-5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 rounded-[22px] font-black text-[13px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-3"
                  >
                    <XCircle className="w-5 h-5" />
                    Cancel Ride
                  </button>
                )}
              </div>
            </div>


            {/* Bottom Safe Area Decoration */}
            <div className="h-2 bg-[#0A192F]" />

            {/* Multi-Step Rating & Feedback UI (Compact & Scrollable) */}
            {activeRide.status === "COMPLETED" && (
              <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                <div className="absolute inset-0 bg-[#0A192F]/95 backdrop-blur-3xl animate-fade-in pointer-events-auto" />
                
                <div className="relative w-full max-w-[420px] max-h-[92vh] flex flex-col bg-white rounded-[32px] shadow-[0_45px_120px_rgba(0,0,0,0.7)] text-center animate-slide-up pointer-events-auto overflow-hidden">
                   {/* FIXED HEADER: Driver Profile */}
                   <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-4 relative overflow-hidden text-left shrink-0">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/10 rounded-full -mr-12 -mt-12" />
                      <div className="relative z-10 w-14 h-14 shrink-0 bg-white rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                        {(() => {
                           const rawPhoto = activeRide.driverInfo?.profilePhoto || activeRide.driverInfo?.photo;
                           const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
                           let finalSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRide.driverInfo?.name || "D")}&background=0A192F&color=FFD700&bold=true`;

                           if (rawPhoto) {
                              if (rawPhoto.includes('amazonaws.com') && rawPhoto.includes('goride/profiles/')) {
                                finalSrc = `${baseUrl}/api/auth/profile-photo/${rawPhoto.split('/').pop()}`;
                              } else if (!rawPhoto.startsWith('http')) {
                                finalSrc = `${baseUrl}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
                              } else {
                                finalSrc = rawPhoto;
                              }
                           }
                           return <img src={finalSrc} alt="Driver" className="w-full h-full object-cover" />;
                        })()}
                      </div>
                      <div className="relative z-10 flex-1 min-w-0">
                           <h3 className="text-xl font-black text-[#0A192F] tracking-tight truncate leading-tight">
                             {activeRide.driverInfo?.name || "Driver"}
                           </h3>
                           <div className="flex flex-col gap-0.5 mt-0.5">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                               {activeRide.driverInfo?.vehicleModel || "Premium Transport"}
                             </p>
                             <div className="inline-flex mt-1 px-3 py-1 bg-[#0A192F] text-[#FFD700] rounded-full w-max text-[8px] font-bold uppercase tracking-widest shadow-sm">
                               {activeRide.driverInfo?.vehicleType || "Ride"}
                             </div>
                           </div>
                      </div>
                   </div>

                  {/* SCROLLABLE BODY: Rating Steps */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {/* Stepper Dots */}
                    <div className="flex justify-center gap-2 mb-2">
                      <div className={`h-1 rounded-full transition-all duration-500 ${ratingStep === 1 ? 'w-12 bg-[#FFD700]' : 'w-2 bg-[#0A192F]/10'}`} />
                      <div className={`h-1 rounded-full transition-all duration-500 ${ratingStep === 2 ? 'w-12 bg-[#FFD700]' : 'w-2 bg-[#0A192F]/10'}`} />
                    </div>

                    {ratingStep === 1 ? (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                          <h1 className="text-3xl font-black text-[#0A192F] tracking-tighter leading-none italic uppercase">
                            Rate <span className="text-[#FFD700]">Experience</span>
                          </h1>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
                            How was your trip?
                          </p>
                        </div>

                        <div className="flex justify-center gap-3 py-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className={`group transition-all duration-300 transform p-2 rounded-2xl bg-slate-50/50 ${star <= rating ? 'scale-110 bg-amber-50' : 'hover:scale-105 active:scale-95 grayscale opacity-40 hover:opacity-100'}`}
                            >
                              <div className="w-10 h-10 flex items-center justify-center">
                                <Star
                                  className={`w-9 h-9 transition-all duration-500 ${star <= rating ? 'fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]' : 'text-slate-300'}`}
                                  strokeWidth={2}
                                />
                              </div>
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setRatingStep(2)}
                          disabled={rating === 0}
                          className="w-full py-5 bg-[#0A192F] text-[#FFD700] rounded-2xl font-black text-[13px] uppercase tracking-[0.3em] shadow-xl hover:bg-black hover:scale-[1.01] transition-all disabled:opacity-20"
                        >
                          Next Step
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-2">
                           <h1 className="text-3xl font-black text-[#0A192F] tracking-tighter leading-none italic uppercase">
                            Final <span className="text-[#FFD700]">Thoughts</span>
                          </h1>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
                            Add your comment
                          </p>
                        </div>

                        <div className="relative">
                          <textarea
                            placeholder="Optional feedback..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[#0A192F] text-sm font-bold outline-none focus:border-[#FFD700] transition-all placeholder:text-slate-300 resize-none shadow-inner"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setRatingStep(1)}
                            className="flex-1 py-4 bg-slate-100 text-[#0A192F] rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Back
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                if (rating > 0) {
                                  await api.post('/rating', {
                                    rideId: activeRide._id || activeRide.id || activeRide.rideId,
                                    targetId: activeRide.driverId?._id || activeRide.driverId,
                                    rating,
                                    feedback
                                  });
                                }
                                rideState.resetRideState();
                                setRating(0);
                                setFeedback("");
                                setRatingStep(1);
                                toast.success("Feedback submitted!");
                              } catch (err) {
                                toast.error("Failed to submit rating");
                              }
                            }}
                            className="flex-[2] py-4 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-lg hover:bg-yellow-400 transition-all"
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
