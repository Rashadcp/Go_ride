import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
import {
  Wallet, IndianRupee, Bell, HelpCircle, Navigation, Compass, MapPin, Plus,
  X, ArrowLeft, Loader2, GripVertical, Trash2, Car, Users, Star, XCircle, Bike, ShieldCheck, Banknote, CreditCard, QrCode, Phone, MessageSquare, AlertTriangle, CheckCircle2,
  Tag
} from "lucide-react";
import dynamic from "next/dynamic";

import { useRideStore } from "@/features/ride/store/useRideStore";
import { useMapLogic } from "@/features/map/hooks/useMapLogic";
import { useRideSocket } from "@/features/ride/hooks/useRideSocket";
import { socket } from "@/lib/socket";
import toast from "react-hot-toast";
import { ChatModal } from "@/features/chat/components/ChatModal";
import { MessageCircle } from "lucide-react";

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
    loadingDrivers, isRequestingRide, setIsRequestingRide, dashboardStep,
    isSharedRide, vehicleType, paymentMethod, setPaymentMethod,
    unreadChatMessages
  } = rideState;

  const [selectedCarpoolId, setSelectedCarpoolId] = useState<string | null>(null);
  const [searchCountdown, setSearchCountdown] = useState<number | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentDone, setIsPaymentDone] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const lastAutoOpenedChatRef = useRef<string | null>(null);

  // Promotion State
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [manualPromoCode, setManualPromoCode] = useState("");
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  const fetchPromotions = async () => {
    try {
      const { data } = await api.get("/rides/promotions");
      setPromotions(data);
    } catch (e) {
      console.error("Failed to fetch promos");
    }
  };

  const handleVerifyManualPromo = async () => {
    if (!manualPromoCode.trim()) return;
    setIsVerifyingPromo(true);
    try {
      const { data } = await api.get(`/rides/promotions/validate/${manualPromoCode}`);
      setSelectedPromo(data);
      toast.success(`Code ${data.code} applied!`);
      setManualPromoCode("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid promo code");
    } finally {
      setIsVerifyingPromo(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // Emergency Report State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportType, setReportType] = useState<"ACCIDENT" | "HARASSMENT" | "THEFT" | "OTHER">("OTHER");
  const [reportDesc, setReportDesc] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleSubmitReport = async () => {
    if (!reportDesc.trim()) { toast.error("Please describe the incident"); return; }
    setIsSubmittingReport(true);
    try {
      socket.emit("ride:emergency", {
        rideId: activeRide?._id || activeRide?.rideId || "",
        userId: user?.id || user?._id,
        type: reportType,
        message: reportDesc,
        driverName: activeRide?.driverInfo?.name || activeRide?.driverName,
        driverId: activeRide?.driverId?._id || activeRide?.driverId,
        location: userLoc ? { latitude: userLoc[0], longitude: userLoc[1] } : null,
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setIsReportOpen(false);
        setReportSubmitted(false);
        setReportDesc("");
        setReportType("OTHER");
      }, 2500);
    } catch (e) {
      toast.error("Failed to send report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

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
    { id: 'bike', name: 'Bike', baseFare: 20, ratePerKm: 6, icon: Bike, desc: 'Fast & Cheap', time: '2 min', person: 1 },
    { id: 'auto', name: 'Auto Rickshaw', baseFare: 40, ratePerKm: 10, icon: Users, desc: 'Fast local rides', time: '3 min', person: 3 },
    { id: 'go', name: 'Go', baseFare: 60, ratePerKm: 15, icon: Car, desc: 'Budget rides for every day', time: '5 min', person: 4 },
    { id: 'sedan', name: 'Sedan', baseFare: 80, ratePerKm: 20, icon: Car, desc: 'More space & comfort', time: '6 min', person: 4 },
    { id: 'xl', name: 'XL', baseFare: 110, ratePerKm: 28, icon: Users, desc: 'Big cars for groups', time: '8 min', person: 6 }
  ];

  const calculateFare = (vType: string) => {
    const style = CAR_STYLES.find(s => s.id === vType) || CAR_STYLES[2];
    const distance = routeInfo?.distance || 0;

    // Initial fare based on car type and distance
    let finalFare = Math.max(style.baseFare, style.baseFare + (distance * style.ratePerKm));

    // Apply shared ride discount (e.g. 40% off) if in shared mode
    if (isSharedRide) {
      finalFare = finalFare * 0.6;
    }

    // Apply specific promotion if selected
    if (selectedPromo) {
      if (selectedPromo.type === "PERCENTAGE") {
        finalFare = finalFare * (1 - selectedPromo.value / 100);
      } else if (selectedPromo.type === "FLAT") {
        finalFare = Math.max(0, finalFare - selectedPromo.value);
      }
    }

    return Math.round(finalFare);
  };

  const estimatedRideFare = calculateFare(vehicleType);

  const getRideSettlementAmount = (ride: any) => {
    if (!ride) return estimatedRideFare;

    const sharedRide = ride.type === "CARPOOL" || ride.isSharedRide || isSharedRide;
    if (!sharedRide) {
      return Number(ride.price || estimatedRideFare);
    }

    const currentUserId = String(user?.id || user?._id || "");
    const passengerEntry = Array.isArray(ride.passengers)
      ? ride.passengers.find((passenger: any) => String(passenger.userId?._id || passenger.userId) === currentUserId)
      : null;

    if (passengerEntry) {
      const seatCount = Number(passengerEntry.seats || 1);
      const seatPrice = Number(ride.pricePerSeat || ride.price || 0);
      return seatPrice * seatCount;
    }

    return Number(ride.pricePerSeat || ride.price || (vehicleType === "bike" ? 40 : 100));
  };

  const activeChatKey = `${activeRide?.rideId || activeRide?._id || ""}_${[
    String(user?.id || user?._id || ""),
    String(activeRide?.driverId?._id || activeRide?.driverId || "")
  ].sort().join("_")}`;
  const activeChatMessages = unreadChatMessages[activeChatKey] !== undefined || rideState.chatHistory?.[activeChatKey]
    ? (rideState.chatHistory?.[activeChatKey] || [])
    : [];
  const activeUnreadCount = unreadChatMessages[activeChatKey] || 0;
  const latestIncomingChat = activeChatMessages.length > 0 ? activeChatMessages[activeChatMessages.length - 1] : null;

  useEffect(() => {
    const isSharedActiveRide = !!activeRide && (activeRide.type === "CARPOOL" || activeRide.isSharedRide);
    const latestMessageId = latestIncomingChat?.id || latestIncomingChat?.timestamp || null;

    if (!isSharedActiveRide || isChatOpen || !latestIncomingChat || latestIncomingChat.isSelf || activeUnreadCount <= 0 || !latestMessageId) {
      return;
    }

    if (lastAutoOpenedChatRef.current === latestMessageId) {
      return;
    }

    lastAutoOpenedChatRef.current = latestMessageId;
    setIsChatOpen(true);
    toast.success(`${latestIncomingChat.senderName || "Driver"} sent you a message.`);
  }, [activeRide, activeUnreadCount, isChatOpen, latestIncomingChat]);

  const processPayment = async (amount: number, rideId?: string, driverId?: string): Promise<boolean> => {
    setIsProcessingPayment(true);
    try {
      const { data } = await api.post("/payment/create", {
        amount,
        method: "RAZORPAY",
        rideId,
        driverId
      });

      const { order, key_id, paymentContext } = data;

      return new Promise<boolean>((resolve) => {
        const options = {
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          name: "Go Ride Mobility",
          description: paymentContext?.description || (rideId ? `Trip settlement for Ride ${rideId}` : "Wallet Credit Addition"),
          order_id: order.id,
          handler: async function (response: any) {
            try {
              await api.post("/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount,
                rideId,
                driverId
              });
              toast.success(rideId ? "UPI payment completed successfully." : "Payment successful!");
              resolve(true);
            } catch (err: any) {
              toast.error(err?.response?.data?.message || "Payment verification failed.");
              resolve(false);
            }
          },
          prefill: {
            name: user.firstName ? `${user.firstName} ${user.lastName}` : (user.name || ''),
            email: user.email,
            contact: user.phone || user.phoneNumber || "",
          },
          method: {
            upi: true,
            card: false,
            netbanking: false,
            wallet: false,
            emi: false,
            paylater: false,
          },
          theme: { color: "#0A192F" },
          modal: { ondismiss: () => resolve(false) },
          retry: { enabled: false }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }).finally(() => setIsProcessingPayment(false));
    } catch (err: any) {
      setIsProcessingPayment(false);
      toast.error(err?.response?.data?.message || "Unable to initialize UPI payment.");
      return false;
    }
  };

  const handleCreateRequest = () => {
    if (isSharedRide && selectedCarpoolId) {
      const pool = availableCarpools.find(p => p.rideId === selectedCarpoolId);
      if (pool) {
        const isBike = pool.requestedVehicleType === 'bike';
        const sharedFare = isBike ? 40 : 100;

        if (paymentMethod === "WALLET" && (user.walletBalance || 0) < sharedFare) {
          toast.error(`Insufficient balance (Rs ${sharedFare} min)`);
          return;
        }

        const dropLoc = stops.find((s: any) => s.id !== 'pickup') || stops[stops.length - 1];
        socket.emit("carpool:join:request", {
          rideId: pool.rideId,
          userId: user?.id || user?._id || "507f1f77bcf86cd799439011",
          name: user?.name,
          photo: user?.profilePhoto, // Include photo
          seats: 1,
          pickup: userLoc,
          drop: dropLoc?.coords,
          paymentMethod
        });
        toast.success(`Joining ${pool.driverName}'s ride...`);
        rideState.setIsRequestingRide(true);
        return;
      }
    }

    handleRequestRideExtended(paymentMethod);
  };

  const handleRequestRideExtended = (methodOverride?: string) => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    const currentFare = isSharedRide ? (vehicleType === 'bike' ? 40 : 100) : estimatedRideFare;
    const activeMethod = methodOverride || paymentMethod;

    if (activeMethod === "WALLET" && (user.walletBalance || 0) < currentFare) {
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
      fare: estimatedRideFare,
      promoCode: selectedPromo?.code || null,
      distance: routeInfo?.distance || 0,
      duration: routeInfo?.duration || 0,
      paymentMethod: activeMethod
    };

    socket.emit("ride-request", payload);
    toast.success("Searching for nearby drivers...");
  };

  const handleJoinCarpool = (poolId: string) => {
    setSelectedCarpoolId(prev => prev === poolId ? null : poolId); // Toggle selection
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
      <div className="absolute top-20 lg:top-10 left-4 lg:left-10 right-4 lg:right-auto z-30 lg:w-[440px] max-h-[calc(100vh-180px)] pointer-events-none flex flex-col gap-6">

        {/* Floating Search Bar (Uber UI) */}
        <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden flex flex-col relative z-20 pointer-events-auto transition-all shrink-0">
          <div className="px-5 py-5 flex items-start gap-8 relative z-10">
            {/* Action Column */}
            <div className="flex flex-col items-center shrink-0 w-10 relative">
              {(stops.some((s: any) => s.query || s.coords) || isRouteSearched) ? (
                <button
                  type="button"
                  onClick={rideState.resetRideState}
                  className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 text-[#0A192F] hover:bg-slate-50 rounded-full transition-all pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.1)] active:scale-90 cursor-pointer relative z-[100]" 
                  title="Clear & Reset"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-11 h-11" />
              )}
            </div>

            {/* Vertical Line Indicators - Centered under the arrow column (at 40px) */}
            <div className="absolute left-[41px] top-[80px] bottom-[48px] w-[2px] bg-slate-200 pointer-events-none" />

            {/* Inputs Column */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 z-10 w-full relative pointer-events-auto">
              {displayStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="relative flex items-center gap-2 group/row"
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                >
                  <div className="absolute -left-[68px] flex items-center justify-center w-8 h-full pointer-events-none">
                    {idx === 0 ? (
                      <div className="w-[9px] h-[9px] bg-black rounded-full z-10 shadow-sm" />
                    ) : idx === displayStops.length - 1 ? (
                      <div className="w-[11px] h-[11px] bg-white border-[3px] border-black z-10 shadow-sm" />
                    ) : (
                      <div className="w-[8px] h-[8px] bg-slate-400 rounded-full z-10" />
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
      <div className="absolute bottom-24 lg:bottom-auto lg:top-28 left-4 lg:left-auto lg:right-8 right-4 z-30 lg:w-[420px] lg:h-[calc(100vh-140px)] pointer-events-none flex flex-col justify-end lg:justify-start">

        {/* Ride Choices Panel */}
        {isRouteSearched && !activeRide && (
          <div className="bg-white/95 backdrop-blur-3xl rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.3)] p-4 sm:p-5 border border-white/50 pointer-events-auto flex flex-col h-fit max-h-[80vh] lg:max-h-[92vh] overflow-hidden w-full lg:w-[400px]">
            <h3 className="text-xl font-black text-[#0A192F] mb-3 tracking-tight text-center shrink-0 uppercase">Pick your ride</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 shadow-inner mx-2 shrink-0">
              <button onClick={() => { rideState.setIsSharedRide(false); rideState.setVehicleType('go'); }} className={`flex-1 py-2.5 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${!isSharedRide ? 'bg-white shadow-sm text-[#0A192F]' : 'text-slate-400 hover:text-slate-600'}`}>Solo Ride</button>
              <button onClick={() => { rideState.setIsSharedRide(true); rideState.setVehicleType('go'); }} className={`flex-1 py-2.5 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all ${isSharedRide ? 'bg-[#FFD700] shadow-sm text-[#0A192F]' : 'text-slate-400 hover:text-slate-600'}`}>Share & Save 40%</button>
            </div>

            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto px-2 custom-scrollbar">
              {isSharedRide ? (
                <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto px-2 custom-scrollbar">
                  {availableCarpools.length > 0 ? (
                    availableCarpools.map((pool) => {
                      const isSelected = selectedCarpoolId === pool.rideId;
                      return (
                        <button
                          key={pool.rideId}
                          onClick={() => handleJoinCarpool(pool.rideId)}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-2xl border-2 transition-all group shrink-0 relative overflow-hidden bg-white ${isSelected
                              ? 'border-[#0A192F] shadow-md ring-1 ring-[#0A192F] bg-slate-50/50'
                              : 'border-slate-50 hover:border-[#0A192F]/20 hover:bg-slate-50 shadow-sm'
                            }`}
                        >
                          {/* Driver Profile Image with Normalization */}
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                              {(() => {
                                const rawPhoto = pool.driverPhoto;
                                if (false && !rawPhoto) return (
                                  <div className="w-full h-full bg-[#FFD700] flex items-center justify-center">
                                    {pool.requestedVehicleType === 'bike' ? (
                                      <Bike className="w-5 h-5 text-[#0A192F]" />
                                    ) : (
                                      <Car className="w-5 h-5 text-[#0A192F]" />
                                    )}
                                  </div>
                                );

                                const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
                                const driverName = pool.driverName || "Driver";
                                let finalSrc = rawPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0A192F&color=FFD700&bold=true`;
                                if (rawPhoto.includes('amazonaws.com') && rawPhoto.includes('goride/profiles/')) {
                                  const filename = rawPhoto.split('/').pop();
                                  finalSrc = `${baseUrl}/api/auth/profile-photo/${filename}`;
                                } else if (!rawPhoto.startsWith('http') && !rawPhoto.startsWith('data:')) {
                                  finalSrc = `${baseUrl}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
                                }

                                return (
                                  <img
                                    src={finalSrc}
                                    alt="Driver"
                                    className="w-full h-full object-cover shadow-inner"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pool.driverName || "Driver")}&background=0A192F&color=FFD700&bold=true`;
                                    }}
                                  />
                                );
                              })()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0A192F] border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                              {(pool.requestedVehicleType === 'bike') ? (
                                <Bike className="w-2 h-2 text-[#FFD700]" />
                              ) : (
                                <Car className="w-2 h-2 text-[#FFD700]" />
                              )}
                            </div>
                          </div>

                          {/* Driver & Trip Info */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-black text-[#0A192F] text-[13px] truncate tracking-tight uppercase leading-none">{pool.driverName || "Driver"}</p>
                              <p className="font-black text-[14px] text-[#0A192F] shrink-0">₹{pool.pricePerSeat}</p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex items-center gap-0.5 text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded-md">
                                <Star className="w-2 h-2 fill-amber-600" />
                                <span>{pool.driverRating || 4.8}</span>
                              </div>
                              <span className="text-[10px] font-black text-slate-400">•</span>
                              <span className="text-[8px] font-black text-slate-500 tracking-wider uppercase">{pool.requestedVehicleType === 'bike' ? 'BIKE' : 'SEDAN'}</span>
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 ml-auto">
                                <Users className="w-2 h-2" />
                                <span className="text-[8px] font-black uppercase whitespace-nowrap">{pool.availableSeats} LEFT</span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#0A192F]" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-14 flex flex-col items-center justify-center text-center px-8 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100 mt-4">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-5 shadow-sm">
                        <Users className="text-slate-200 w-10 h-10" />
                      </div>
                      <h4 className="text-[#0A192F] font-black text-[18px] mb-2 tracking-tight">No shared rides nearby.</h4>
                      <p className="text-slate-500 font-medium text-[13px] leading-relaxed">
                        Don't see a match? Start a shared ride yourself and <span className="text-emerald-600 font-bold">save 40%</span>.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 mt-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1 scroll-smooth">
                  {CAR_STYLES.map(style => {
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
                          <p className={`text-[10px] font-black uppercase mt-1 ${isSelected ? 'text-[#0A192F]/40' : 'text-slate-300'}`}>Starts at ₹{style.baseFare}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Selection Section */}
            <div className="mt-3 px-2 space-y-2 shrink-0 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">How to Pay</p>
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
                    <span className="text-[10px] font-black uppercase">Online</span>
                    <span className="text-[8px] font-bold opacity-60">Pay now</span>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex-1 py-3 px-2 rounded-[18px] transition-all flex items-center justify-center gap-2 ${paymentMethod === "CASH" ? 'bg-[#0A192F] text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  <Banknote className="w-4 h-4" />
                  <div className="flex flex-col items-start leading-none gap-1">
                    <span className="text-[10px] font-black uppercase">Cash</span>
                    <span className="text-[8px] font-bold opacity-60">Pay in car</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Super Compact Promotions Section */}
            {promotions.length > 0 && (
              <div className="mt-2 px-2 bg-slate-50/50 py-2 rounded-[22px] border border-slate-200/50">
                <div className="flex items-center gap-2">
                  {/* Compact Manual Input */}
                  <div className="flex-1 flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 transition-all focus-within:ring-2 focus-within:ring-[#0A192F]/5 min-w-0">
                    <Tag className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Got a coupon?"
                      className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-[#0A192F] w-full placeholder:text-slate-400 placeholder:normal-case min-w-0"
                      value={manualPromoCode}
                      onChange={(e) => setManualPromoCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyManualPromo()}
                    />
                    <button
                      onClick={handleVerifyManualPromo}
                      disabled={isVerifyingPromo || !manualPromoCode.trim()}
                      className="h-5 px-2 bg-[#0A192F] text-[#FFD700] rounded-full text-[8px] font-black uppercase tracking-tighter disabled:opacity-30 flex items-center justify-center shrink-0"
                    >
                      {isVerifyingPromo ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <span>Apply</span>}
                    </button>
                  </div>

                  {/* Remove Button if active */}
                  {selectedPromo && (
                    <button onClick={() => setSelectedPromo(null)} className="shrink-0 p-1.5 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar scroll-smooth">
                  {promotions.map((promo) => (
                    <button
                      key={promo._id}
                      onClick={() => setSelectedPromo(selectedPromo?._id === promo._id ? null : promo)}
                      className={`shrink-0 py-1.5 px-3 rounded-full transition-all border ${selectedPromo?._id === promo._id ? 'bg-[#0A192F] border-[#0A192F] text-[#FFD700] shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-white'}`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-tight">{promo.code}</span>
                      <span className="text-[8px] font-bold ml-1.5 opacity-80">
                        {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `₹${promo.value}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-2 mt-3 shrink-0 pt-2 border-t border-slate-100 bg-white/95">
              <button
                onClick={handleCreateRequest}
                disabled={isRequestingRide || loadingDrivers || isProcessingPayment}
                className="w-full py-4 bg-[#0A192F] hover:bg-black text-[#FFD700] rounded-[20px] font-black text-[15px] uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex flex-col items-center justify-center gap-1 shrink-0 px-4"
              >
                {isRequestingRide || isProcessingPayment ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isProcessingPayment ? "Processing Payment" : (isSharedRide && selectedCarpoolId ? "Joining Pool" : "Searching Drivers")}</span>
                    </div>
                    {searchCountdown !== null && (
                      <span className="text-[11px] opacity-70 tracking-widest font-bold">
                        {Math.floor(searchCountdown / 60)}:{(searchCountdown % 60).toString().padStart(2, '0')} remaining
                      </span>
                    )}
                  </>
                ) : (
                  <span>
                    {isSharedRide
                      ? (selectedCarpoolId
                        ? `Join ${availableCarpools.find((p: any) => p.rideId === selectedCarpoolId)?.driverName || 'Pool'}`
                        : "Request Shared Ride")
                      : `Request ${CAR_STYLES.find((s: any) => s.id === vehicleType)?.name || "Ride"}`}
                  </span>
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
          <div className="bg-white/95 backdrop-blur-3xl rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] p-0 border border-white/20 pointer-events-auto shrink-0 relative overflow-hidden transition-all duration-700 w-full lg:w-[420px]">
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
                    {activeUnreadCount > 0 && (
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="w-full flex items-center justify-between gap-3 mt-3 px-4 py-3 bg-amber-50 text-[#0A192F] rounded-2xl border border-amber-200 shadow-sm hover:bg-amber-100 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#0A192F] text-[#FFD700] flex items-center justify-center shrink-0">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest">New Driver Message</p>
                            <p className="text-xs font-semibold text-slate-600 truncate">
                              {latestIncomingChat?.message || "Tap to open chat"}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 min-w-6 h-6 px-2 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                          {activeUnreadCount}
                        </span>
                      </button>
                    )}

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
                        onClick={() => setIsChatOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-[#0A192F] rounded-xl border border-slate-200 hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-widest relative"
                        title="Chat with Driver"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                        {(() => {
                          const chatKey = `${activeRide?.rideId || activeRide?._id || ""}_${[String(user?.id || user?._id), String(activeRide?.driverId?._id || activeRide?.driverId)].sort().join("_")}`;
                          const unreadCount = unreadChatMessages[chatKey] || 0;
                          if (unreadCount > 0) return (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white shadow-lg animate-bounce">
                              {unreadCount}
                            </span>
                          );
                          return null;
                        })()}
                      </button>
                      {/* 🚨 Report button — compact, inline with Call/Chat */}
                      {(activeRide.status === "ACCEPTED" || activeRide.status === "ARRIVED" || activeRide.status === "STARTED") && (
                        <button
                          onClick={() => setIsReportOpen(true)}
                          className="w-10 h-9 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl border border-amber-200 hover:bg-amber-100 transition-all shrink-0"
                          title="Report an issue"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
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
              <div className="mt-8 flex flex-col gap-3">
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

                <div className="relative w-full max-w-[420px] h-full sm:h-auto max-h-screen sm:max-h-[92vh] flex flex-col bg-white rounded-none sm:rounded-[32px] shadow-[0_45px_120px_rgba(0,0,0,0.7)] text-center animate-slide-up pointer-events-auto overflow-hidden">
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
                        {activeRide.paymentMethod === 'UPI' && !isPaymentDone ? (
                          <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex flex-col items-center gap-4">
                            <div className="w-full flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-left">
                              <div className="w-9 h-9 rounded-xl bg-[#0A192F] text-[#FFD700] flex items-center justify-center shrink-0">
                                <QrCode className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0A192F]">Complete Your UPI Payment Now</p>
                                <p className="text-xs font-semibold text-slate-600 mt-1">Your trip is finished, but payment is still pending. Tap below to complete the fare.</p>
                              </div>
                            </div>

                            <div className="w-16 h-16 bg-[#0A192F] text-[#FFD700] rounded-full flex items-center justify-center shadow-lg">
                              <IndianRupee className="w-8 h-8" />
                            </div>

                            <div className="text-center">
                              <h4 className="text-[#0A192F] font-black uppercase tracking-tight text-xl italic leading-none">Complete Payment</h4>
                              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Outstanding Balance: ₹{getRideSettlementAmount(activeRide)}</p>
                            </div>

                            {/* Apply Offer at Settlement */}
                            <div className="w-full flex flex-col gap-3 mt-4">
                              <div className="flex items-center justify-between px-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apply Offer</p>
                                {activeRide.promoCode && (
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-tighter">Applied: {activeRide.promoCode}</span>
                                )}
                              </div>

                              {!activeRide.promoCode && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                  {promotions.slice(0, 3).map((p) => (
                                    <button
                                      key={p._id}
                                      onClick={async () => {
                                        try {
                                          const { data } = await api.post("/rides/apply-promo", { rideId: activeRide.rideId || activeRide._id, code: p.code });
                                          toast.success(data.message);
                                          const resp = await api.get("/rides/active");
                                          rideState.setActiveRide(resp.data);
                                        } catch (err: any) {
                                          toast.error(err?.response?.data?.message || "Failed");
                                        }
                                      }}
                                      className="shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 hover:border-[#0A192F] hover:bg-slate-50 transition-all min-w-[95px] shadow-sm active:scale-95"
                                    >
                                      <Tag className="w-3 h-3 text-[#0A192F] mb-1" />
                                      <span className="text-[10px] font-black text-[#0A192F] uppercase">{p.code}</span>
                                      <span className="text-[8px] font-bold text-emerald-600">-{p.type === 'PERCENTAGE' ? `${p.value}%` : `₹${p.value}`}</span>
                                    </button>
                                  ))}
                                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 min-w-[140px] shadow-sm">
                                    <input
                                      type="text"
                                      placeholder="Code"
                                      className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-[#0A192F] px-1 w-full"
                                      value={promoCodeInput}
                                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                                    />
                                    <button
                                      onClick={async () => {
                                        if (!promoCodeInput) return;
                                        try {
                                          const { data } = await api.post("/rides/apply-promo", { rideId: activeRide.rideId || activeRide._id, code: promoCodeInput });
                                          toast.success(data.message);
                                          const resp = await api.get("/rides/active");
                                          rideState.setActiveRide(resp.data);
                                          setPromoCodeInput("");
                                        } catch (err: any) {
                                          toast.error(err?.response?.data?.message || "Invalid");
                                        }
                                      }}
                                      className="w-7 h-7 bg-[#0A192F] text-[#FFD700] rounded-xl flex items-center justify-center shrink-0 shadow-md active:scale-90"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={async () => {
                                const fare = getRideSettlementAmount(activeRide);
                                const rId = activeRide.rideId || activeRide._id;
                                const dId = activeRide.driverId?._id || activeRide.driverId;
                                const success = await processPayment(fare, rId, dId);
                                if (success) setIsPaymentDone(true);
                              }}
                              disabled={isProcessingPayment}
                              className="w-full py-4 mt-2 bg-[#0A192F] text-[#FFD700] rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-black shadow-xl hover:shadow-[#0A192F]/20"
                            >
                              {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                              {isProcessingPayment ? "Opening UPI..." : `Pay ₹${getRideSettlementAmount(activeRide)} Now`}
                            </button>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}

                        <button
                          onClick={() => setRatingStep(2)}
                          disabled={rating === 0 || (activeRide.paymentMethod === 'UPI' && !isPaymentDone)}
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
                                setIsPaymentDone(false);
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

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rideId={activeRide?.rideId || activeRide?._id || ""}
        userId={user?.id || user?._id || ""}
        receiverId={activeRide?.driverId?._id || activeRide?.driverId || ""}
        receiverName={activeRide?.driverInfo?.name || "Driver"}
        senderName={user.firstName ? `${user.firstName} ${user.lastName}` : (user.name || "Passenger")}
      />

      {/* 🚨 Emergency Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 pointer-events-auto">
          <div className="absolute inset-0 bg-[#0A192F]/80 backdrop-blur-2xl" onClick={() => !isSubmittingReport && setIsReportOpen(false)} />

          <div className="relative w-full max-w-[400px] bg-white rounded-[32px] shadow-[0_50px_120px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

            {reportSubmitted ? (
              /* Success State */
              <div className="p-10 flex flex-col items-center justify-center text-center gap-5">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-100 animate-in zoom-in duration-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#0A192F] tracking-tight">Report Sent</h3>
                  <p className="text-slate-500 font-medium text-sm mt-1">Our safety team has been alerted and will respond shortly.</p>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-[grow_2.5s_ease-in-out_forwards]" style={{ width: '100%', transformOrigin: 'left', animation: 'grow 2.5s ease-in-out forwards' }} />
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-rose-500 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white tracking-tight">Report an Issue</h2>
                    <p className="text-rose-200 font-medium text-xs mt-0.5">Your safety is our top priority</p>
                  </div>
                  <button onClick={() => setIsReportOpen(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Report Type */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Type of Incident</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: "HARASSMENT", label: "Harassment", emoji: "😡" },
                        { id: "ACCIDENT", label: "Accident", emoji: "⚠️" },
                        { id: "THEFT", label: "Theft", emoji: "🚨" },
                        { id: "OTHER", label: "Other", emoji: "📋" },
                      ] as const).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setReportType(opt.id)}
                          className={`py-3 px-4 rounded-2xl border-2 font-black text-[12px] transition-all flex items-center gap-2 ${reportType === opt.id
                              ? "border-rose-500 bg-rose-50 text-rose-600 shadow-md"
                              : "border-slate-100 text-slate-500 hover:border-slate-200 bg-slate-50"
                            }`}
                        >
                          <span>{opt.emoji}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Describe the Incident</p>
                    <textarea
                      value={reportDesc}
                      onChange={e => setReportDesc(e.target.value)}
                      placeholder="Please describe what happened in detail..."
                      rows={4}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-[#0A192F] outline-none focus:border-rose-300 resize-none transition-all placeholder:text-slate-300"
                    />
                  </div>

                  {/* Driver Info Badge */}
                  {(activeRide?.driverInfo?.name || activeRide?.driverName) && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-9 h-9 bg-[#0A192F] rounded-xl flex items-center justify-center">
                        <Car className="w-4 h-4 text-[#FFD700]" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reporting about driver</p>
                        <p className="text-sm font-black text-[#0A192F]">{activeRide?.driverInfo?.name || activeRide?.driverName}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmitReport}
                    disabled={isSubmittingReport || !reportDesc.trim()}
                    className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-rose-500/30 disabled:opacity-40 flex items-center justify-center gap-3"
                  >
                    {isSubmittingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                    {isSubmittingReport ? "Sending Report..." : "Submit Report"}
                  </button>

                  <p className="text-center text-[10px] font-bold text-slate-400 leading-relaxed">
                    This report is confidential and will be reviewed by our safety team immediately.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
