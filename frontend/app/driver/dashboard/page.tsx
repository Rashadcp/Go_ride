"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import {
    Navigation,
    Wallet,
    Clock,
    Star,
    TrendingUp,
    LogOut,
    Power,
    User,
    Settings,
    Mail,
    Phone,
    ShieldCheck,
    Camera,
    History,
    X,
    Lock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";

// Dynamically import MapComponent to prevent SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[#0A192F] animate-pulse flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">Initializing Map Console...</div>
});

export default function DriverDashboard() {
    const router = useRouter();
    const { user, clearAuth } = useAuthStore();
    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [loading, setLoading] = useState(false);
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [locationName, setLocationName] = useState("Searching Location...");
    const [isLocating, setIsLocating] = useState(false);
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [profileName, setProfileName] = useState(user?.name || "");
    const [profileEmail, setProfileEmail] = useState(user?.email || "");

    useEffect(() => {
        if (user && user.role !== "DRIVER") {
            router.push("/user/dashboard");
        }
    }, [user, router]);

    useEffect(() => {
        try {
            const savedOnline = localStorage.getItem("driverOnlineStatus");
            if (savedOnline === "true") {
                setIsOnline(true);
            }

            const savedLocation = localStorage.getItem("driverLastLocation");
            if (savedLocation) {
                const parsed = JSON.parse(savedLocation);
                if (Array.isArray(parsed) && parsed.length === 2) {
                    setUserLoc([Number(parsed[0]), Number(parsed[1])]);
                }
            }
        } catch {
            // Ignore localStorage parse errors and continue with defaults
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("driverOnlineStatus", String(isOnline));
        }
    }, [isOnline]);

    // WebSocket Integration
    useEffect(() => {
        if (isOnline && user) {
            connectSocket();

            // Only emit driver-online if we have a valid location
            if (userLoc) {
                socket.emit("driver-online", {
                    driverId: user.id,
                    location: { lat: userLoc[0], lng: userLoc[1] },
                    name: user.name,
                    photo: user.profilePhoto, // Use profilePhoto from authStore
                    rating: 4.8 // Fallback rating
                });
            }

            socket.on("new-ride-request", (request: any) => {
                setIncomingRequests(prev => {
                    // Avoid duplicates
                    if (prev.find(r => r.rideId === request.rideId)) return prev;
                    return [request, ...prev];
                });
                toast.success("New Ride Request Nearby!", { icon: "🚗" });
            });

            socket.on("ride-cancelled", (data: any) => {
                setIncomingRequests(prev => prev.filter(r => r.rideId !== data.rideId));
                setActiveTrip((prev: any) => {
                    if (prev?.rideId === data.rideId) {
                        toast.error("Passenger cancelled the ride.");
                        return null;
                    }
                    return prev;
                });
            });

            socket.on("ride-status-update", (data: any) => {
                setActiveTrip((prev: any) => {
                    if (!prev || prev.rideId !== data.rideId) return prev;
                    if (data.status === "COMPLETED" || data.status === "CANCELLED") return null;
                    return { ...prev, status: data.status };
                });
            });

            return () => {
                socket.off("new-ride-request");
                socket.off("ride-cancelled");
                socket.off("ride-status-update");
                disconnectSocket();
            };
        }
    }, [isOnline, user, userLoc]);

    // Continuous location updates when online
    useEffect(() => {
        if (isOnline && userLoc && user) {
            // Re-emit driver-online with valid location (in case initial emit had no location)
            socket.emit("driver-online", {
                driverId: user.id,
                location: { lat: userLoc[0], lng: userLoc[1] },
                name: user.name,
                photo: user.profilePhoto,
                rating: 4.8
            });
            socket.emit("driver-location-update", {
                driverId: user.id,
                location: { lat: userLoc[0], lng: userLoc[1] }
            });
        }
    }, [userLoc, isOnline, user]);

    const handleLocateLive = async () => {
        setIsLocating(true);
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported");
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                setUserLoc([latitude, longitude]);
                localStorage.setItem("driverLastLocation", JSON.stringify([latitude, longitude]));
                const { data } = await api.get(`/map/reverse-geocode`, {
                    params: { lat: latitude, lon: longitude }
                });
                const place = data.locality || data.city || data.principalSubdivision || "Unknown Location";
                setLocationName(place);
                toast.success(`Location synced: ${place}`);
            } catch (err) {
                toast.error("Failed to resolve place name");
                setLocationName("Live Location");
            } finally {
                setIsLocating(false);
            }
        }, () => {
            toast.error("Location access denied");
            setIsLocating(false);
        });
    };

    useEffect(() => {
        if (isOnline && !userLoc) {
            handleLocateLive();
        }
    }, [isOnline, userLoc]);

    const handleLogout = () => {
        clearAuth();
        router.push("/login");
    };

    const handleGoOnline = () => {
        setIsOnline(true);
    };

    const handleGoOffline = () => {
        if (!user) {
            setIsOnline(false);
            return;
        }

        if (!socket.connected) {
            setIsOnline(false);
            return;
        }

        let finalized = false;
        const finalizeOffline = () => {
            if (finalized) return;
            finalized = true;
            setIsOnline(false);
        };

        socket.emit("driver-offline", { driverId: user.id }, () => {
            finalizeOffline();
        });

        // Fallback in case ack is not received due transient network issues.
        setTimeout(finalizeOffline, 800);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePic(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

    const handleDeclineRequest = (id: string, rideId?: string) => {
        setIncomingRequests(prev => prev.filter(r => (rideId ? r.rideId !== rideId : r.id !== id)));
        if (rideId && user) {
            socket.emit("ride-reject", { rideId, driverId: user.id });
        }
        toast.error("Request dismissed");
    };

    const handleAcceptRequest = (request: any) => {
        setIncomingRequests(prev => prev.filter(r => r.rideId !== request.rideId));
        if (user) {
            socket.emit("ride-accept", {
                rideId: request.rideId,
                driverId: user.id,
                passengerId: request.passengerId
            });
            // Also emit initial status
            socket.emit("update-ride-status", {
                rideId: request.rideId,
                driverId: user.id,
                passengerId: request.passengerId,
                status: 'ACCEPTED'
            });
        }
        setActiveTrip({
            ...request,
            status: 'ACCEPTED',
            step: 1
        });
        toast.success(`Heading to pickup location`);
    };

    const handleUpdateStatus = (status: "ACCEPTED" | "ARRIVED" | "STARTED" | "COMPLETED") => {
        if (!activeTrip || !user) return;

        socket.emit("update-ride-status", {
            rideId: activeTrip.rideId,
            driverId: user.id,
            passengerId: activeTrip.passengerId,
            status: status
        });

        if (status === "COMPLETED") {
            toast.success("Ride Completed! Destination Reached.");
            setActiveTrip(null);
        } else {
            setActiveTrip({ ...activeTrip, status });
            const message = status === "ARRIVED" ? "Arrived at Pickup" : "Trip Started";
            toast.success(message);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await api.put("/auth/change-password", {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            toast.success("Password updated successfully");
            setShowPasswordModal(false);
            setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncProfile = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", profileName);
            if (profilePic) {
                formData.append("profilePhoto", profilePic);
            }

            const response = await api.put("/auth/me", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            useAuthStore.getState().setUser(response.data);
            toast.success("Profile updated successfully!");
            setProfilePic(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-[#0A192F] flex overflow-hidden font-sans selection:bg-[#FFD700] selection:text-[#0A192F]">
            {/* Sidebar Navigation - Full Height Fixed */}
            <aside className="w-[80px] lg:w-[280px] bg-[#0A192F] border-r border-white/5 flex flex-col pt-10 z-30 shadow-2xl flex-shrink-0 transition-all duration-300">
                <div className="px-6 lg:px-8 mb-12 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10 shrink-0">
                            <Navigation className="text-[#0A192F] w-6 h-6 lg:w-7 lg:h-7" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter text-white uppercase italic hidden lg:block">Go<span className="text-[#FFD700]">Ride</span></span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'dashboard', icon: TrendingUp, label: 'Live Console' },
                        { id: 'history', icon: HistoryIcon, label: 'Trips' },
                        { id: 'earnings', icon: Wallet, label: 'Payouts' },
                        { id: 'profile', icon: Settings, label: 'Profile' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[0.1em] ${activeTab === item.id ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20 scale-[1.02]" : "text-slate-500 hover:bg-white/5 hover:text-white"}`}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            <span className="hidden lg:block">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 mt-auto shrink-0 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-500 transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-rose-500/30"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span className="hidden lg:block">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area - Full Height Fixed */}
            <main className="flex-1 flex flex-col h-full bg-[#0A192F] relative overflow-hidden">
                {activeTab === "dashboard" ? (
                    <div className="flex-1 flex h-full overflow-hidden">
                        {/* Map Area */}
                        <div className="flex-1 relative bg-slate-900 overflow-hidden">
                            {/* Interactive Map Layer */}
                            <div className="absolute inset-0 z-0">
                                <MapComponent
                                    userLoc={userLoc}
                                    showUserMarker={false}
                                    rideStatus={activeTrip?.status}
                                    passengerLoc={activeTrip ? [activeTrip.pickup.lat, activeTrip.pickup.lng] : null}
                                    stops={activeTrip ? [[activeTrip.destination.lat, activeTrip.destination.lng]] : []}
                                    onLocate={handleLocateLive}
                                    nearbyDrivers={user ? [{ driverId: user.id, location: { lat: userLoc?.[0] || 0, lng: userLoc?.[1] || 0 } }] : []}
                                />
                                <div className="absolute inset-0 bg-[#0A192F]/20 pointer-events-none"></div>
                            </div>

                            {/* Map Interface Overlay */}
                            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                                <div className="flex items-center gap-3 bg-[#0A192F]/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-full shadow-2xl">
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#FFD700] animate-pulse ring-4 ring-[#FFD700]/20' : 'bg-slate-500'}`}></div>
                                    <span className="text-white font-black text-[9px] uppercase tracking-widest leading-none">
                                        live in <span className="text-[#FFD700]">{locationName}</span> • {isOnline ? 'Active' : 'Offline'}
                                    </span>
                                </div>

                                <div className="flex items-center bg-[#0A192F]/90 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-2xl scale-95">
                                    <button
                                        onClick={handleGoOnline}
                                        className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isOnline ? 'bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        Online
                                    </button>
                                    <button
                                        onClick={handleGoOffline}
                                        className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${!isOnline ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        Offline
                                    </button>
                                </div>
                            </div>


                        </div>

                        {/* Incoming Requests Area */}
                        <div className="w-[420px] bg-[#0A192F] border-l border-white/5 flex flex-col z-20 shadow-[-30px_0_60px_rgba(0,0,0,0.4)] relative">
                            {/* Dashboard Header */}
                            <div className="p-8 pb-4 shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">Live Console</h3>
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest transition-all ${isOnline ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                                        {isOnline ? 'Online' : 'Offline'}
                                    </div>
                                </div>
                                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Active dispatch monitor</p>
                            </div>

                            {/* Conditional Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                                {isOnline ? (
                                    activeTrip ? (
                                        <div className="bg-[#FFD700] rounded-[32px] p-6 shadow-2xl shadow-[#FFD700]/10 border border-[#FFD700]/30 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                            <div className="flex items-center justify-between mb-6">
                                                <span className="px-3 py-1 bg-[#0A192F] text-white text-[8px] font-black rounded-full uppercase tracking-widest">Active Engagement</span>
                                                <div className="w-2 h-2 rounded-full bg-[#0A192F] shadow-sm animate-pulse"></div>
                                            </div>
                                            <div className="text-center mb-6">
                                                <p className="text-[#0A192F] font-black text-lg leading-tight mb-1">
                                                    {activeTrip.status === "ACCEPTED" ? `Heading to Pickup` :
                                                        activeTrip.status === "ARRIVED" ? `Waiting for Passenger` :
                                                            activeTrip.status === "STARTED" ? `En Route to Destination` : `Trip Finished`}
                                                </p>
                                                <p className="text-[#0A192F]/60 text-[10px] font-bold uppercase tracking-widest leading-none">
                                                    {activeTrip.passengerName || activeTrip.client || "Passenger Management"}
                                                </p>
                                            </div>

                                            {activeTrip.status === "ACCEPTED" && (
                                                <button
                                                    onClick={() => handleUpdateStatus("ARRIVED")}
                                                    className="w-full py-4 bg-[#0A192F] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                                                >
                                                    Mark Arrived
                                                </button>
                                            )}

                                            {activeTrip.status === "ARRIVED" && (
                                                <button
                                                    onClick={() => handleUpdateStatus("STARTED")}
                                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                                                >
                                                    Start Trip
                                                </button>
                                            )}

                                            {activeTrip.status === "STARTED" && (
                                                <button
                                                    onClick={() => handleUpdateStatus("COMPLETED")}
                                                    className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all animate-pulse"
                                                >
                                                    End Trip & Collect
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incoming Requests</h4>
                                                <span className="text-[10px] font-black text-[#FFD700]">{incomingRequests.length} NEARBY</span>
                                            </div>
                                            {incomingRequests.map((req) => (
                                                <div key={req.rideId} className="relative group">
                                                    <div className="bg-[#0A192F]/80 backdrop-blur-2xl border border-white/10 rounded-[30px] p-5 relative overflow-hidden transition-all hover:scale-[1.02] hover:border-[#FFD700]/30 shadow-2xl">
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-[#FFD700]/5 rounded-2xl flex items-center justify-center border border-[#FFD700]/10">
                                                                    <User className="text-[#FFD700] w-6 h-6" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-white text-base leading-tight">{req.passengerName || req.client || "New Passenger"}</p>
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />
                                                                        <span className="text-[10px] font-black text-slate-400">{req.rating}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-[#FFD700] tracking-widest">{req.timeLeft || 'NOW'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3 mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]"></div>
                                                                <p className="text-[11px] font-bold text-slate-300 truncate">{req.pickup?.label || req.pickup || "Current Location"}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                                <p className="text-[11px] font-bold text-slate-300 truncate">{req.destination?.label || req.dropoff || "Request Destination"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                            <div>
                                                                <p className="text-xl font-black text-[#FFD700]">₹{req.fare.toFixed(2)}</p>
                                                                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">{req.type}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleDeclineRequest(req.id, req.rideId)}
                                                                    className="px-4 py-2.5 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-transparent hover:border-rose-500/20"
                                                                >
                                                                    Decline
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAcceptRequest(req)}
                                                                    className="px-6 py-2.5 bg-[#FFD700] hover:bg-[#FFD700]/80 text-[#0A192F] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-[#FFD700]/30"
                                                                >
                                                                    Accept
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-20 h-20 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10 relative">
                                            <div className="absolute inset-0 bg-white/5 rounded-[40px] animate-ping opacity-20"></div>
                                            <Power className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-3">System Standby</h4>
                                        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-10">Go online to receive requests</p>
                                        <button onClick={() => setIsOnline(true)} className="w-full py-5 bg-white text-[#0A192F] rounded-3xl font-black text-[11px] uppercase tracking-[0.2em]">Go Online Now</button>
                                    </div>
                                )}
                            </div>

                            {/* Session Summary */}
                            <div className="p-8 bg-white/[0.02] border-t border-white/5 backdrop-blur-xl shrink-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-[#FFD700]/30 transition-all">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Session Earned</p>
                                        <p className="text-xl font-black text-[#FFD700]">₹{(user as any)?.walletBalance?.toFixed(2) || '0.00'}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-right group hover:border-[#FFD700]/30 transition-all">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Hours</p>
                                        <p className="text-xl font-black text-white">0.0h</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === "profile" ? (
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#0A192F]">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Profile <span className="text-[#FFD700]">Settings</span></h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">Manage your platform identity and security</p>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Profile Summary Card */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-8 text-center">
                                        <div className="relative group mx-auto w-32 h-32 mb-6">
                                            <div className="w-full h-full bg-[#FFD700] rounded-[40px] flex items-center justify-center shadow-2xl shadow-[#FFD700]/10 overflow-hidden border-4 border-[#0A192F]">
                                                {previewUrl ? (
                                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Profile" />
                                                ) : user?.profilePhoto ? (
                                                    <img src={user.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                                                ) : (
                                                    <User className="w-16 h-16 text-[#0A192F]" />
                                                )}
                                            </div>
                                            <label className="absolute inset-0 flex items-center justify-center bg-[#0A192F]/60 opacity-0 group-hover:opacity-100 transition-all rounded-[40px] cursor-pointer backdrop-blur-sm border-2 border-[#FFD700]/30">
                                                <Camera className="w-8 h-8 text-[#FFD700]" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter italic">{user?.name}</h3>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{user?.role} ACCESS</p>

                                        <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-500">Security Level</span>
                                                <span className="text-emerald-500">Verified</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-500">Account Age</span>
                                                <span className="text-white">0 Days</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#FFD700]/5 backdrop-blur-2xl rounded-[32px] border border-[#FFD700]/10 p-6">
                                        <div className="flex items-start gap-4">
                                            <ShieldCheck className="w-6 h-6 text-[#FFD700]" />
                                            <div>
                                                <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest mb-1">Privacy Shield</p>
                                                <p className="text-[9px] font-bold text-slate-400 leading-tight">Your personal details are encrypted and secured using banking-grade protocols.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Settings Form */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-8 lg:p-12 shadow-2xl">
                                        <form className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                        <User className="w-3 h-3" /> Full Name
                                                    </label>
                                                    <input
                                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-[#FFD700] hover:border-white/20 outline-none transition-all"
                                                        value={profileName}
                                                        onChange={(e) => setProfileName(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                        <Mail className="w-3 h-3" /> Email Address
                                                    </label>
                                                    <input
                                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-500 outline-none transition-all cursor-not-allowed"
                                                        value={profileEmail}
                                                        disabled
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                    <Phone className="w-3 h-3" /> Verified Phone
                                                </label>
                                                <input
                                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-[#FFD700] hover:border-white/20 outline-none transition-all"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                            </div>

                                            <div className="pt-8 flex flex-col sm:flex-row gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordModal(true)}
                                                    className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/5 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                                >
                                                    Change Password
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSyncProfile}
                                                    disabled={loading}
                                                    className="flex-1 py-4 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#FFD700]/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {loading ? "Syncing..." : "Sync Profile"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="p-8 bg-rose-500/5 rounded-[32px] border border-rose-500/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tighter mb-1">Danger Zone</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Archive account and erase dispatch history</p>
                                            </div>
                                            <button className="px-6 py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                                                Deactivate
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === "history" ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0A192F]">
                        <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10 relative">
                            <History className="w-10 h-10 text-slate-500" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4 italic uppercase">Dispatch <span className="text-[#FFD700]">History</span></h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center max-w-md">No previous dispatch records found. Complete your first trip to build your portfolio.</p>
                    </div>
                ) : activeTab === "earnings" ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0A192F]">
                        <div className="w-24 h-24 bg-[#FFD700]/10 rounded-[40px] flex items-center justify-center mb-8 border border-[#FFD700]/20 relative">
                            <div className="absolute inset-0 bg-[#FFD700]/5 rounded-[40px] animate-ping opacity-20"></div>
                            <Wallet className="w-10 h-10 text-[#FFD700]" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4 italic uppercase">Revenue <span className="text-[#FFD700]">Center</span></h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center mb-10 max-w-md">Your earnings are processed weekly. Connect a bank account to enable direct deposits.</p>
                        <button className="px-8 py-4 bg-white/5 text-[#FFD700] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-[#FFD700]/30 hover:bg-[#FFD700] hover:text-[#0A192F] transition-all">
                            Link Bank Account
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center h-full bg-[#0A192F]">
                        <p className="text-2xl font-black text-white uppercase italic opacity-20 tracking-tighter">Access Restricted _</p>
                    </div>
                )}
            </main>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-[#0A192F]/80 backdrop-blur-md"
                        onClick={() => setShowPasswordModal(false)}
                    ></div>
                    <div className="relative w-full max-w-md bg-[#0A192F] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Secure <span className="text-[#FFD700]">Reset</span></h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Update your authentication credentials</p>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="w-10 h-10 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-rose-500/20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.oldPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-[#FFD700] hover:border-white/20 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-[#FFD700] hover:border-white/20 outline-none transition-all"
                                        placeholder="Enter new password"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-[#FFD700] hover:border-white/20 outline-none transition-all"
                                        placeholder="Repeat new password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#FFD700]/10 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Authorize Update"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.1); border-radius: 20px; }
            `}</style>
        </div>
    );
}

function HistoryIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
