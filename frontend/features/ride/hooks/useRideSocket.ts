import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";
import { useRideStore } from "@/features/ride/store/useRideStore";
import api from "@/lib/axios";

export const useRideSocket = (user: any, enableListeners = true) => {
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
    resetRideState,
    isDriverMode
  } = useRideStore();

  const queryClient = useQueryClient();


  useEffect(() => {
    if (!enableListeners || !user) return;

    connectSocket();

    const fetchActiveRide = async () => {
      try {
        const response = await api.get("/rides/active");
        if (response.data) {
          const ride = response.data;
          // Normalize driver data: if driverId is an object (populated), use it as driverInfo
          if (ride.driverId && typeof ride.driverId === 'object') {
            // Failsafe: if ride is already completed, clear it and return
            if (ride.status === "COMPLETED" || ride.status === "CANCELLED") {
               setActiveRide(null);
               setPendingRideId(null);
               return;
            }

            ride.driverInfo = {
              ...ride.driverInfo,
              ...ride.driverId,
              name: ride.driverId.name,
              profilePhoto: ride.driverId.profilePhoto,
              vehiclePlate: ride.driverId.vehicleNumber || ride.driverInfo?.vehiclePlate || "NOT AVAILABLE",
              location: ride.driverLocation || ride.driverInfo?.location
            };
            ride.driverId = ride.driverId._id || ride.driverId.id;
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
      setVisibleNearbyDrivers(drivers);
      setLoadingDrivers(false);
    };

    const handleRideAccepted = (data: any) => {
      setActiveRide(data);
      setPendingRideId(data.rideId || null);
      setIsRequestingRide(false);
      setLoadingDrivers(false);
      socket.emit("join-ride", { driverId: data.driverId, rideId: data.rideId });
      toast.success(`Ride accepted by ${data.driverInfo?.name || "Driver"}!`);
    };

    const handleRideStatusUpdate = (data: any) => {
      const { status, ride } = data;
      
      if (status === "COMPLETED") {
        toast.success("Destination reached!");
        setActiveRide((prev: any) => ({ ...prev, status: "COMPLETED" }));
        return;
      }
      
      if (ride) {
        setActiveRide(ride);
      } else {
        setActiveRide((prev: any) => ({ ...prev, status }));
      }

      if (status === "ARRIVED") toast.success("Driver has arrived at pickup!");
      if (status === "STARTED") toast.success("Trip has started!");
      if (status === "ACCEPTED") toast.success("Ride request accepted!");
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
    };

    const handleWalletUpdate = (data: { balance: number }) => {
      // Invalidate queries to refresh UI with real data
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // Optional: if user is not in a query but in a store, update store here
      console.log("💰 Wallet balance updated via socket:", data.balance);
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
      setAvailableCarpools(pools);
      setLoadingDrivers(false);
    });

    socket.on("carpool:join:new_request", (data: any) => {
      setIncomingCarpoolRequests((prev) => [...prev, data]);
      toast.success(`Pool Request: New join request!`);
    });

    socket.on("ride:update", (updatedRide: any) => {
      const currentActiveRide = useRideStore.getState().activeRide;
      if (currentActiveRide && (currentActiveRide.rideId === updatedRide.rideId || currentActiveRide._id === updatedRide._id)) {
        setActiveRide(updatedRide);
      }
    });

    socket.on("carpool:join:accepted", (data: any) => {
      toast.success("Joined carpool successfully!");
      setActiveRide(data.ride);
      setDashboardStep("ACTIVE");
    });

    socket.on("carpool:join:rejected", (data: any) => {
      toast.error(data.reason || "Carpool join request declined.");
    });

    if (socket.connected) {
      handleSocketConnect();
    }

    const pollInterval = setInterval(() => {
      const stateId = useRideStore.getState().activeRide?.rideId;
      if (!stateId) {
        socket.emit("get-active-drivers");
        if (useRideStore.getState().isSharedRide) {
           const pickup = useRideStore.getState().stops.find(s => s.id === 'pickup' && s.coords);
           const dest = useRideStore.getState().stops.find(s => s.id !== 'pickup' && s.coords);
           socket.emit("get-available-carpools", { 
               pickup: pickup?.coords ? { lat: pickup.coords[0], lng: pickup.coords[1] } : null,
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
      disconnectSocket();
      clearInterval(pollInterval);
    };
  }, [user, enableListeners, isDriverMode]);

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
};
