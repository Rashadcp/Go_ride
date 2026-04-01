import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MessageCircle, Info } from "lucide-react";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";
import { useRideStore } from "@/features/ride/store/useRideStore";
import api from "@/lib/axios";

export function useRideSocket(user: any, enableListeners = true): { handleCancelRide: () => void } {
  const {
    setActiveRide,
    setPendingRideId,
    setIsRequestingRide,
    setLoadingDrivers,
    setVisibleNearbyDrivers,
    setIsRouteSearched,
    setSearchStarted,
    setIncomingCarpoolRequests,
    setDashboardStep,
    setAvailableCarpools,
    availableCarpools,
    isSharedRide,
    stops,
    resetRideState,
    isDriverMode,
    userLoc,
    addChatMessage,
    incrementUnreadCount
  } = useRideStore();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enableListeners || !user) return;

    connectSocket();

    const normalizeRide = (rideData: any, previousRide?: any) => {
      if (!rideData) return rideData;

      const normalizedRide = { ...(previousRide || {}), ...rideData };
      const rawDriver = normalizedRide.driverId;

      if (rawDriver && typeof rawDriver === "object") {
        normalizedRide.driverInfo = {
          ...(previousRide?.driverInfo || {}),
          ...(normalizedRide.driverInfo || {}),
          ...rawDriver,
          name: rawDriver.name || normalizedRide.driverInfo?.name || previousRide?.driverInfo?.name,
          profilePhoto: rawDriver.profilePhoto || rawDriver.photo || normalizedRide.driverInfo?.profilePhoto || previousRide?.driverInfo?.profilePhoto,
          vehiclePlate: rawDriver.vehicleNumber || rawDriver.vehiclePlate || normalizedRide.driverInfo?.vehiclePlate || previousRide?.driverInfo?.vehiclePlate || "NOT AVAILABLE",
          location: normalizedRide.driverLocation || normalizedRide.driverInfo?.location || previousRide?.driverInfo?.location
        };
        normalizedRide.driverId = rawDriver._id || rawDriver.id;
      } else if (normalizedRide.driverInfo || previousRide?.driverInfo) {
        normalizedRide.driverInfo = {
          ...(previousRide?.driverInfo || {}),
          ...(normalizedRide.driverInfo || {}),
          location: normalizedRide.driverLocation || normalizedRide.driverInfo?.location || previousRide?.driverInfo?.location
        };
      }

      if (!normalizedRide.rideId && normalizedRide._id) {
        normalizedRide.rideId = normalizedRide._id;
      }

      return normalizedRide;
    };

    const fetchActiveRide = async () => {
      try {
        const response = await api.get("/rides/active");
        if (response.data) {
          const ride = normalizeRide(response.data);
          if (ride.status === "COMPLETED" || ride.status === "CANCELLED") {
             setActiveRide(null);
             setPendingRideId(null);
             return;
          }
          
          setActiveRide(ride);
          setPendingRideId(ride.rideId);
          setIsRequestingRide(false);
          if (ride.driverId || ride.rideId) {
            socket.emit("join-ride", { driverId: ride.driverId, rideId: ride.rideId });
          }
        }
      } catch (error) {
        console.error("Error fetching active ride:", error);
      }
    };

    fetchActiveRide();

    const handleSocketConnect = () => {
      socket.emit("join", { 
          userId: user.id || user._id || "507f1f77bcf86cd799439011", 
          role: isDriverMode ? "DRIVER" : "USER" 
      });
      socket.emit("get-active-drivers");
    };

    const handleActiveDrivers = (drivers: any[]) => {
      const currentId = user?.id || user?._id;
      const filtered = drivers.filter(d => String(d.driverId) !== String(currentId));
      setVisibleNearbyDrivers(filtered);
      setLoadingDrivers(false);
    };

    const handleRideAccepted = (data: any) => {
      const normalizedRide = normalizeRide({ ...(data.ride || {}), ...data });
      setActiveRide((prev: any) => normalizeRide(normalizedRide, prev));
      setPendingRideId(normalizedRide?.rideId || data.rideId || null);
      setIsRequestingRide(false);
      setLoadingDrivers(false);
      if (normalizedRide?.driverId || normalizedRide?.rideId) {
        socket.emit("join-ride", { driverId: normalizedRide.driverId, rideId: normalizedRide.rideId });
      }
      toast.success(`Ride accepted by ${normalizedRide?.driverInfo?.name || "Driver"}!`);
    };

    const handleRideStatusUpdate = (data: any) => {
      const { status, ride } = data;
      if (status === "COMPLETED") {
        const currentActiveRide = useRideStore.getState().activeRide;
        const currentUserId = String(user?.id || user?._id || "");
        const currentRideDriverId = String(currentActiveRide?.driverId?._id || currentActiveRide?.driverId || "");
        const isDriverViewingOwnRide = currentRideDriverId === currentUserId;
        const isSharedPassengerRide = !!currentActiveRide && !isDriverViewingOwnRide && (currentActiveRide.type === "CARPOOL" || currentActiveRide.isSharedRide || ride?.type === "CARPOOL" || ride?.isSharedRide);

        toast.success("Destination reached!");

        if (isSharedPassengerRide) {
          setActiveRide(null);
          setPendingRideId(null);
          setIsRequestingRide(false);
          queryClient.invalidateQueries({ queryKey: ['ridesHistory'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          return;
        }

        setActiveRide((prev: any) => normalizeRide({
          ...(ride || {}),
          status: "COMPLETED"
        }, prev));
        // Ensure history is fresh
        queryClient.invalidateQueries({ queryKey: ['ridesHistory'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        return;
      }
      if (ride) {
        setActiveRide((prev: any) => normalizeRide({
          ...ride,
          status: ride.status || status
        }, prev));
      } else {
        setActiveRide((prev: any) => ({ ...prev, status }));
      }
      if (status === "ARRIVED") toast.success("Driver has arrived at pickup!", { id: 'ride-status' });
      if (status === "STARTED") toast.success("Trip has started!", { id: 'ride-status' });
      if (status === "ACCEPTED") toast.success("Ride request accepted!", { id: 'ride-status' });
    };

    const handleRideRequestFailed = (data: any) => {
      resetRideState();
      toast.error(data.reason || "Ride request failed");
    };

    const handleEtaUpdate = (data: any) => {
      setActiveRide((prev: any) => ({ ...prev, eta: data.eta }));
    };

    const handleRideCancelled = () => {
      resetRideState();
      toast.error("Ride cancelled.");
      queryClient.invalidateQueries({ queryKey: ['ridesHistory'] });
    };

    const handleWalletUpdate = (data: { balance: number }) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['ridesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    };

    const handleDriverLocationUpdate = (data: any) => {
      setActiveRide((prev: any) => {
        if (prev && prev.driverId === data.driverId) {
          return { ...prev, driverInfo: { ...prev.driverInfo, location: data.location } };
        }
        return prev;
      });
    };

    socket.on("connect", handleSocketConnect);
    socket.on("active-drivers", handleActiveDrivers);
    socket.on("ride-accepted", handleRideAccepted);
    socket.on("ride-status-update", handleRideStatusUpdate);
    socket.on("ride-request-failed", handleRideRequestFailed);
    socket.on("eta-update", handleEtaUpdate);
    socket.on("ride-cancelled", handleRideCancelled);
    socket.on("driver-location-update", handleDriverLocationUpdate);
    socket.on("wallet-update", handleWalletUpdate);
    socket.on("available-carpools", (pools: any[]) => {
      const currentId = user?.id || user?._id;
      const filtered = pools.filter(p => {
        const dId = p.driverId?._id || p.driverId || p.createdBy?._id || p.createdBy;
        return String(dId) !== String(currentId);
      });
      setAvailableCarpools(filtered);
      setLoadingDrivers(false);
    });

    socket.on("carpool:join:new_request", (data: any) => {
      setIncomingCarpoolRequests((prev) => [...prev, data]);
      toast.success(`Pool Request: New join request!`);
    });

    socket.on("ride:update", (updatedRide: any) => {
      const currentActiveRide = useRideStore.getState().activeRide;
      if (currentActiveRide && (currentActiveRide.rideId === updatedRide.rideId || currentActiveRide._id === updatedRide._id)) {
        const currentUserId = String(user?.id || user?._id || "");
        const currentRideDriverId = String(currentActiveRide.driverId?._id || currentActiveRide.driverId || "");
        const isDriverViewingOwnRide = currentRideDriverId === currentUserId;
        const isSharedPassengerRide = !isDriverViewingOwnRide && (currentActiveRide.type === "CARPOOL" || currentActiveRide.isSharedRide);
        const updatedPassengers = Array.isArray(updatedRide?.passengers) ? updatedRide.passengers : [];
        const passengerStillInRide = updatedPassengers.some(
          (passenger: any) => String(passenger.userId?._id || passenger.userId || "") === currentUserId
        );
        const currentPassengerEntry = updatedPassengers.find(
          (passenger: any) => String(passenger.userId?._id || passenger.userId || "") === currentUserId
        );

        if (isSharedPassengerRide && !passengerStillInRide) {
          if (currentActiveRide.status === "COMPLETED") {
            return;
          }
        }

        const nextRide = normalizeRide(updatedRide, currentActiveRide);
        if (isSharedPassengerRide && currentPassengerEntry?.tripStatus) {
          nextRide.status = currentPassengerEntry.tripStatus;
        }

        setActiveRide(nextRide);
      }
    });

    socket.on("carpool:join:accepted", (data: any) => {
      const normalizedRide = normalizeRide(data.ride);
      toast.success("Joined carpool successfully!");
      setActiveRide(normalizedRide);
      setPendingRideId(normalizedRide?.rideId || null);
      setIsRequestingRide(false);
      setLoadingDrivers(false);
      if (normalizedRide?.driverId || normalizedRide?.rideId) {
        socket.emit("join-ride", { driverId: normalizedRide.driverId, rideId: normalizedRide.rideId });
      }
      setDashboardStep("ACTIVE");
    });

    socket.on("carpool:join:rejected", (data: any) => {
      toast.error(data.reason || "Carpool join request declined.");
    });
    
    socket.on("chat:new_message", (data: any) => {
      const { rideId, senderId, receiverId, message, senderName } = data;
      if (String(receiverId) === String(user.id || user._id)) {
        const conversationKey = `${rideId}_${[String(senderId), String(receiverId)].sort().join("_")}`;
        addChatMessage(conversationKey, { ...data, isSelf: false });
        incrementUnreadCount(conversationKey);
        
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[28px] pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-slate-100`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-12 w-12 rounded-2xl bg-[#0A192F] flex items-center justify-center text-[#FFD700]">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-xs font-black text-[#0A192F] uppercase tracking-widest italic">Message from {senderName}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500 line-clamp-2 leading-relaxed">"{message}"</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-100">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000, id: `chat-${conversationKey}` });
      }
    });

    socket.on("system:alert", (data: { title: string, message: string, type: string }) => {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#0A192F] shadow-2xl rounded-[28px] pointer-events-auto flex ring-1 ring-white/10 overflow-hidden`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <div className="h-10 w-10 rounded-xl bg-[#FFD700] flex items-center justify-center text-[#0A192F]">
                    <Info className="w-5 h-5" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-xs font-black text-white uppercase tracking-widest">{data.title}</p>
                  <p className="mt-1 text-sm font-bold text-slate-300 leading-relaxed">{data.message}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-white/10">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black text-[#FFD700] uppercase tracking-widest hover:bg-white/5 active:scale-95 transition-all"
              >
                Okay
              </button>
            </div>
          </div>
        ), { duration: 8000 });
      });

    if (socket.connected) {
      handleSocketConnect();
    }

    const pollInterval = setInterval(() => {
      const stateId = useRideStore.getState().activeRide?.rideId;
      if (!stateId) {
        socket.emit("get-active-drivers");
        if (useRideStore.getState().isSharedRide) {
           const state = useRideStore.getState();
           const pickup = state.stops.find(s => s.id === 'pickup' && s.coords);
           const dest = state.stops.find(s => s.id !== 'pickup' && s.coords);
           const pCoords = pickup?.coords || state.userLoc;
           
           socket.emit("get-available-carpools", { 
               userId: user?.id || user?._id,
               pickup: pCoords ? { lat: pCoords[0], lng: pCoords[1] } : null,
               destination: dest?.coords ? { lat: dest.coords[0], lng: dest.coords[1] } : null 
           });
        }
      }
    }, 10000);

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("active-drivers", handleActiveDrivers);
      socket.off("ride-accepted", handleRideAccepted);
      socket.off("ride-status-update", handleRideStatusUpdate);
      socket.off("ride-request-failed", handleRideRequestFailed);
      socket.off("eta-update", handleEtaUpdate);
      socket.off("ride-cancelled", handleRideCancelled);
      socket.off("driver-location-update", handleDriverLocationUpdate);
      socket.off("wallet-update", handleWalletUpdate);
      
      socket.off("carpool:join:new_request");
      socket.off("carpool:join:accepted");
      socket.off("carpool:join:rejected");
      socket.off("chat:new_message");
      socket.off("system:alert");
      disconnectSocket();
      clearInterval(pollInterval);
    };
  }, [user?.id, user?._id, enableListeners, isDriverMode]);

  useEffect(() => {
    if (!enableListeners || !user || !isSharedRide) return;
    const fetchPools = () => {
      const state = useRideStore.getState();
      if (!state.activeRide) {
        const pickup = stops.find(s => s.id === 'pickup' && s.coords);
        const dest = stops.find(s => s.id !== 'pickup' && s.coords);
        const pCoords = pickup?.coords || userLoc;
        socket.emit("get-available-carpools", { 
          userId: user?.id || user?._id,
          pickup: pCoords ? { lat: pCoords[0], lng: pCoords[1] } : null,
          destination: dest?.coords ? { lat: dest.coords[0], lng: dest.coords[1] } : null 
        });
      }
    };
    fetchPools();
  }, [isSharedRide, stops, userLoc, enableListeners, user?.id, user?._id]);

  const handleCancelRide = () => {
    const { activeRide, pendingRideId } = useRideStore.getState();
    const rideId = activeRide?.rideId || pendingRideId;
    if (!rideId || !user) return;
    socket.emit("ride-cancel", {
        rideId,
        passengerId: user.id || user._id || "507f1f77bcf86cd799439011",
        driverId: activeRide?.driverId,
    });
    resetRideState();
    toast.error("Ride cancelled.");
  };

  return { handleCancelRide };
}
