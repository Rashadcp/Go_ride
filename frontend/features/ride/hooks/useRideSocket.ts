import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";
import { useRideStore } from "@/features/ride/store/useRideStore";
import api from "@/lib/axios";

export const useRideSocket = (user: any) => {
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
    setAvailableCarpools
  } = useRideStore();

  const rideRequestLock = useRef(false);

  useEffect(() => {
    if (!user) return;

    connectSocket();

    const fetchActiveRide = async () => {
      try {
        const response = await api.get("/rides/active");
        if (response.data) {
          setActiveRide(response.data);
          setPendingRideId(response.data.rideId);
          if (response.data.driverId) {
            socket.emit("join-ride", { driverId: response.data.driverId });
          }
        }
      } catch (error) {
        console.error("Error fetching active ride:", error);
      }
    };

    fetchActiveRide();

    const handleSocketConnect = () => {
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
      rideRequestLock.current = false;
      socket.emit("join-ride", { driverId: data.driverId });
      toast.success(`Ride accepted by ${data.driverInfo?.name || "Driver"}!`);
    };

    const handleRideStatusUpdate = (data: any) => {
      const { status } = data;
      setActiveRide((prev: any) => ({ ...prev, status }));
      if (status === "ARRIVED") toast.success("Driver has arrived at pickup!");
      if (status === "STARTED") toast.success("Trip has started!");
      if (status === "COMPLETED") {
        toast.success("Destination reached!");
        setActiveRide(null);
        setPendingRideId(null);
        setIsRequestingRide(false);
        setIsRouteSearched(false);
        setSearchStarted(false);
        setLoadingDrivers(false);
        rideRequestLock.current = false;
      }
    };

    const handleRideRequestFailed = (data: any) => {
      setIsRequestingRide(false);
      setPendingRideId(null);
      setLoadingDrivers(false);
      rideRequestLock.current = false;
      toast.error(data.reason || "Ride request failed");
    };

    const handleEtaUpdate = (data: any) => {
      setActiveRide((prev: any) => ({ ...prev, eta: data.eta }));
    };

    const handleRideCancelled = () => {
      setActiveRide(null);
      setPendingRideId(null);
      setIsRequestingRide(false);
      setIsRouteSearched(false);
      setSearchStarted(false);
      setLoadingDrivers(false);
      rideRequestLock.current = false;
      toast.error("Ride cancelled.");
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
    socket.on("available-carpools", (pools: any[]) => {
      setAvailableCarpools(pools);
      setLoadingDrivers(false);
    });

    socket.on("carpool:join:new_request", (data: any) => {
      setIncomingCarpoolRequests((prev) => [...prev, data]);
      toast.success(`Pool Request: New join request!`);
    });

    socket.on("carpool:join:accepted", (data: any) => {
      toast.success("Joined carpool successfully!");
      setActiveRide(data.ride);
      setDashboardStep("ACTIVE");
    });

    if (socket.connected) {
      handleSocketConnect();
    }

    const pollInterval = setInterval(() => {
      const stateId = useRideStore.getState().activeRide?.rideId;
      if (!stateId) {
        socket.emit("get-active-drivers");
        if (useRideStore.getState().isSharedRide) {
           socket.emit("get-available-carpools");
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
      
      socket.off("carpool:join:new_request");
      socket.off("carpool:join:accepted");
      disconnectSocket();
      clearInterval(pollInterval);
      rideRequestLock.current = false;
    };
  }, [user]);

  const handleCancelRide = () => {
    const { activeRide, pendingRideId } = useRideStore.getState();
    const rideId = activeRide?.rideId || pendingRideId;
    if (!rideId || !user) return;

    socket.emit("ride-cancel", {
        rideId,
        passengerId: user.id,
        driverId: activeRide?.driverId,
    });
    setActiveRide(null);
    setPendingRideId(null);
    setIsRequestingRide(false);
    setIsRouteSearched(false);
    setSearchStarted(false);
    setLoadingDrivers(false);
    rideRequestLock.current = false;
    toast.error("Ride cancelled.");
  };

  return { handleCancelRide, rideRequestLock };
};
