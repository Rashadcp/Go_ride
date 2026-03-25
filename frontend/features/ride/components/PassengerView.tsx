import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import {
  Wallet, IndianRupee, Bell, HelpCircle, Navigation, Compass, MapPin, Plus,
  X, ArrowLeft, Loader2, GripVertical, Trash2, Car, Users, Star, XCircle, Bike
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

  const {
    userLoc, stops, routeInfo, activeRide,
    isSearchOpen, isRouteSearched, searchStarted,
    visibleNearbyDrivers, availableCarpools,
    loadingDrivers, isRequestingRide, dashboardStep,
    isSharedRide, vehicleType
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

  const estimatedRideFare = Math.round(routeInfo?.distance ? routeInfo.distance * 12 : 150);

  const CAR_STYLES = [
    { id: 'bike', name: 'Bike', multiplier: 0.4, icon: Bike, desc: 'Fast & Affordable', time: '2 min', person: 1 },
    { id: 'auto', name: 'Auto Riksha', multiplier: 0.6, icon: Users, desc: 'Quick rides, no bargaining', time: '3 min', person: 3 },
    { id: 'go', name: 'Go', multiplier: 1.0, icon: Car, desc: 'Affordable, everyday rides', time: '5 min', person: 4 },
    { id: 'sedan', name: 'Sedan', multiplier: 1.3, icon: Car, desc: 'Extra legroom, premium', time: '6 min', person: 4 },
    { id: 'xl', name: 'XL', multiplier: 1.8, icon: Users, desc: 'Comfortable SUVs for groups', time: '8 min', person: 6 }
  ];

  const handleRequestRide = () => {
    if (!user) {
      toast.error("User not found");
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
      fare: isSharedRide ? estimatedRideFare * 0.6 : estimatedRideFare,
      distance: routeInfo?.distance || 0,
      duration: routeInfo?.duration || 0
    };

    socket.emit("ride-request", payload);
    toast.success("Searching for nearby drivers...");
  };

  const handleJoinCarpool = (rideId: string) => {
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
                          <p className="font-black text-[18px] text-[#0A192F]">Rs {pool.pricePerSeat || Math.round(estimatedRideFare * 0.6)}</p>
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
                CAR_STYLES.map(style => (
                  <button key={style.id} onClick={() => rideState.setVehicleType(style.id as any)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all group shrink-0 ${vehicleType === style.id ? 'border-[#0A192F] bg-[#0A192F]/5 shadow-md' : 'border-slate-50 hover:border-[#0A192F]/20 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors shrink-0 ${vehicleType === style.id ? 'bg-[#0A192F] text-[#FFD700] shadow-lg' : 'bg-white text-slate-400 shadow-sm border border-slate-100'}`}>
                        <style.icon className="w-8 h-8" />
                      </div>
                      <div className="text-left flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-black tracking-tight transition-colors ${vehicleType === style.id ? 'text-[#0A192F] text-[18px]' : 'text-slate-600 text-[17px]'}`}>{style.name}</p>
                          <div className="flex items-center gap-0.5 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{style.person}</span>
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{style.time} away • {style.desc}</p>
                      </div>
                    </div>
                    <p className={`font-black text-[20px] tracking-tight ${vehicleType === style.id ? 'text-[#0A192F]' : 'text-slate-400'}`}>Rs {Math.round(estimatedRideFare * style.multiplier)}</p>
                  </button>
                ))
              )}
            </div>
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

        {/* Active Ride Panel */}
        {activeRide && (
          <div className="bg-[#0A192F]/95 backdrop-blur-3xl text-white rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.4)] p-8 border border-[#FFD700]/20 pointer-events-auto shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl -mr-10 -mt-20" />
            <h3 className="text-[11px] font-black text-[#FFD700] uppercase tracking-[0.3em] mb-2">
              {activeRide.status === "SEARCHING" ? "Finding you a driver" :
                activeRide.status === "ACCEPTED" ? "Driver is on the way" :
                  activeRide.status === "ARRIVED" ? "Driver is at pickup" :
                    activeRide.status === "STARTED" ? "Ride in progress" :
                      activeRide.status === "COMPLETED" ? "Trip Finished" : "Driver is coming"}
            </h3>

            {/* Close Button to Reset everything if stuck or finished */}
            <button
              onClick={() => rideState.resetRideState()}
              className="absolute top-8 right-8 z-10 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/60 hover:text-white"
              title="Close and Reset"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stage Progress Bar */}
            <div className="flex gap-2 mb-8 px-1">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-1000 ${['ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED'].includes(activeRide.status) ? 'bg-[#FFD700]' : 'bg-white/10'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-1000 ${['ARRIVED', 'STARTED', 'COMPLETED'].includes(activeRide.status) ? 'bg-[#FFD700]' : 'bg-white/10'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-1000 ${['STARTED', 'COMPLETED'].includes(activeRide.status) ? 'bg-[#FFD700]' : 'bg-white/10'}`} />
            </div>

            {/* Distance Helper for UI */}
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
                <p className="text-4xl font-black text-white mb-8 tracking-tighter leading-none">
                  {activeRide.status === "ARRIVED" ? "At Pickup" :
                    activeRide.status === "STARTED" ? "On Trip" :
                      activeRide.status === "COMPLETED" ? "Finished" :
                        (activeRide.eta || (dist ? `${dist.toFixed(1)} km away` : 'On the Way'))}
                </p>
              );
            })()}


            {activeRide.driverInfo && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-5 mb-8 shadow-inner">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/20">
                  {activeRide.driverInfo?.profilePhoto || activeRide.driverInfo?.photo ? (
                    <img src={activeRide.driverInfo.profilePhoto || activeRide.driverInfo.photo} alt="Driver" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M30 25C30 15 35 10 50 10C65 10 70 15 70 25L75 45V80C75 85.5228 70.5228 90 65 90H35C29.4772 90 25 85.5228 25 80V45L30 25Z" fill="#0A192F" />
                      <path d="M35 30L65 30L68 45H32L35 30Z" fill="#FFD700" fillOpacity="0.6" />
                      <rect x="30" y="50" width="40" height="25" rx="2" fill="#FFD700" fillOpacity="0.4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg text-white mb-1">{activeRide.driverInfo.name || "Driver"}</p>
                  <div className="inline-flex px-3 py-1 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/20">
                    <p className="text-[#FFD700] font-black text-[11px] tracking-widest">{activeRide.driverInfo.vehiclePlate || activeRide.driverInfo.vehicleNumber || "NOT AVAILABLE"}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                    <Star className="w-3.5 h-3.5 fill-[#FFD700] text-[#FFD700]" />
                    <span className="font-black text-[13px]">4.9</span>
                  </div>
                </div>
              </div>
            )}

            {activeRide.status === "COMPLETED" && (
              <div className="space-y-6">
                <div className="text-center pt-2">
                  <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mb-3">Rate your experience</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-white/20'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="Share your feedback (optional)..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-[13px] outline-none focus:border-[#FFD700]/30 transition-all placeholder:text-slate-600 resize-none"
                />

                <button
                  onClick={async () => {
                    try {
                      if (rating > 0) {
                        await api.post('/rides/rate', {
                          rideId: activeRide._id || activeRide.id,
                          targetId: activeRide.driverId?._id || activeRide.driverId,
                          rating,
                          feedback
                        });
                      }
                      rideState.resetRideState();
                      toast.success("Thanks for your rating!");
                    } catch (err) {
                      toast.error("Failed to submit rating");
                    }
                  }}
                  className="w-full py-5 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all"
                >
                  Submit & Complete
                </button>
              </div>
            )}

            {activeRide.status !== "COMPLETED" && activeRide.status !== "STARTED" && (
              <button onClick={handleCancelRide} className="w-full py-5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] transition-all">Cancel Trip</button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
