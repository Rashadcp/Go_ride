"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { LayoutDashboard, History, Wallet, Settings, LogOut, Car, Bike, Ghost, Star, MapPin, Mic, ChevronRight, User as UserProfile, Navigation, Loader2, Plus, Trash2, CheckCircle2, Compass, Camera, Lock, Home, Briefcase, ArrowUpRight, ArrowDownLeft, CreditCard, ShieldCheck, Search, Users, HelpCircle, Info, Minus, Zap, Bell, Truck, UserCheck, FileText, CheckCircle, XCircle, SlidersHorizontal, MoreHorizontal, Eye, TrendingUp, IndianRupee, Clock, GripVertical, X, ArrowLeft } from "lucide-react";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center font-medium text-slate-400">
        Loading Map...</div>
});
// Custom Auto Rickshaw Icon SVG Component
const AutoRickshawIcon = ({ className }: {
    className?: string;
}) => (<svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <path d="M18 26h20c6.5 0 12.5 3.2 16.2 8.5L58 40v8H10V32.5A6.5 6.5 0 0 1 16.5 26H18Z" fill="currentColor" />
    <path d="M24 18h10c4.4 0 8 3.6 8 8H24v-8Z" fill="currentColor" opacity="0.8" />
    <path d="M18 26v-6a4 4 0 0 1 4-4h6v10H18Z" fill="currentColor" opacity="0.7" />
    <path d="M45 30h7.5L58 40h-9a4 4 0 0 1-4-4v-6Z" fill="currentColor" opacity="0.9" />
    <circle cx="22" cy="48" r="6" fill="#0A192F" />
    <circle cx="45" cy="48" r="6" fill="#0A192F" />
    <circle cx="22" cy="48" r="2.5" fill="white" />
    <circle cx="45" cy="48" r="2.5" fill="white" />
</svg>);
const SIDEBAR_ITEMS = [{ id: "dashboard", icon: LayoutDashboard, label: "Dashboard" }, { id: "history", icon: History, label: "Ride History" }, { id: "earnings", icon: TrendingUp, label: "Earnings" }, { id: "wallet", icon: Wallet, label: "Wallet" }, { id: "settings", icon: Settings, label: "Settings" }];
const DRIVERS: any[] = [];
const RIDES_HISTORY: any[] = [];
interface Stop {
    id: string;
    query: string;
    coords: [
        number,
        number
    ] | null;
    suggestions: any[];
    showSuggestions: boolean;
}
type RidePricingMode = "taxi" | "pool";
const RIDE_PRICING = {
    taxi: { baseFare: 40, perKm: 14, perMinute: 2, minimumFare: 60 },
    pool: { baseFare: 20, perKm: 8, perMinute: 1, minimumFare: 35 },
} satisfies Record<RidePricingMode, {
    baseFare: number;
    perKm: number;
    perMinute: number;
    minimumFare: number;
}>;
const calculateRideFare = (distanceKm: number, durationMins: number, mode: RidePricingMode) => {
    const pricing = RIDE_PRICING[mode];
    const computedFare = pricing.baseFare + distanceKm * pricing.perKm + durationMins * pricing.perMinute;
    return Math.max(pricing.minimumFare, Math.ceil(computedFare));
};
const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;
export default function UserDashboard() {
    const router = useRouter();
    const { user, isLoading: userLoading } = useUser();
    const { clearAuth } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const [activeTab, setActiveTab] = useState<string>("dashboard");
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [vehicleType, setVehicleType] = useState<"bike" | "auto" | "car">("car");
    const [isSharedRide, setIsSharedRide] = useState(false);
    const [isDriverMode, setIsDriverMode] = useState(false);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0 });
    const [seatsAvailable, setSeatsAvailable] = useState(4);
    const [bookedCount, setBookedCount] = useState(1);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [userLoc, setUserLoc] = useState<[
        number,
        number
    ] | null>(null);
    const [stops, setStops] = useState<Stop[]>([{ id: '1', query: '', coords: null, suggestions: [], showSuggestions: false }]);
    const [driverDest, setDriverDest] = useState<Stop>({ id: 'driver-dest', query: '', coords: null, suggestions: [], showSuggestions: false });
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchStarted, setSearchStarted] = useState(false);
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [drivers, setDrivers] = useState<any[]>([]);
    const debounceTimer = useRef<any>(null);
    const rideRequestLock = useRef(false);
    const searchPanelRef = useRef<HTMLDivElement | null>(null);
    // Socket states
    const [isRequestingRide, setIsRequestingRide] = useState(false);
    const [isRouteSearched, setIsRouteSearched] = useState(false);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [pendingRideId, setPendingRideId] = useState<string | null>(null);
    const [isDriverTripActive, setIsDriverTripActive] = useState(false);
    const activeRideRef = useRef<any>(null);
    const pendingRideIdRef = useRef<string | null>(null);

    useEffect(() => {
        activeRideRef.current = activeRide;
    }, [activeRide]);

    useEffect(() => {
        pendingRideIdRef.current = pendingRideId;
    }, [pendingRideId]);

    // --- Data Persistence ---
    useEffect(() => {
        if (!mounted) return;

        try {
            const savedIsDriverMode = localStorage.getItem("isDriverMode");
            const savedVehicleType = localStorage.getItem("vehicleType");
            const savedIsSharedRide = localStorage.getItem("isSharedRide");
            const savedSeatsAvailable = localStorage.getItem("seatsAvailable");
            const savedStops = localStorage.getItem("stops");
            const savedDriverDest = localStorage.getItem("driverDest");
            const savedIsRouteSearched = localStorage.getItem("isRouteSearched");
            const savedIsDriverTripActive = localStorage.getItem("isDriverTripActive");

            if (savedIsDriverMode !== null) setIsDriverMode(JSON.parse(savedIsDriverMode));
            if (savedVehicleType !== null) setVehicleType(JSON.parse(savedVehicleType));
            if (savedIsSharedRide !== null) setIsSharedRide(JSON.parse(savedIsSharedRide));
            if (savedSeatsAvailable !== null) setSeatsAvailable(JSON.parse(savedSeatsAvailable));
            if (savedIsRouteSearched !== null) setIsRouteSearched(JSON.parse(savedIsRouteSearched));
            if (savedIsDriverTripActive !== null) setIsDriverTripActive(JSON.parse(savedIsDriverTripActive));

            if (savedStops !== null) {
                const parsedStops = JSON.parse(savedStops);
                setStops(parsedStops.map((s: any) => ({ ...s, suggestions: [], showSuggestions: false })));
            }
            if (savedDriverDest !== null) {
                const parsedDest = JSON.parse(savedDriverDest);
                setDriverDest({ ...parsedDest, suggestions: [], showSuggestions: false });
            }
        } catch (error) {
            console.error("Error loading persisted data:", error);
        }
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("isDriverMode", JSON.stringify(isDriverMode));
        localStorage.setItem("vehicleType", JSON.stringify(vehicleType));
        localStorage.setItem("isSharedRide", JSON.stringify(isSharedRide));
        localStorage.setItem("seatsAvailable", JSON.stringify(seatsAvailable));
        localStorage.setItem("isRouteSearched", JSON.stringify(isRouteSearched));
        localStorage.setItem("isDriverTripActive", JSON.stringify(isDriverTripActive));

        // Only persist query and coords for stops/dest to keep storage clean
        localStorage.setItem("stops", JSON.stringify(stops.map(s => ({ id: s.id, query: s.query, coords: s.coords }))));
        localStorage.setItem("driverDest", JSON.stringify({ id: driverDest.id, query: driverDest.query, coords: driverDest.coords }));
    }, [isDriverMode, vehicleType, isSharedRide, seatsAvailable, isRouteSearched, isDriverTripActive, stops, driverDest, mounted]);

    useEffect(() => {
        if (!mounted || !user) {
            return;
        }
        connectSocket();

        // Fetch active ride on mount to restore state after refresh
        const fetchActiveRide = async () => {
            try {
                const response = await api.get("/rides/active");
                if (response.data) {
                    setActiveRide(response.data);
                    setPendingRideId(response.data.rideId);
                    // Rejoin ride room if there's an active ride
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

        const handleActiveDrivers = (activeDrivers: any[]) => {
            setDrivers(activeDrivers);
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
            if (status === "ARRIVED")
                toast.success("Driver has arrived at pickup!");
            if (status === "STARTED")
                toast.success("Trip has started!");
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

        const handleRideCancelled = (data: any) => {
            if (!data?.rideId)
                return;
            if (pendingRideIdRef.current && data.rideId !== pendingRideIdRef.current && activeRideRef.current?.rideId !== data.rideId)
                return;
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

        if (socket.connected) {
            handleSocketConnect();
        }

        const pollInterval = setInterval(() => {
            if (!activeRideRef.current) {
                socket.emit("get-active-drivers");
            }
        }, 10000);

        handleLocate();
        return () => {
            socket.off("connect", handleSocketConnect);
            socket.off("active-drivers", handleActiveDrivers);
            socket.off("ride-accepted", handleRideAccepted);
            socket.off("ride-status-update", handleRideStatusUpdate);
            socket.off("ride-request-failed", handleRideRequestFailed);
            socket.off("eta-update", handleEtaUpdate);
            socket.off("ride-cancelled", handleRideCancelled);
            socket.off("driver-location-update", handleDriverLocationUpdate);
            disconnectSocket();
            clearInterval(pollInterval);
            rideRequestLock.current = false;
        };
    }, [mounted, user]);
    const handleRequestRide = () => {
        if (!user || isRequestingRide || rideRequestLock.current || activeRide)
            return;
        if (stops.filter((s) => s.coords).length === 0) {
            toast.error("Please select a destination");
            return;
        }
        rideRequestLock.current = true;
        setIsRequestingRide(true);
        const rideId = `ride_${Date.now()}`;
        setPendingRideId(rideId);
        const pickup = { lat: userLoc?.[0], lng: userLoc?.[1], label: "Current Location" };
        const destination = stops[stops.length - 1];
        socket.emit("ride-request", {
            rideId,
            passengerId: user.id,
            passengerName: user.name,
            rideType: isSharedRide ? "shared" : "taxi",
            requestedVehicleType: vehicleType,
            pickup,
            destination: {
                lat: destination.coords?.[0],
                lng: destination.coords?.[1],
                label: destination.query,
            },
            fare: estimatedRideFare,
            distance: routeInfo.distance.toFixed(1),
        });
        toast.loading("Finding nearby drivers...", { duration: 5000 });
    };
    const handleCancelRide = () => {
        if (!user)
            return;
        const rideId = activeRide?.rideId || pendingRideId;
        if (!rideId)
            return;
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
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };
    const handleDrop = (index: number) => {
        if (draggedIndex === null || draggedIndex === index)
            return;
        const newStops = [...stops];
        const [movedItem] = newStops.splice(draggedIndex, 1);
        newStops.splice(index, 0, movedItem);
        setStops(newStops);
        setDraggedIndex(null);
        toast.success("Route updated!");
    };
    // Memoize the coordinates for the map to prevent constant re-renders
    const mapStops = useMemo(() => stops.filter((s: Stop) => s.coords !== null).map((s: Stop) => s.coords!) as [
        number,
        number
    ][], [stops]);
    const handleRouteUpdate = useCallback((dist: number, dur: number) => {
        setRouteInfo({ distance: dist, duration: dur });
    }, []);
    const visibleNearbyDrivers = useMemo(() => {
        return drivers.filter((driver: any) => {
            const mode = String(driver.rideMode ||
                driver.serviceMode ||
                driver.tripType ||
                driver.vehicleMode ||
                "").toLowerCase();
            const isSharedVehicle = driver.isSharedRide === true ||
                driver.sharedRide === true ||
                driver.sharedRideEnabled === true ||
                mode.includes("share") ||
                mode.includes("pool");
            return isSharedRide ? isSharedVehicle : !isSharedVehicle;
        });
    }, [drivers, isSharedRide]);
    const estimatedRideFare = useMemo(() => calculateRideFare(routeInfo.distance, routeInfo.duration, isSharedRide ? "pool" : "taxi"), [isSharedRide, routeInfo.distance, routeInfo.duration]);
    const estimatedPoolDriverPayout = useMemo(() => Math.ceil(calculateRideFare(routeInfo.distance, routeInfo.duration, "pool") * 0.8), [routeInfo.distance, routeInfo.duration]);
    // Settings states
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileData, setProfileData] = useState({ firstName: "", lastName: "", });
    useEffect(() => {
        if (user) {
            setProfileData({ firstName: user.name?.split(' ')[0] || "", lastName: user.name?.split(' ')[1] || "", });
        }
    }, [user]);
    const [securityData, setSecurityData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [addressFormData, setAddressFormData] = useState({ label: "Home", address: "" });
    const { user: refreshedUser, refetch } = useUser();
    const handleUpdateImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('profilePhoto', file);
            setIsUpdatingProfile(true);
            try {
                await api.put('/auth/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success("Profile photo updated!");
                refetch();
            }
            catch (err: any) {
                toast.error(err.response?.data?.message || "Failed to update photo");
            }
            finally {
                setIsUpdatingProfile(false);
            }
        }
    };
    const handleUpdateProfile = async () => {
        setIsUpdatingProfile(true);
        try {
            await api.put('/auth/me', { name: `${profileData.firstName} ${profileData.lastName}`.trim() });
            toast.success("Profile updated successfully!");
            refetch();
        }
        catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        }
        finally {
            setIsUpdatingProfile(false);
        }
    };
    const handleChangePassword = async () => {
        if (securityData.newPassword !== securityData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (!securityData.oldPassword) {
            toast.error("Current password is required");
            return;
        }
        setIsUpdatingProfile(true);
        try {
            await api.put('/auth/change-password', { oldPassword: securityData.oldPassword, newPassword: securityData.newPassword });
            toast.success("Password updated!");
            setSecurityData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        }
        catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to change password");
        }
        finally {
            setIsUpdatingProfile(false);
        }
    };
    const handleAddAddress = async () => {
        if (!addressFormData.address) {
            toast.error("Address is required");
            return;
        }
        setIsUpdatingProfile(true);
        try {
            const currentAddresses = (user as any).addresses || [];
            await api.put('/auth/me', { addresses: [...currentAddresses, addressFormData] });
            toast.success("Address added!");
            setIsAddingAddress(false);
            setAddressFormData({ label: "Home", address: "" });
            refetch();
        }
        catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add address");
        }
        finally {
            setIsUpdatingProfile(false);
        }
    };
    const handleDeleteAddress = async (index: number) => {
        setIsUpdatingProfile(true);
        try {
            const currentAddresses = [...((user as any).addresses || [])];
            currentAddresses.splice(index, 1);
            await api.put('/auth/me', { addresses: currentAddresses });
            toast.success("Address deleted!");
            refetch();
        }
        catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete address");
        }
        finally {
            setIsUpdatingProfile(false);
        }
    };
    const fetchSuggestions = async (id: string, query: string) => {
        if (query.length < 3) {
            setStops((prev: Stop[]) => prev.map((s: Stop) => (s.id === id ? { ...s, suggestions: [], showSuggestions: false } : s)));
            return;
        }
        try {
            const biasLat = userLoc?.[0] || 11.0720;
            const biasLon = userLoc?.[1] || 76.0740;
            const { data } = await api.get(`/map/suggestions`, {
                params: {
                    q: query,
                    limit: 10,
                    lat: biasLat,
                    lon: biasLon,
                },
            });
            const suggestions = data.features.map((f: any) => ({
                name: f.properties.name,
                city: f.properties.city || f.properties.state || "",
                country: f.properties.country,
                coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
            }));
            setStops((prev: Stop[]) => prev.map((s: Stop) => (s.id === id ? { ...s, suggestions, showSuggestions: true } : s)));
        }
        catch (err) {
            console.error("Autocomplete error:", err);
        }
    };
    const handleInputChange = (id: string, query: string) => {
        setStops((prev: Stop[]) => prev.map((s: Stop) => s.id === id ? { ...s, query, showSuggestions: query.length >= 3 } : s));
        setIsRouteSearched(false);
        setSearchStarted(false);
        setLoadingDrivers(false);
        if (debounceTimer.current)
            clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchSuggestions(id, query), 300);
    };
    const selectSuggestion = (stopId: string, sug: any) => {
        setStops((prev) => prev.map((s) => ({
            ...s,
            ...(s.id === stopId
                ? { query: `${sug.name}${sug.city ? ', ' + sug.city : ''}`, coords: sug.coords }
                : {}),
            showSuggestions: false,
        })));
        setIsSearchOpen(false);
        setSearchStarted(true);
        setLoadingDrivers(true);
        setDrivers([]);
        setIsRouteSearched(true);
        socket.emit("get-active-drivers");
        toast.success("Location selected");
    };
    const removeStop = (id: string) => {
        if (stops.length === 1)
            return;
        setStops(stops.filter(s => s.id !== id));
        setIsRouteSearched(false);
        setSearchStarted(false);
        setLoadingDrivers(false);
    };
    const fetchDriverSuggestions = async (query: string) => {
        if (query.length < 3) {
            setDriverDest((prev: Stop) => ({ ...prev, suggestions: [], showSuggestions: false }));
            return;
        }
        try {
            const biasLat = userLoc?.[0] || 11.0720;
            const biasLon = userLoc?.[1] || 76.0740;
            const { data } = await api.get(`/map/suggestions`, {
                params: {
                    q: query,
                    limit: 10,
                    lat: biasLat,
                    lon: biasLon,
                },
            });
            const suggestions = data.features.map((f: any) => ({
                name: f.properties.name,
                city: f.properties.city || f.properties.state || "",
                country: f.properties.country,
                coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
            }));
            setDriverDest((prev: Stop) => ({ ...prev, suggestions, showSuggestions: true }));
        }
        catch (err) {
            console.error("Autocomplete error:", err);
        }
    };
    const handleDriverInputChange = (query: string) => {
        setDriverDest((prev: Stop) => ({ ...prev, query, showSuggestions: query.length >= 3 }));
        setIsDriverTripActive(false);
        if (debounceTimer.current)
            clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchDriverSuggestions(query), 300);
    };
    const selectDriverSuggestion = (sug: any) => {
        setDriverDest((prev: Stop) => ({ ...prev, query: `${sug.name}${sug.city ? ', ' + sug.city : ''}`, coords: sug.coords, showSuggestions: false }));
        toast.success("Destination selected");
    };
    useEffect(() => {
        if (!isSearchOpen) return;
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (searchPanelRef.current && !searchPanelRef.current.contains(target)) {
                setIsSearchOpen(false);
                setStops((prev) => prev.map((s) => ({ ...s, showSuggestions: false })));
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isSearchOpen]);
    const handleLocate = useCallback(() => {
        console.log(" Location request initiated...");
        if (!("geolocation" in navigator)) {
            console.error("Geolocation API not found in navigator");
            toast.error("Geolocation is not supported by your browser.");
            setUserLoc([40.7128, -74.006]);
            return;
        }
        if (!window.isSecureContext) {
            console.warn("Site is not running in a secure context (HTTPS/localhost). Geolocation may fail.");
            toast.error("Location requires a secure connection (HTTPS or Localhost).");
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            console.log(`Location received. Accuracy: ${Math.round(accuracy)} meters`);
            console.log(`Lat: ${latitude}, Lng: ${longitude}`);
            setUserLoc([latitude, longitude]);
        }, (err) => {
            console.warn("Geolocation error details:", {
                code: err.code,
                message: err.message,
                PERMISSION_DENIED: err.PERMISSION_DENIED,
                POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
                TIMEOUT: err.TIMEOUT,
            });
            let errorMsg = "Could not get live location.";
            if (err.code === err.PERMISSION_DENIED) {
                errorMsg = "Location access denied. Please enable it in browser settings.";
            }
            else if (err.code === err.TIMEOUT) {
                errorMsg = "Location request timed out. Retrying with lower accuracy...";
                navigator.geolocation.getCurrentPosition((p) => setUserLoc([p.coords.latitude, p.coords.longitude]), () => setUserLoc([40.7128, -74.006]), { enableHighAccuracy: false, timeout: 10000 });
                return;
            }
            toast.error(errorMsg);
            console.log("Falling back to Kerala, India (default)");
            setUserLoc([11.072, 76.074]);
        }, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
        });
    }, []);
    useEffect(() => {
        handleLocate();
    }, [handleLocate]);
    const handleLogout = () => {
        clearAuth();
        router.push("/login");
    };
    useEffect(() => {
        if (mounted &&
            !userLoading &&
            user?.role === "DRIVER" &&
            ["PENDING", "AWAITING_APPROVAL"].includes(user?.status || "")) {
            router.push("/driver/onboarding");
        }
    }, [mounted, router, user, userLoading]);
    if (!mounted || userLoading) {
        return (<div className="h-screen bg-[#0A192F] flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
        </div>);
    }
    if (user?.role === "DRIVER" && ["PENDING", "AWAITING_APPROVAL"].includes(user?.status || "")) {
        return null;
    }
    return (<div className="flex h-screen bg-bg-main overflow-hidden selection:bg-[#FFD700]/30 font-sans transition-colors duration-500">
        {/* --- Sidebar (Navy Blue) --- */}            <aside className={`${isSidebarExpanded ? "w-70" : "w-22.5"} bg-[#0A192F] dark:bg-[#050B14] flex flex-col pt-10 border-r border-white/5 z-20 transition-all duration-500 ease-in-out relative group`}>                {/* Toggle Arrow Button */}                <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="absolute -right-3 top-20 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-[#0A192F] shadow-lg border-2 border-[#0A192F] hover:scale-110 active:scale-95 transition-all z-30">                    <ChevronRight className={`w-4 h-4 transition-transform duration-500 ${isSidebarExpanded ? "rotate-180" : "rotate-0"}`} />                </button>                <div className={`mb-14 transition-all duration-300 ${isSidebarExpanded ? "px-8" : "px-0 flex justify-center"}`}>                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>                        <div className="w-10 h-10 bg-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10 shrink-0">
            <Car className="text-[#0A192F] w-6 h-6" />                        </div>                        {isSidebarExpanded && (<div className="transition-all duration-300 opacity-100 transform translate-x-0">
                <h1 className="text-white font-black leading-none mb-1 text-base tracking-tighter uppercase italic">
                    Go<span className="text-[#FFD700]">
                        Ride</span></h1>                                <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-500">
                    Console</p>                            </div>)}                    </div>                </div>                <nav className={`flex-1 space-y-3 transition-all duration-300 ${isSidebarExpanded ? "px-4" : "px-3"}`}>                    {SIDEBAR_ITEMS.map((item) => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 rounded-[20px] transition-all group/item ${activeTab === item.id ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/10" : "text-slate-400 hover:bg-white/5 hover:text-white"} ${isSidebarExpanded ? "px-4 py-3.5" : "h-[64px] justify-center"}`} title={!isSidebarExpanded ? item.label : ""}>                            <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover/item:scale-110`} />                            {isSidebarExpanded && (<span className="font-extrabold text-sm tracking-wide truncate">
                        {item.label}</span>)}                        </button>))}                    {user?.role === "ADMIN" && (<button onClick={() => router.push("/admin/drivers")} className={`w-full flex items-center gap-4 rounded-[20px] transition-all text-emerald-500 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 ${isSidebarExpanded ? "px-4 py-3.5" : "h-16 justify-center"}`}>                            <ShieldCheck className="w-5 h-5 text-emerald-500" />                            {isSidebarExpanded && (<span className="font-extrabold text-sm tracking-wide truncate">
                            Admin</span>)}                        </button>)}                </nav>                <div className={`mt-auto border-t border-white/5 p-4 space-y-4 bg-black/10`}>                    {/* User Profile Mini Card */}                    <div className={`flex items-center gap-3 ${isSidebarExpanded ? "px-2 py-2" : "justify-center"}`}>                        <div className="w-12 h-12 rounded-[18px] bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group/profile cursor-pointer hover:border-[#FFD700]/50 transition-colors">
                                {user?.profilePhoto ? (<Image src={user.profilePhoto} alt="Profile" width={48} height={48} className="object-cover" unoptimized={true} />) : (<UserProfile className="text-[#FFD700] w-6 h-6" />)}                        </div>                        {isSidebarExpanded && (<div className="flex-1 min-w-0 transition-all duration-300">
                                    <p className="text-sm font-black text-white truncate leading-none mb-1">
                                        {user?.name || "Guest"}</p>                                <div className="flex items-center gap-1.5">
                                        <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />                                    <span className="text-[10px] font-black text-slate-500 tracking-wider">
                                            4.9 RATIO</span>                                </div>                            </div>)}                    </div>                    <button onClick={handleLogout} className={`w-full flex items-center gap-3 rounded-[20px] bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all font-black text-[11px] uppercase tracking-widest shadow-lg group/logout ${isSidebarExpanded ? "px-4 py-4 justify-center" : "h-[64px] justify-center"}`}>                        <LogOut className={`w-4 h-4 transition-transform group-hover/logout:-translate-x-1`} />                        {isSidebarExpanded && <span>Logout</span>}                    </button>                </div>            </aside>            {/* --- Main Content Area --- */}            <main className="flex-1 relative flex flex-col overflow-hidden">
            {/* Shared Dashboard Overlays (Only show on Dashboard Tab) */}                {activeTab === "dashboard" && (<>                        {/* Role Switcher Toggle - Top Right */}                        <div className={`absolute top-8 right-8 z-50 flex items-center gap-4`}>                            <div className="flex p-1 bg-white/80 backdrop-blur-md rounded-full shadow-2xl border border-white group/switcher overflow-hidden">
                <button onClick={() => { setIsDriverMode(false); setIsRouteSearched(false); setSearchStarted(false); setLoadingDrivers(false); }} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!isDriverMode ? "bg-[#0A192F] text-[#FFD700] shadow-lg" : "text-slate-400 hover:text-slate-600"}`}>                                    Passenger                                </button>                                <button onClick={() => { setIsDriverMode(true); setIsRouteSearched(false); setSearchStarted(false); setLoadingDrivers(false); }} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isDriverMode ? "bg-[#FFD700] text-[#0A192F] shadow-lg" : "text-slate-400 hover:text-slate-600"}`}>                                    Share My Ride                                </button>                            </div>                            <div className="flex gap-2">
                    {isDriverMode && (<div className="bg-[#FEF3C7]/90 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl border border-white/50">
                        <Wallet className="text-[#0A192F] w-5 h-5" />
                        <div className="flex items-center gap-1 text-[#0A192F] font-black tracking-tight">
                            <IndianRupee className="w-4 h-4 shrink-0" />
                            <span>{Number((user as any)?.walletBalance ?? 0).toFixed(2)}</span>
                        </div>                                    </div>)}                                <div className="relative">
                        <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className={`w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center transition-all border border-white ${isNotificationsOpen ? "text-[#0A192F] bg-white ring-2 ring-[#FFD700]/20" : "text-slate-400 hover:text-[#0A192F]"}`}>                                        <Bell className="w-5 h-5" />                                        <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white">
                        </span>                                    </button>                                    {/* Notifications Dropdown */}                                    {isNotificationsOpen && (<>                                            <div className="fixed inset-0 z-[60]" onClick={() => setIsNotificationsOpen(false)} />                                            <div className="absolute right-0 mt-4 w-80 bg-white rounded-[24px] shadow-2xl border border-slate-100 z-[70] overflow-hidden origin-top-right animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
                            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="font-black text-[#0A192F] text-[12px] uppercase tracking-widest">
                                    Notifications</h3>                                                    <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    3 New</span>                                                </div>                                                <div className="max-h-[320px] overflow-y-auto">
                                {[{ id: 1, title: 'Ride Confirmed', msg: 'Your ride with Sarah is confirmed for 5:30 PM', time: '2m ago', icon: Car, color: 'text-emerald-500', bg: 'bg-emerald-50' }, { id: 2, title: 'Wallet Top-up', msg: 'Added Rs 450 to your wallet successfully.', time: '1h ago', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-50' }, { id: 3, title: 'New Promotion', msg: 'Get 20% off on your next shared ride!', time: '3h ago', icon: Zap, color: 'text-[#FACC15]', bg: 'bg-amber-50' }].map((notif) => (<div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 group">
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 ${notif.bg} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>                                                                    <notif.icon className={`w-5 h-5 ${notif.color}`} />                                                                </div>                                                                <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-[13px] font-black text-[#0A192F]">
                                                    {notif.title}</p>                                                                        <span className="text-[10px] font-bold text-slate-400">
                                                    {notif.time}</span>                                                                    </div>                                                                    <p className="text-[11px] font-medium text-slate-500 leading-tight">
                                                {notif.msg}</p>                                                                </div>                                                            </div>                                                        </div>))}                                                </div>                                                <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:text-[#0A192F] transition-all border-t border-slate-50">
                                View All Notifications</button>                                            </div>                                        </>)}                                </div>                                {!isDriverMode && (<button className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-[#0A192F] transition-all border border-white">
                                    <HelpCircle className="w-5 h-5" />                                    </button>)}                            </div>                        </div>                        {!isDriverMode ? (<>                                <MapComponent userLoc={userLoc} passengerLoc={userLoc} rideStatus={activeRide?.status} stops={stops.filter((s: Stop) => s.coords !== null).map((s: Stop) => s.coords!) as [
                                        number,
                                        number
                                    ][]} onLocate={handleLocate} onRouteInfo={(dist, dur) => {
                                        setRouteInfo({ distance: dist, duration: dur });
                                    }} nearbyDrivers={activeRide ? [activeRide.driverInfo] : visibleNearbyDrivers} />                                {/* Journey Planner Overlay - Google Maps Inspired "Hub" */}                                <div className="absolute top-8 left-8 z-30 w-[420px] max-h-[calc(100vh-64px)] pointer-events-auto transition-all duration-500 flex flex-col">
                                            <div ref={searchPanelRef} className="bg-white rounded-[16px] shadow-[0_4px_25px_rgba(0,0,0,0.18)] border border-slate-200 overflow-hidden flex flex-col">
                                                <div className="flex items-center px-4 h-14 gap-3 shrink-0 bg-white">
                                                    {/* Search Hub */}
                                                    {stops.some(s => s.query || s.coords) || isRouteSearched ? (
                                                        <button 
                                                            onClick={() => {
                                                                setStops([{ id: '1', query: '', coords: null, suggestions: [], showSuggestions: false }]);
                                                                setIsRouteSearched(false);
                                                                setIsSearchOpen(false);
                                                                setSearchStarted(false);
                                                                setLoadingDrivers(false);
                                                                setDrivers([]);
                                                                setRouteInfo({ distance: 0, duration: 0 });
                                                            }}
                                                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#0A192F] hover:bg-slate-50 rounded-full transition-all shrink-0"
                                                            title="Clear & Close"
                                                        >
                                                            <ArrowLeft className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                                            <div className="w-2.5 h-2.5 rounded-full border-2 border-rose-500" />
                                                        </div>
                                                    )}
                                                    <input className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[15px] font-bold text-[#0A192F] placeholder:text-slate-400 min-w-0" style={{ outline: 'none', boxShadow: 'none' }} placeholder="Where to?" value={stops[stops.length - 1]?.query} onChange={(e) => { handleInputChange(stops[stops.length - 1].id, e.target.value); if (!e.target.value) setIsRouteSearched(false); }} onFocus={() => {
                                                        setIsSearchOpen(true);
                                                        const stop = stops[stops.length - 1];
                                                        if (stop.query.length >= 3) {
                                                            setStops(prev => prev.map(s => s.id === stop.id ? { ...s, showSuggestions: true } : { ...s, showSuggestions: false }));
                                                        }
                                                    }} />                                            {/* Action Icons */}                                            <div className="flex items-center gap-1.5 pr-1 border-l border-slate-100 h-8 ml-2 pl-3">
                                                        {(stops.some(s => s.query || s.coords) || isRouteSearched) && (
                                                            <button onClick={() => {
                                                                setStops([{ id: '1', query: '', coords: null, suggestions: [], showSuggestions: false }]);
                                                                setIsRouteSearched(false);
                                                                setIsSearchOpen(false);
                                                                setSearchStarted(false);
                                                                setLoadingDrivers(false);
                                                                setDrivers([]);
                                                                setRouteInfo({ distance: 0, duration: 0 });
                                                                toast.success("Search cleared");
                                                            }} className="p-2 text-rose-500 hover:text-rose-600 transition-colors rounded-full hover:bg-rose-50 font-bold" title="Clear all">
                                                                <X className="w-5 h-5 stroke-[3]" />
                                                            </button>
                                                        )}
                                                        <button onClick={() => { handleLocate(); setIsRouteSearched(false); setSearchStarted(false); setLoadingDrivers(false); }} className="p-2 text-slate-400 hover:text-[#00838F] transition-colors rounded-full hover:bg-slate-50" title="Use current location">                                                    <Compass className="w-5 h-5" />                                                </button>                                                <button className="w-10 h-10 bg-[#00838F] rounded-xl flex items-center justify-center text-white hover:bg-[#006064] transition-all shadow-md active:scale-95 group" onClick={() => {
                                                            const validStops = stops.filter(s => s.coords);
                                                            if (validStops.length > 0) {
                                                                toast.success("Calculating best route...");
                                                                setIsRouteSearched(true);
                                                                setSearchStarted(true);
                                                                setLoadingDrivers(true);
                                                                setDrivers([]);
                                                                socket.emit("get-active-drivers");
                                                            }
                                                            else {
                                                                toast.error("Enter a destination first");
                                                            }
                                                        }}>                                                    <Navigation className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />                                                </button>                                            </div>                                        </div>                                        {/* Scrollable Content Container */}                                        <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
                                                    {/* Suggestions List */}                                            {isSearchOpen && stops[stops.length - 1]?.showSuggestions && (<div className="border-t border-slate-100 bg-white max-h-[350px] overflow-y-auto">
                                                        {stops[stops.length - 1].suggestions.length > 0 ? (stops[stops.length - 1].suggestions.map((sug, idx) => (<button key={`suggestion-${sug.coords?.join('-') || idx}`} onClick={() => selectSuggestion(stops[stops.length - 1].id, sug)} className="w-full px-5 py-4 text-left flex items-start gap-4 hover:bg-slate-50 transition-colors group/item">                                                                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover/item:bg-[#00838F]/10 group-hover/item:text-[#00838F] transition-all">
                                                            <MapPin className="w-5 h-5" />                                                                </div>                                                                <div className="min-w-0 flex-1 pt-0.5">
                                                                <p className="text-[14px] font-black text-[#0A192F] truncate">
                                                                    {sug.name}</p>                                                                    <p className="text-[11px] font-bold text-slate-400 truncate uppercase mt-0.5">
                                                                    {sug.city}</p>                                                                </div>                                                            </button>))) : (<div className="p-8 text-center">
                                                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300 mb-2" />                                                            <p className="text-xs font-bold text-slate-400">
                                                                            Searching for area...</p>                                                        </div>)}                                                </div>)}                                            {/* Expanded Stops Detail (Visible after selecting a destination) */}                                            {stops.some(s => s.coords) && (<div className="px-6 pb-6 pt-2 bg-white">
                                                                                {/* Real-time Estimates Badge */}                                                    {routeInfo.distance > 0 && (<div className="mb-6 flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 animate-in fade-in slide-in-from-top-2 duration-500 mt-4">
                                                                                    <div className="flex-1 flex flex-col items-center border-r border-slate-200">
                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                                                                            Distance</span>                                                                <span className="text-sm font-black text-[#0A192F]">
                                                                                            {routeInfo.distance.toFixed(1)} <span className="text-[10px] text-slate-400">
                                                                                                KM</span></span>                                                            </div>                                                            <div className="flex-1 flex flex-col items-center border-r border-slate-200">
                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                                                                            Est. Time</span>                                                                <span className="text-sm font-black text-[#00838F]">
                                                                                            {Math.ceil(routeInfo.duration)} <span className="text-[10px] opacity-60">
                                                                                                MINS</span></span>                                                            </div>                                                            <div className="flex-1 flex flex-col items-center">
                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                                                                            Fare</span>                                                                <span className="text-sm font-black text-[#B8860B]">
                                                                                            {formatCurrency(estimatedRideFare)}</span>                                                            </div>                                                        </div>)}                                                    {false && routeInfo.distance > 0 && !activeRide && (
                                                        <div className="mb-6 space-y-3">
                                                            {!isRequestingRide ? (
                                                                <button 
                                                                    onClick={handleRequestRide} 
                                                                    className="w-full py-4 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#FFD700]/10 hover:scale-[1.02] active:scale-95 transition-all"
                                                                >
                                                                    Request Ride • {formatCurrency(estimatedRideFare)}
                                                                </button>
                                                            ) : (
                                                                <div className="p-6 bg-[#0A192F] text-white rounded-[28px] border-2 border-[#FFD700]/30 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse"></div>
                                                                    
                                                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-ping"></div>
                                                                            <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.2em]">Searching for Driver</span>
                                                                        </div>
                                                                        <Loader2 className="w-4 h-4 text-[#FFD700] animate-spin" />
                                                                    </div>
                                                                    
                                                                    <div className="space-y-4 relative z-10">
                                                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                                            <p className="text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-tight">Status</p>
                                                                            <p className="text-sm font-black text-white italic">Finding the best match near you...</p>
                                                                        </div>
                                                                        
                                                                        <button 
                                                                            onClick={handleCancelRide} 
                                                                            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-rose-500/20 transition-all"
                                                                        >
                                                                            Cancel Request
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {(searchStarted || activeRide || loadingDrivers) && (<div className="mb-6 p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm transition-all duration-500">
                                                        {loadingDrivers && !activeRide ? (<div className="py-6 text-center">
                                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-3" />
                                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Waiting for driver...</p>
                                                        </div>) : activeRide?.status === "ACCEPTED" ? (<div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[11px] font-black text-[#0A192F] uppercase tracking-wider">Driver Accepted</p>
                                                                <p className="text-[10px] font-black text-[#00838F] uppercase tracking-wider">ETA {activeRide?.eta || "-"}</p>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-600">{activeRide?.driverInfo?.name || "Driver assigned"}</p>
                                                            <div>
                                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                    <span>Pickup</span>
                                                                    <span>Destination</span>
                                                                </div>
                                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-[#FFD700] transition-all duration-500 w-1/4" />
                                                                </div>
                                                            </div>
                                                        </div>) : activeRide?.status === "ARRIVED" ? (<div className="space-y-4">
                                                            <p className="text-[11px] font-black text-[#0A192F] uppercase tracking-wider">Driver has arrived at pickup location</p>
                                                            <div>
                                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                    <span>Pickup</span>
                                                                    <span>Destination</span>
                                                                </div>
                                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-[#FFD700] transition-all duration-500 w-1/2" />
                                                                </div>
                                                            </div>
                                                        </div>) : activeRide?.status === "STARTED" ? (<div className="space-y-4">
                                                            <p className="text-[11px] font-black text-[#0A192F] uppercase tracking-wider">Trip Started</p>
                                                            <div>
                                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                    <span>Pickup</span>
                                                                    <span>Destination</span>
                                                                </div>
                                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-emerald-500 transition-all duration-500 w-3/4" />
                                                                </div>
                                                            </div>
                                                        </div>) : activeRide?.status === "COMPLETED" ? (<div className="py-6 text-center">
                                                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">Trip Completed</p>
                                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3 max-w-[220px] mx-auto">
                                                                <div className="h-full bg-emerald-500 transition-all duration-500 w-full" />
                                                            </div>
                                                        </div>) : !activeRide && searchStarted && visibleNearbyDrivers.length > 0 ? (<div className="py-6 text-center">
                                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse mx-auto mb-3" />
                                                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">{visibleNearbyDrivers.length} Drivers Available</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Choose a driver from the list</p>
                                                        </div>) : !activeRide && searchStarted ? (<div className="py-6 text-center">
                                                            <XCircle className="w-6 h-6 mx-auto text-slate-300 mb-3" />
                                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">No drivers available</p>
                                                        </div>) : null}
                                                    </div>)}
                                                    {false && activeRide && (<div className="mb-6 p-5 bg-[#0A192F] text-white rounded-[28px] border border-[#FFD700]/30 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden group">
                                                                                                {/* Background Decor */}                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full -mr-16 -mt-16 blur-3xl">
                                                                                                </div>                                                                                                                        <div className="flex items-center justify-between mb-5 relative z-10">
                                                                                                    <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest px-2.5 py-1 bg-[#FFD700]/10 rounded-full border border-[#FFD700]/20">
                                                                                                        {activeRide.status === "ACCEPTED" ? "Driver is Coming" : activeRide.status === "ARRIVED" ? "Driver Arrived at Pickup" : activeRide.status === "STARTED" ? "Trip Started • Navigating" : "Processing"}                                                                </span>                                                                <div className="flex items-center gap-1.5">
                                                                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500`}>
                                                                                                        </div>                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                                                                            {activeRide.status === "ACCEPTED" ? "Action: Accepted" : activeRide.status === "ARRIVED" ? "Action: Arrived" : "Action: On Trip"}</span>                                                                </div>                                                            </div>                                                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                                                                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden">
                                                                                                        {activeRide.driverInfo?.photo ? (<Image src={activeRide.driverInfo.photo} alt="Driver" width={48} height={48} className="object-cover" unoptimized />) : (<UserProfile className="w-6 h-6 text-[#FFD700]" />)}                                                                </div>                                                                <div className="flex-1 min-w-0">
                                                                                                        <p className="font-black text-white text-sm uppercase truncate mb-0.5">
                                                                                                            {activeRide.driverInfo?.name || "Go Ride Driver"}</p>                                                                    <div className="flex items-center gap-3">
                                                                                                            <div className="flex items-center gap-1">
                                                                                                                <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />                                                                            <span className="text-[10px] font-black text-[#FFD700]">
                                                                                                                    {activeRide.driverInfo?.rating || '4.8'}</span>                                                                        </div>                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                                                                                {activeRide.status === "ACCEPTED" ? `On the way • ETA: ${activeRide.eta || Math.ceil(routeInfo.duration)} mins` : activeRide.status === "ARRIVED" ? "At your location" : "Heading to destination"}                                                                        </p>                                                                    </div>                                                                </div>                                                            </div>                                                            {/* Mini Progress Bar */}                                                            <div className="space-y-2 relative z-10 px-1">
                                                                                                    <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                                                                                                        <span>Pickup</span>                                                                    <span>Destination</span>                                                                </div>                                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 flex gap-0.5">
                                                                                                        <div className={`h-full transition-all duration-1000 ${activeRide.status === "ACCEPTED" ? "w-1/3 bg-[#FFD700]" : activeRide.status === "ARRIVED" ? "w-1/2 bg-[#FFD700]" : "w-1/2 bg-emerald-500"}`}></div>                                                                    <div className={`h-full transition-all duration-1000 ${activeRide.status === "STARTED" ? "w-1/2 bg-emerald-500" : "w-1/2 bg-white/5"}`}></div>                                                                </div>                                                            </div>{(activeRide.status === "ACCEPTED" || activeRide.status === "ARRIVED") && (<button onClick={handleCancelRide} className="w-full mt-5 py-3.5 bg-white text-[#0A192F] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/20 hover:text-rose-500 hover:border-rose-300 transition-all relative z-10">                                                                Cancel Ride                                                            </button>)}                                                        </div>)}                                                    <div className="flex items-center justify-between mb-4 mt-2">
                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                                        Journey Details</span>
                                                                                    <button onClick={() => {
                                                                                        setStops([...stops, { id: Math.random().toString(), query: '', coords: null, suggestions: [], showSuggestions: false }]);
                                                                                        setIsRouteSearched(false);
                                                                                    }} className="text-[10px] font-black text-[#00838F] uppercase hover:underline">
                                                                                        + Add Stop
                                                                                    </button>
                                                                                </div>
                                                                                <div className="space-y-3">
                                                                                    {/* Origin */}
                                                                                    <div className="flex items-center gap-4 group/path">
                                                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm relative z-10">
                                                                                            <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                                                                                        </div>
                                                                                        <div className="flex-1 h-11 bg-slate-50/50 rounded-xl px-4 flex items-center border border-transparent group-hover/path:border-slate-200 transition-all">
                                                                                            <span className="text-[11px] font-bold text-slate-400">
                                                                                                Current Location</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="ml-[15px] w-0.5 h-4 bg-slate-200/50" />
                                                                                    {/* Dynamic Stops */}
                                                                                    {stops.map((stop, i) => (
                                                                                        <div key={stop.id} className={`relative transition-all duration-300 ${draggedIndex === i ? "opacity-40 scale-95" : "opacity-100"}`} draggable onDragStart={() => handleDragStart(i)} onDragOver={(e) => handleDragOver(e, i)} onDrop={() => handleDrop(i)}>
                                                                                            <div className="flex items-center gap-4 group/point">
                                                                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-[#00838F]/20 shadow-sm relative z-10 cursor-grab active:cursor-grabbing hover:border-[#00838F]/50 transition-colors">
                                                                                                    <GripVertical className="absolute -left-6 w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/point:opacity-100 transition-opacity" />
                                                                                                    <MapPin className={`w-4 h-4 ${i === stops.length - 1 ? 'text-rose-500' : 'text-[#00838F]'}`} />
                                                                                                </div>
                                                                                                <div className="flex-1 relative">
                                                                                                    <Input className="!h-11 !rounded-xl !bg-white !border-slate-100 !text-xs !font-bold pr-10 focus:!border-[#00838F]/30 focus:!ring-0 !outline-none" placeholder={i === stops.length - 1 ? "Where to?" : `Stop ${i + 1}`} value={stop.query} onChange={(e) => handleInputChange(stop.id, e.target.value)} onFocus={() => {
                                                                                                        setIsSearchOpen(true);
                                                                                                        if (stop.query.length >= 3)
                                                                                                            setStops(prev => prev.map(s => s.id === stop.id ? { ...s, showSuggestions: true } : { ...s, showSuggestions: false }));
                                                                                                    }} />
                                                                                                    {stops.length > 1 && (
                                                                                                        <button onClick={() => removeStop(stop.id)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 transition-colors">
                                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            {/* Suggestions list for individual input */}
                                                                                            {isSearchOpen && stop.showSuggestions && stop.suggestions.length > 0 && (
                                                                                                <div className="absolute left-12 right-0 top-12 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                                                                                                    {stop.suggestions.map((sug, idx) => (
                                                                                                        <button key={`stop-sug-${stop.id}-${sug.coords?.join('-') || idx}`} onClick={() => selectSuggestion(stop.id, sug)} className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-slate-50 transition-colors group/item">
                                                                                                            <MapPin className="w-4 h-4 text-slate-300 group-hover/item:text-[#00838F]" />
                                                                                                            <div className="min-w-0 flex-1">
                                                                                                                <p className="text-[12px] font-black text-[#0A192F] truncate">
                                                                                                                    {sug.name}</p>
                                                                                                                <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter">
                                                                                                                    {sug.city}</p>
                                                                                                            </div>
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                            {i < stops.length - 1 && <div className="ml-[15px] w-0.5 h-4 bg-slate-200/50 my-1" />}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>

                                                                                {/* Ride Mode Selector (The "Ride Share" Toggle) */}
                                                                                <div className="mt-8 mb-4">
                                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                                                                                        Ride Mode</p>
                                                                                    <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                                                                                        <button onClick={() => setIsSharedRide(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs ${!isSharedRide ? "bg-white text-[#0A192F] shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
                                                                                            <Car className={`w-3.5 h-3.5 ${!isSharedRide ? "text-[#FFD700]" : "text-slate-400"}`} />
                                                                                            Taxi
                                                                                        </button>
                                                                                        <button onClick={() => setIsSharedRide(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs ${isSharedRide ? "bg-[#00838F] text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
                                                                                            <Users className={`w-3.5 h-3.5 ${isSharedRide ? "text-white" : "text-slate-400"}`} />
                                                                                            Social Pool
                                                                                        </button>
                                                                                    </div>
                                                                                    <p className="text-[9px] font-bold text-slate-400 mt-2 px-1 text-center">
                                                                                        {isSharedRide ? "Shared vehicles only. Join a pooled trip and see only pool vehicles on the map." : "Private taxi mode. You will only book the selected taxi driver."}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            )}
                                                </div>
                                            </div>
                                        </div>


                                        {/* Drivers Sidebar - Visible only after search starts */}
                                        {!activeRide && searchStarted && stops[stops.length - 1].coords && (
                                            <div className="absolute right-8 bottom-8 w-[360px] max-h-[calc(100vh-160px)] pointer-events-auto transition-all duration-500 hover:scale-[1.01] z-40">
                                                <div className="bg-white/95 backdrop-blur-2xl border border-white/50 rounded-[40px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] px-6 py-6 h-fit flex flex-col overflow-hidden border-b-4 border-b-[#FFD700]/10">
                                                    <div className="flex items-start justify-between gap-4 mb-6">
                                                        <div className="pr-2">
                                                            <h2 className="text-[13px] font-black text-[#0A192F] uppercase tracking-[0.1em] leading-none">
                                                                {isSharedRide ? "Shared Vehicles" : "Available Taxis"}</h2>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                                                {isSharedRide ? "Pool vehicles near you" : "Taxi coverage map"}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-2xl border border-emerald-100/50 shrink-0">
                                                                <div className={`w-2 h-2 rounded-full ${visibleNearbyDrivers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                                <span className="text-emerald-600 text-[9px] font-black uppercase tracking-tighter">
                                                                    {visibleNearbyDrivers.length} Online</span>
                                                            </div>
                                                            <button onClick={() => { setIsRouteSearched(false); setSearchStarted(false); setLoadingDrivers(false); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all" title="Close">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0">
                                                        {loadingDrivers ? (
                                                            <div className="py-10 text-center">
                                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-3" />
                                                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Searching for drivers...</p>
                                                            </div>
                                                        ) : visibleNearbyDrivers.length === 0 ? (
                                                            <div className="py-10 text-center">
                                                                <XCircle className="w-6 h-6 mx-auto text-slate-300 mb-3" />
                                                                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">No drivers available</p>
                                                            </div>
                                                        ) : visibleNearbyDrivers.map((driver, idx) => (
                                                            <div key={driver.driverId || `driver-${idx}`} className="px-5 py-4 rounded-[28px] border-2 transition-all cursor-pointer relative group bg-white border-slate-50 hover:border-[#FFD700]/30 shadow-sm hover:shadow-xl hover:-translate-y-1">
                                                                <div className="absolute top-4 right-4 bg-[#FFD700] text-[#0A192F] px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-lg z-10 border-2 border-white">
                                                                    Online</div>
                                                                <div className="flex items-start gap-4">
                                                                    <div className="w-12 h-12 bg-[#0A192F] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl shadow-[#0A192F]/10 overflow-hidden border border-white/20">
                                                                        {isSharedRide ? (<Car className="w-6 h-6 text-[#FFD700]" />) : driver.photo ? (<Image src={driver.photo} alt={driver.name || "Driver"} width={48} height={48} className="object-cover w-full h-full" unoptimized={true} />) : (<UserProfile className="w-6 h-6 text-[#FFD700]" />)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between gap-3 mb-2 pr-20">
                                                                            <h4 className="font-black text-[#0A192F] text-sm uppercase truncate">
                                                                                {isSharedRide ? driver.vehicleName || "Shared Vehicle" : driver.name || "Go Ride Driver"}</h4>
                                                                            <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-amber-50 rounded-lg">
                                                                                <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                                                                                <span className="text-[11px] font-black text-[#B8860B]">
                                                                                    {driver.rating || '4.8'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mb-4">
                                                                            <MapPin className="w-3 h-3 text-slate-300" />
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate">
                                                                                {driver.location ? `${driver.location.lat.toFixed(3)}, ${driver.location.lng.toFixed(3)}` : 'Locating...'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mb-1">
                                                                                    Status</span>
                                                                                <span className="text-xs font-black text-[#0A192F] uppercase">
                                                                                    {isSharedRide ? "Pool Ready" : "Available"}</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mb-1">
                                                                                    Estimated ETA</span>
                                                                                <span className="text-xs font-black text-[#0A192F] uppercase">
                                                                                    {userLoc && driver.location ? `${Math.max(1, Math.ceil(Math.sqrt(Math.pow((driver.location.lat - userLoc[0]) * 111, 2) + Math.pow((driver.location.lng - userLoc[1]) * 111 * Math.cos(userLoc[0] * Math.PI / 180), 2)) / 0.5))} MINS` : '-'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <button onClick={() => {
                                                                            if (!stops.some(s => s.coords)) {
                                                                                toast.error("Please set a destination first");
                                                                                return;
                                                                            }
                                                                            handleRequestRide();
                                                                        }} disabled={isRequestingRide || !!activeRide} className="w-full mt-4 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all bg-[#0A192F] text-[#FFD700] hover:bg-white hover:text-[#FFD700] hover:border hover:border-[#FFD700]/40 shadow-xl shadow-[#0A192F]/10 active:scale-95 flex items-center justify-center gap-2 group-hover:bg-white group-hover:text-[#FFD700] disabled:opacity-50 disabled:pointer-events-none">
                                                                            {isRequestingRide ? "Request Sent" : isSharedRide ? "Join Pool" : "Book Taxi"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto px-8 pb-32 pt-[120px] custom-scrollbar">

                                            <div className="grid grid-cols-12 gap-8 h-full max-w-7xl mx-auto pb-16">
                                                {/* Left Column: Controls */}                                    <div className="col-span-12 lg:col-span-4 space-y-8">
                                                    {/* Start Shared Ride Card */}                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                        <h2 className="text-xl font-bold text-slate-900 mb-6">
                                                            Start a Shared Ride</h2>                                            <div className="space-y-5">
                                                            <div className="space-y-2 relative">
                                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                                    Destination</label>                                                    <div className="relative">
                                                                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 z-10" />                                                        <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-[#FACC15] focus:border-[#FACC15] text-sm text-[#0f1729] placeholder:text-slate-400 relative z-10 focus:outline-none" placeholder="Where are you going?" value={driverDest.query} onChange={(e) => handleDriverInputChange(e.target.value)} onFocus={() => {
                                                                        if (driverDest.query.length >= 3) {
                                                                            setDriverDest(prev => ({ ...prev, showSuggestions: true }));
                                                                        }
                                                                    }} />                                                        {/* Suggestions */}                                                        {driverDest.showSuggestions && driverDest.suggestions.length > 0 && (<div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                                                                        {driverDest.suggestions.map((sug, idx) => (<button key={`driver-sug-${sug.coords?.join('-') || idx}`} onClick={() => selectDriverSuggestion(sug)} className="w-full px-4 py-2 text-left flex items-start gap-3 hover:bg-slate-50 transition-colors">                                                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-sm font-bold text-[#0A192F] truncate">
                                                                                {sug.name}</p>                                                                            <p className="text-xs font-medium text-slate-400 truncate">
                                                                                {sug.city}</p>                                                                        </div>                                                                    </button>))}                                                            </div>)}                                                    </div>                                                </div>                                                <div className="space-y-2">
                                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                                    Vehicle Type</label>                                                    <div className="grid grid-cols-3 gap-3">
                                                                    {[{ id: 'car', icon: Car, label: 'Car' }, { id: 'auto', icon: AutoRickshawIcon, label: 'Rickshaw' }, { id: 'bike', icon: Bike, label: 'Bike' }].map((v) => (<button key={v.id} onClick={() => setVehicleType(v.id as any)} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${vehicleType === v.id ? "border-[#FACC15] bg-[#FEF3C7] text-[#0f1729]" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-[#FACC15]/50 hover:bg-white"}`}>                                                                <v.icon className={`w-6 h-6 ${vehicleType === v.id ? "text-[#0f1729]" : ""}`} />                                                                <span className="text-[10px] font-bold mt-1 uppercase">
                                                                        {v.label}</span>                                                            </button>))}                                                    </div>                                                </div>                                                <div className="flex items-center justify-between py-2">
                                                                <div className="space-y-1">
                                                                    <p className="text-sm font-bold text-slate-900">
                                                                        Available Seats</p>                                                        <p className="text-xs text-slate-500">
                                                                        Max capacity: 4</p>                                                    </div>                                                    <div className="flex items-center gap-4 bg-slate-100 rounded-lg px-2 py-1">
                                                                    <button onClick={() => setSeatsAvailable(Math.max(1, seatsAvailable - 1))} className="w-8 h-8 rounded-md bg-white shadow-sm flex items-center justify-center text-[#0f1729] hover:text-[#FACC15] transition-colors">
                                                                        <Minus className="w-4 h-4" />                                                        </button>                                                        <span className="text-lg font-bold w-4 text-center text-[#0f1729]">
                                                                        {seatsAvailable}</span>                                                        <button onClick={() => setSeatsAvailable(Math.min(6, seatsAvailable + 1))} className="w-8 h-8 rounded-md bg-white shadow-sm flex items-center justify-center text-[#0f1729] hover:text-[#FACC15] transition-colors">
                                                                        <Plus className="w-4 h-4" />                                                        </button>                                                    </div>                                                </div>                                                <button onClick={() => {
                                                                            if (driverDest.coords) {
                                                                                setIsDriverTripActive(true);
                                                                                toast.success("Trip activated! Looking for riders.");
                                                                            } else {
                                                                                toast.error("Please select a destination first");
                                                                            }
                                                                        }} className="w-full py-4 bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#0f1729] font-bold rounded-xl shadow-lg shadow-[#FACC15]/20 transition-all flex items-center justify-center gap-2 mt-4 active:scale-[0.98]">
                                                                Activate Trip                                                    <Zap className="w-5 h-5" />                                                </button>                                            </div>                                        </div>                                        {/* Seat Status Panel */}                                        <div className="bg-gradient-to-br from-[#0F172A] via-[#0F3A4A] to-[#115E59] rounded-xl p-6 text-white shadow-xl border border-white/10">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <h3 className="font-bold text-lg">
                                                                Seat Status</h3>                                                <div className="px-3 py-1 bg-[#FACC15] rounded-full text-[#0f1729] text-xs font-bold">
                                                                LIVE</div>                                            </div>                                            <div className="space-y-6">
                                                            <div className="flex justify-between items-end">
                                                                <div className="space-y-1">
                                                                    <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">
                                                                        Occupancy</p>                                                        <p className="text-3xl font-bold">
                                                                        {bookedCount} / <span className="text-slate-500">
                                                                            {seatsAvailable}</span></p>                                                    </div>                                                    <div className="flex gap-2 mb-2">
                                                                    {Array.from({ length: bookedCount }).map((_, i) => (<span key={`booked-${i}`} className="w-3 h-3 rounded-full bg-[#FACC15] shadow-[0_0_10px_#FACC15]">
                                                                    </span>))}                                                        {Array.from({ length: Math.max(0, seatsAvailable - bookedCount) }).map((_, i) => (<span key={`avail-${i}`} className="w-3 h-3 rounded-full bg-slate-700">
                                                                    </span>))}                                                    </div>                                                </div>                                                <div className="grid grid-cols-2 gap-4">
                                                                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                                    <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">
                                                                        Booked</p>                                                        <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 bg-[#FACC15] rounded-full shadow-[0_0_8px_#FACC15]">
                                                                        </div>                                                            <span className="font-bold text-lg">
                                                                            {bookedCount}</span>                                                        </div>                                                    </div>                                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                                    <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">
                                                                        Available</p>                                                        <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 bg-slate-600 rounded-full">
                                                                        </div>                                                            <span className="font-bold text-lg text-slate-300">
                                                                            {Math.max(0, seatsAvailable - bookedCount)}</span>                                                        </div>                                                    </div>                                                </div>                                            </div>                                        </div>                                    </div>                                    {/* Right Column: Map & Active Stats */}                                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 min-h-[600px] h-full relative">
                                                    {/* Interactive Map Card */}                                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group min-h-[400px]">
                                                        <MapComponent userLoc={userLoc} stops={driverDest.coords ? [driverDest.coords] : []} onLocate={handleLocate} onRouteInfo={handleRouteUpdate} />                                            {/* Waiting Widget overlay (match design) */}                                            {isDriverTripActive && (<div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
                                                            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-slate-200 flex items-center justify-between pointer-events-auto">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                                                                        <Compass className="w-6 h-6 text-[#FACC15] animate-pulse" />                                                        </div>                                                        <div>                                                            <p className="text-slate-900 font-bold">
                                                                            Waiting for Passengers</p>                                                            <p className="text-slate-500 text-xs text-left">
                                                                            Finding matches along your route...</p>                                                        </div>                                                    </div>                                                    <div className="flex items-center gap-3">
                                                                    <div className="flex -space-x-2">
                                                                        {Array.from({ length: Math.min(3, bookedCount) }).map((_, i) => (<div key={`rider-${i}`} className="w-8 h-8 rounded-full border-2 border-white bg-[#FEF3C7] flex items-center justify-center shrink-0">
                                                                            <UserProfile className="w-4 h-4 text-[#B8860B]" />                                                                </div>))}                                                            {bookedCount > 3 && (<div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                                                                +{bookedCount - 3}</div>)}                                                            {bookedCount === 0 && (<div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center shrink-0">
                                                                                    <Users className="w-4 h-4 text-slate-300" />                                                                </div>)}                                                        </div>                                                        <button className="bg-white/15 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-white/25 transition-colors whitespace-nowrap hidden sm:block border border-white/20">
                                                                        View Requests</button>                                                    </div>                                                </div>                                            </div>)}                                        </div>                                        {/* Bottom Grid Stats */}                                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 transition-all duration-500 ${isDriverTripActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                                                <Clock className="w-6 h-6" />                                                </div>                                                <div className="min-w-0">
                                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider truncate text-left">
                                                                    Est. Trip Time</p>                                                    <p className="text-xl font-bold text-slate-900 truncate text-left">
                                                                    {Math.ceil(routeInfo.duration)} mins</p>                                                </div>                                            </div>                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                                                                <IndianRupee className="w-6 h-6" />                                                </div>                                                <div className="min-w-0">
                                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider truncate text-left">
                                                                    Potential Gain</p>                                                    <p className="text-xl font-bold text-slate-900 truncate text-left">
                                                                    {formatCurrency(estimatedPoolDriverPayout)}</p>                                                </div>                                            </div>                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                                                                <Navigation className="w-6 h-6" />                                                </div>                                                <div className="min-w-0">
                                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider truncate text-left">
                                                                    Distance</p>                                                    <p className="text-xl font-bold text-slate-900 truncate text-left">
                                                                    {routeInfo.distance.toFixed(1)} km</p>                                                </div>                                            </div>                                        </div>                                        {/* Live Stats / End Trip Action (Restored from design) */}                                        <div className={`bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0 mt-2 transition-all duration-500 ${isDriverTripActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                    Seat Status</p>                                                    <div className="flex gap-2">
                                                                    {Array.from({ length: bookedCount }).map((_, i) => (<div key={`booked-icon-${i}`} className="w-10 h-10 bg-[#FFD700]/10 rounded-full flex items-center justify-center text-[#B8860B]">
                                                                        <Users className="w-4 h-4" />                                                            </div>))}                                                        {Array.from({ length: Math.max(0, seatsAvailable - bookedCount) }).map((_, i) => (<div key={`avail-icon-${i}`} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                                                                            <Users className="w-4 h-4" />                                                            </div>))}                                                    </div>                                                </div>                                                <div className="w-px h-10 bg-slate-200 hidden sm:block">
                                                            </div>                                                <div>                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                Live Updates</p>                                                    <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-ping">
                                                                    </div>                                                        <p className="text-xs font-bold text-[#0A192F]">
                                                                        Looking for riders along your route...</p>                                                    </div>                                                </div>                                            </div>                                            <button onClick={() => setIsDriverTripActive(false)} className="px-8 py-4 rounded-2xl bg-rose-50 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all w-full sm:w-auto justify-center border border-rose-100">
                                                            <div className="w-2 h-2 bg-current rounded-sm">
                                                            </div> End Trip                                            </button>                                        </div>                                        {/* Incoming Ride Request Popup (Preview/Hidden by default, shown for design completion) */}                                        <div className="relative w-full bg-[#0A192F] text-white rounded-[32px] p-8 mt-2 shadow-xl border-4 border-[#FFD700]/10 overflow-hidden shrink-0 hidden pointer-events-none">
                                                        {/* Ambient Glow */}                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full -mr-16 -mt-16 blur-3xl">
                                                        </div>                                            <div className="relative z-10">
                                                            <div className="flex items-center justify-between mb-8">
                                                                <div className="px-4 py-1.5 bg-[#FFD700] text-[#0A192F] rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                                    New Ride Request</div>                                                    <span className="text-xs font-black text-[#FFD700]">
                                                                    ETA 4m</span>                                                </div>                                                <div className="flex items-center gap-6 mb-8">
                                                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20">
                                                                    <UserProfile className="w-8 h-8 text-[#FFD700]" />                                                    </div>                                                    <div>                                                        <h3 className="text-xl font-black tracking-tight">
                                                                        Johnathan D.</h3>                                                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase">
                                                                        <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" /> 4.8 Rating                                                        </div>                                                    </div>                                                </div>                                                <div className="space-y-4 mb-8">
                                                                <div className="flex items-center gap-4 group">
                                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                                        <div className="w-2 h-2 bg-emerald-400 rounded-full">
                                                                        </div>                                                        </div>                                                        <p className="text-sm font-bold text-slate-300">
                                                                        Indiranagar Double Road</p>                                                    </div>                                                    <div className="flex items-center gap-4 group">
                                                                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                                                                        <MapPin className="w-4 h-4 text-rose-400" />                                                        </div>                                                        <p className="text-sm font-bold text-slate-300">
                                                                        MG Road Metro Station</p>                                                    </div>                                                </div>                                                <div className="grid grid-cols-2 gap-4">
                                                                <button className="h-14 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all pointer-events-auto">
                                                                    Reject</button>
                                                                <button className="h-14 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#FFD700]/20 hover:scale-105 active:scale-95 transition-all pointer-events-auto">
                                                                    Accept</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
            </>
            )}
            {/* --- History Tab --- */}                {activeTab === "history" && (<div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-10">
                    <div className="flex items-center justify-between">
                        <div>                                    <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">
                            Ride History</h1>                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                                Track your journeys and expenses</p>                                </div>                                <div className="flex gap-4">
                            <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Total Spent</span>                                        <span className="text-lg font-black text-[#0A192F]">
                                    Rs 0</span>                                    </div>                                    <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Distance</span>                                        <span className="text-lg font-black text-[#00838F]">
                                    0 km</span>                                    </div>                                </div>                            </div>                            <div className="space-y-6">
                        {RIDES_HISTORY.length > 0 ? RIDES_HISTORY.map((ride: any, i: number) => (<div key={ride.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#FFD700]/30 transition-all group relative overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>                                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-[#FFD700]/5 transition-colors">
                        </div>                                        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                {/* Vehicle Icon & Type */}                                            <div className="flex items-center gap-4 min-w-[180px]">
                                    <div className="w-16 h-16 bg-[#0A192F] text-[#FFD700] rounded-[24px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        {ride.type === 'car' ? <Car className="w-8 h-8" /> : ride.type === 'bike' ? <Bike className="w-8 h-8" /> : <AutoRickshawIcon className="w-8 h-8" />}                                                </div>                                                <div>                                                    <h4 className="font-black text-[#0A192F] text-sm uppercase tracking-tight">
                                            {ride.vehicle}</h4>                                                    <div className="flex items-center gap-1.5 mt-1">
                                            <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />                                                        <span className="text-[10px] font-black text-slate-500">
                                                {ride.rating}.0 Rating</span>                                                    </div>                                                </div>                                            </div>                                            {/* Route Details */}                                            <div className="flex-1 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col items-center gap-1 mt-1">
                                            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#FFD700]">
                                            </div>                                                        <div className="w-0.5 h-4 bg-slate-100">
                                            </div>                                                        <MapPin className="w-3.5 h-3.5 text-rose-500" />                                                    </div>                                                    <div className="space-y-3">
                                            <div>                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                Pickup</p>                                                            <p className="text-sm font-bold text-[#0A192F]">
                                                    {ride.from}</p>                                                        </div>                                                        <div>                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                        Drop-off</p>                                                            <p className="text-sm font-bold text-[#0A192F]">
                                                    {ride.to}</p>                                                        </div>                                                    </div>                                                </div>                                            </div>                                            {/* Metrics & Price */}                                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                    <div className="text-left lg:text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                            {ride.date}</p>                                                    <div className="flex items-center lg:justify-end gap-2">
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tight">
                                                {ride.status}</span>                                                        <span className="text-sm font-black text-[#00838F]">
                                                {ride.distance}</span>                                                    </div>                                                </div>                                                <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                            Fare Paid</p>                                                    <h3 className="text-2xl font-black text-[#0A192F] tracking-tighter">
                                            Rs {ride.price}</h3>                                                </div>                                            </div>                                            {/* Action Button */}                                            <button className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all p-3 bg-[#FFD700] text-[#0A192F] rounded-xl shadow-lg hover:bg-[#0A192F] hover:text-[#FFD700]">
                                    <ArrowUpRight className="w-5 h-5" />                                            </button>                                        </div>                                    </div>)) : (<div className="py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Car className="w-10 h-10 text-slate-200" />                                        </div>                                        <h3 className="text-xl font-black text-[#0A192F] mb-2">
                                            No Rides Yet</h3>                                        <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto text-balance">
                                            Your journey history will appear here once you take your first ride with Go Ride.</p>                                        <Button variant="primary" className="mt-8" onClick={() => setActiveTab('dashboard')}>Book Your First Ride</Button>                                    </div>)}                            </div>                        </div>                    </div>)}                {/* --- Earnings Tab --- */}                {activeTab === "earnings" && (<div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
                                                <div className="max-w-5xl mx-auto space-y-10">
                                                    <div className="flex items-center justify-between">
                                                        <div>                                    <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">
                                                            Earnings Dashboard</h1>                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                                                                Monitor your revenue & driver performance</p>                                </div>                                <div className="flex gap-3">
                                                            <div className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse">
                                                                </div>                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                                    Live Updates</span>                                    </div>                                </div>                            </div>                            {/* Summary Stats Cards */}                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <div className="bg-[#0A192F] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group border border-[#FFD700]/20">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                                <IndianRupee className="w-24 h-24" />                                    </div>                                    <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.2em] mb-4">
                                                                Total Revenue</p>                                    <h3 className="text-4xl font-black tracking-tighter mb-2">
                                                                Rs 0.00</h3>                                    <div className="flex items-center gap-2 text-slate-400">
                                                                <TrendingUp className="w-4 h-4" />                                        <span className="text-[11px] font-bold">
                                                                    No data yet</span>                                    </div>                                </div>                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                                                Completed Rides</p>                                    <h3 className="text-4xl font-black text-[#0A192F] tracking-tighter mb-2">
                                                                0</h3>                                    <div className="flex items-center gap-2 text-slate-400">
                                                                <CheckCircle2 className="w-4 h-4" />                                        <span className="text-[11px] font-bold">
                                                                    --</span>                                    </div>                                </div>                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                                                Top Route</p>                                    <h2 className="text-lg font-black text-[#0A192F] leading-tight mb-2 truncate">
                                                                Indiranagar <span className="text-slate-300 mx-1">to</span> MG Road</h2>                                    <div className="flex items-center gap-2 text-[#B8860B]">
                                                                <Star className="w-4 h-4 fill-current" />                                        <span className="text-[11px] font-bold">
                                                                    4.9 Avg. Rating</span>                                    </div>                                </div>                            </div>                            <div className="grid grid-cols-12 gap-8">
                                                        {/* Recent Earnings List */}                                <div className="col-span-12 lg:col-span-8 space-y-6">
                                                            <div className="flex items-center justify-between px-2">
                                                                <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest">
                                                                    Recent Payouts</h3>                                        <button className="text-[10px] font-black text-[#00838F] uppercase hover:underline">
                                                                    View All</button>                                    </div>                                    <div className="space-y-4 py-12 text-center bg-white rounded-[32px] border border-slate-100">
                                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                    <TrendingUp className="w-6 h-6 text-slate-200" />                                        </div>                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                                    No payout history available</p>                                    </div>                                </div>                                {/* Goals & Breakdown */}                                <div className="col-span-12 lg:col-span-4 space-y-8">
                                                            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]">
                                                                </div>                                        <h4 className="text-[11px] font-black text-[#0A192F] uppercase tracking-widest mb-8">
                                                                    Daily Progress</h4>                                        <div className="relative w-32 h-32 mx-auto mb-8">
                                                                    <svg className="w-full h-full transform -rotate-90">
                                                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />                                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 * 0.25} strokeLinecap="round" className="text-[#FFD700] transition-all duration-1000 shadow-lg" />                                            </svg>                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                        <span className="text-2xl font-black text-[#0A192F]">
                                                                            75%</span>                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                            of Goal</span>                                            </div>                                        </div>                                        <div className="text-center space-y-2">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        Target: Rs 2,000</p>                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                        <div className="bg-[#FFD700] h-full w-3/4">
                                                                        </div>                                            </div>                                            <p className="text-sm font-black text-[#0A192F]">
                                                                        Rs 1,500 Earned Today</p>                                        </div>                                    </div>                                    <div className="bg-[#FFD700] p-8 rounded-[40px] shadow-xl shadow-[#FFD700]/10 flex flex-col justify-between">
                                                                <div>                                            <div className="flex items-center gap-4 mb-6 text-[#0A192F]">
                                                                    <Zap className="w-6 h-6 fill-current" />                                                <h4 className="text-[11px] font-black uppercase tracking-widest">
                                                                        Surge Bonus</h4>                                            </div>                                            <p className="text-sm font-bold text-[#0A192F]/80 leading-snug mb-8 text-balance">
                                                                        High demand detected in <strong className="text-[#0A192F]">
                                                                            Indiranagar</strong>. Switch to Driver Mode now to earn <strong className="text-[#0A192F]">
                                                                            1.5x</strong> per trip!</p>                                        </div>                                        <button onClick={() => {
                                                                                setActiveTab('dashboard');
                                                                                setIsDriverMode(true);
                                                                            }} className="w-full py-4 bg-[#0A192F] text-[#FFD700] rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all">                                            Go Online                                        </button>                                    </div>                                </div>                            </div>                        </div>                    </div>)}                {/* --- Wallet Tab --- */}                {activeTab === "wallet" && (<div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
                                                                                <div className="max-w-4xl mx-auto space-y-8">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div>                                    <h1 className="text-3xl font-black text-[#0A192F] mb-1 tracking-tight">
                                                                                            Digital Wallet</h1>                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                                                                                                Manage your balance & payments</p>                                </div>                                <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>Add Credits</Button>                            </div>                            {/* Main Balance Card */}                            <div className="bg-[#0A192F] p-10 rounded-[48px] shadow-2xl relative overflow-hidden text-white border border-[#FFD700]/20">
                                                                                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/5 rounded-full -mr-20 -mt-20 blur-3xl">
                                                                                        </div>                                <div className="relative z-10">
                                                                                            <p className="text-[#FFD700] font-black uppercase tracking-[0.3em] text-[10px] mb-4">
                                                                                                Current Balance</p>                                    <h2 className="text-6xl font-black mb-8 tracking-tighter">
                                                                                                Rs {(user as any)?.walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</h2>                                    <div className="flex items-center gap-6">
                                                                                                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                                                                                                    <CreditCard className="w-5 h-5 text-[#FFD700]" />                                            <span className="font-bold text-sm">
                                                                                                        **** NO CARD</span>                                        </div>                                        <span className="text-slate-500 font-bold text-sm tracking-widest uppercase">
                                                                                                    Add a card in settings</span>                                    </div>                                </div>                            </div>                            {/* Stats & Tools */}                            <div className="grid grid-cols-2 gap-8">
                                                                                        <div className="bg-white p-8 rounded-[32px] shadow-lg border border-slate-100 flex items-center justify-between">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                                                                                                    <ArrowDownLeft className="w-6 h-6" />                                        </div>                                        <div>                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                                                        Spent this month</p>                                            <h3 className="text-xl font-black text-[#0A192F]">
                                                                                                        Rs 0.00</h3>                                        </div>                                    </div>                                    <div className="text-slate-400 font-black text-xs px-2 py-1 bg-slate-50 rounded-lg">
                                                                                                0%</div>                                </div>                                <div className="bg-white p-8 rounded-[32px] shadow-lg border border-slate-100 flex items-center justify-between">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="w-12 h-12 bg-yellow-50 text-[#B8860B] rounded-2xl flex items-center justify-center">
                                                                                                    <ArrowUpRight className="w-6 h-6" />                                        </div>                                        <div>                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                                                        Total Savings</p>                                            <h3 className="text-xl font-black text-[#0A192F]">
                                                                                                        Rs 0.00</h3>                                        </div>                                    </div>                                </div>                            </div>                            {/* Recent Transactions area set to empty state */}                            <div className="space-y-4 py-10 text-center">
                                                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                                            <Wallet className="w-6 h-6 text-slate-300" />                                </div>                                <h3 className="font-black text-slate-400 uppercase tracking-widest text-[11px]">
                                                                                            No Recent Transactions</h3>                                <p className="text-slate-400 text-[10px] font-medium max-w-xs mx-auto">
                                                                                            Your ride payments and top-ups will appear here once you start using Go Ride.</p>                            </div>                        </div>                    </div>)}                {/* --- Settings Tab --- */}                {activeTab === "settings" && (<div className="flex-1 bg-slate-50 p-12 overflow-y-auto custom-scrollbar">
                                                                                                <div className="max-w-3xl mx-auto">
                                                                                                    <h1 className="text-3xl font-black text-[#0A192F] mb-12 tracking-tight">
                                                                                                        Account Settings</h1>                            <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
                                                                                                        <div className="p-10 border-b border-slate-100 flex items-center gap-10">
                                                                                                            <div className="relative group/photo">
                                                                                                                <div className="w-32 h-32 rounded-[40px] bg-[#0A192F] overflow-hidden border-4 border-[#FFD700]/10 shadow-2xl relative">
                                                                                                                    {(user as any)?.profilePhoto ? (<Image src={(user as any).profilePhoto} alt="Profile" width={128} height={128} className="object-cover" unoptimized={true} />) : (<div className="flex items-center justify-center w-full h-full text-white">
                                                                                                                        <UserProfile className="w-12 h-12 opacity-30" />                                                </div>)}                                        </div>                                        <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FFD700] text-[#0A192F] rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:bg-[#E6C200] transition-all transform hover:scale-110 border-4 border-white">
                                                                                                                    <Camera className="w-5 h-5" />                                            <input type="file" className="hidden" accept="image/*" onChange={handleUpdateImage} />                                        </label>                                    </div>                                    <div className="flex-1">
                                                                                                                <h2 className="text-2xl font-black text-[#0A192F] mb-1">
                                                                                                                    {user?.name}</h2>                                        <p className="text-slate-400 font-bold mb-4">
                                                                                                                    {user?.email}</p>                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A192F]/5 rounded-full">
                                                                                                                    <span className="w-2 h-2 rounded-full bg-emerald-400">
                                                                                                                    </span>                                            <span className="text-[10px] font-black uppercase text-[#0A192F] tracking-widest">
                                                                                                                        {user?.role} ACCOUNT</span>                                        </div>                                    </div>                                </div>                                <div className="p-10 space-y-10">
                                                                                                            <div className="grid grid-cols-2 gap-8">
                                                                                                                <Input label="First Name" value={profileData.firstName} onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} />                                        <Input label="Last Name" value={profileData.lastName} onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} />                                    </div>                                    <div className="flex justify-end pt-2">
                                                                                                                <Button variant="secondary" onClick={handleUpdateProfile} loading={isUpdatingProfile}>Save Name Changes</Button>                                    </div>                                    <div className="space-y-6">
                                                                                                                <div className="flex items-center justify-between px-1">
                                                                                                                    <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest">
                                                                                                                        Registered Addresses</h3>                                            {!isAddingAddress && (<Button size="sm" variant="ghost" className="!h-auto !p-0 text-[#FFD700]" onClick={() => setIsAddingAddress(true)}>+ Add New</Button>)}                                        </div>                                        {isAddingAddress && (<div className="p-8 bg-slate-50 rounded-[32px] border-2 border-[#FFD700]/20 space-y-6">
                                                                                                                            <div className="grid grid-cols-2 gap-6">
                                                                                                                                <div>                                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">
                                                                                                                                    Label</label>                                                        <select className="w-full h-14 px-5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-[#0A192F]" value={addressFormData.label} onChange={(e) => setAddressFormData({ ...addressFormData, label: e.target.value })}>                                                            <option value="Home">
                                                                                                                                        Home</option>                                                            <option value="Office">
                                                                                                                                            Office</option>                                                            <option value="Gym">
                                                                                                                                            Gym</option>                                                            <option value="Friend">
                                                                                                                                            Friend</option>                                                            <option value="Other">
                                                                                                                                            Other</option>                                                        </select>                                                    </div>                                                    <Input label="Complete Address" placeholder="Street, City, Building..." value={addressFormData.address} onChange={(e) => setAddressFormData({ ...addressFormData, address: e.target.value })} />                                                </div>                                                <div className="flex justify-end gap-4">
                                                                                                                                <Button variant="secondary" size="md" onClick={() => setIsAddingAddress(false)}>Cancel</Button>                                                    <Button variant="primary" size="md" onClick={handleAddAddress} loading={isUpdatingProfile}>Save Location</Button>                                                </div>                                            </div>)}                                        <div className="grid grid-cols-2 gap-6">
                                                                                                                    {((user as any).addresses || []).map((addr: any, idx: number) => (<div key={idx} className="p-6 bg-slate-50 rounded-3xl border-2 border-[#FFD700]/10 flex flex-col gap-3 group relative">
                                                                                                                        <div className="flex items-center justify-between">
                                                                                                                            <div className="w-10 h-10 bg-[#0A192F] text-[#FFD700] rounded-xl flex items-center justify-center shadow-lg">
                                                                                                                                {addr.label === 'Home' ? <Home className="w-5 h-5" /> : addr.label === 'Office' ? <Briefcase className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}                                                        </div>                                                        <button onClick={(e) => {
                                                                                                                                    e.stopPropagation();
                                                                                                                                    handleDeleteAddress(idx);
                                                                                                                                }} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded-lg">                                                            <Trash2 className="w-3.5 h-3.5" />                                                        </button>                                                    </div>                                                    <p className="text-xs font-bold text-[#0A192F] leading-relaxed">
                                                                                                                            {addr.address}</p>                                                </div>))}                                        </div>                                    </div>                                    <div className="pt-8 border-t border-slate-100 space-y-6">
                                                                                                                <h3 className="text-xs font-black text-[#0A192F] uppercase tracking-widest px-1">
                                                                                                                    Security & Password</h3>
                                                                                                                <div className="grid grid-cols-3 gap-6 items-end">
                                                                                                                    <Input type="password" label="Current Password" placeholder="********" leftIcon={<Lock className="w-4 h-4" />} value={securityData.oldPassword} onChange={(e) => setSecurityData({ ...securityData, oldPassword: e.target.value })} />                                            <Input type="password" label="New Password" placeholder="********" leftIcon={<Lock className="w-4 h-4" />} value={securityData.newPassword} onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })} />                                            <Input type="password" label="Confirm New" placeholder="********" leftIcon={<Lock className="w-4 h-4" />} value={securityData.confirmPassword} onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })} />                                        </div>                                        <div className="flex justify-end">
                                                                                                                    <Button variant="primary" onClick={handleChangePassword} loading={isUpdatingProfile} className="!px-12">                                                Update Password                                            </Button>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>)}
        </main>
        <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.2); border-radius: 10px; }
            `}</style>
    </div>
    );
}
