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
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

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
        if (!(isOnline && user && userLoc)) {
            if (isOnline && !userLoc) {
                handleLocateLive();
            }
            return;
        }

        connectSocket();

        // Join rooms so broadcasted requests reach this driver
        socket.emit("join-driver", { driverId: user.id });
        socket.emit("join-drivers"); // generic drivers room (backend-friendly fallback)

        // Emit online status with a valid location
        socket.emit("driver-online", {
            driverId: user.id,
            location: { lat: userLoc[0], lng: userLoc[1] },
            name: user.name,
            profilePhoto: user.profilePhoto,
            rating: 4.8,
            vehicleType: (user as any).vehicleType || "go"
        });

        const handleIncoming = (request: any) => {
            console.debug("Received ride request for driver:", request);
            setIncomingRequests(prev => {
                const id = request?.rideId || request?.id || request?._id;
                if (id && prev.find(r => (r.rideId || r.id || r._id) === id)) return prev;
                return [request, ...prev];
            });
            toast.success("New Ride Request Nearby!", { icon: "🚗" });
        };

        const handleCancelled = (data: any) => {
            const id = data?.rideId || data?.id;
            setIncomingRequests(prev => prev.filter(r => (r.rideId || r.id) !== id));
            setActiveTrip((prev: any) => {
                if (id && prev?.rideId === id) {
                    toast.error("Passenger cancelled the ride.");
                    return null;
                }
                return prev;
            });
        };

        const handleStatusUpdate = (data: any) => {
            setActiveTrip((prev: any) => {
                if (!prev || prev.rideId !== data.rideId) return prev;
                if (data.status === "COMPLETED" || data.status === "CANCELLED") return null;
                return { ...prev, status: data.status };
            });
        };

        const handleConnectError = (err: Error) => {
            console.warn("Socket connect error:", err.message);
            toast.error("Driver socket disconnected.");
        };

        socket.on("new-ride-request", handleIncoming);
        socket.on("ride-request", handleIncoming);
        socket.on("ride-cancelled", handleCancelled);
        socket.on("ride-status-update", handleStatusUpdate);
        socket.on("connect_error", handleConnectError);

        return () => {
            socket.off("new-ride-request", handleIncoming);
            socket.off("ride-request", handleIncoming);
            socket.off("ride-cancelled", handleCancelled);
            socket.off("ride-status-update", handleStatusUpdate);
            socket.off("connect_error", handleConnectError);
            disconnectSocket();
        };
    }, [isOnline, user, userLoc]);

    // Continuous location updates when online
    useEffect(() => {
        if (isOnline && userLoc && user) {
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
            socket.emit("join-ride", { rideId: request.rideId });
            socket.emit("ride-accept", {
                rideId: request.rideId,
                driverId: user.id,
                passengerId: request.passengerId,
                driverInfo: {
                    name: (user as any).name || (user as any).firstName || "Driver",
                    profilePhoto: user.profilePhoto,
                    rating: 4.9,
                    vehiclePlate: (user as any).vehicleNumber || "NOT AVAILABLE",
                    vehicleType: (user as any).vehicleType || "go",
                    location: { lat: userLoc?.[0], lng: userLoc?.[1] }
                }
            });
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
            toast.success("Ride Completed!");
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

            <main className="flex-1 flex flex-col h-full bg-[#0A192F] relative overflow-hidden">
                {activeTab === "dashboard" ? (
                    <div className="flex-1 flex h-full overflow-hidden">
                        <div className="flex-1 relative bg-slate-900 overflow-hidden">
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

                            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                                <div className="flex items-center gap-3 bg-[#0A192F]/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-full shadow-2xl">
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#FFD700] animate-pulse ring-4 ring-[#FFD700]/20' : 'bg-slate-500'}`}></div>
                                    <span className="text-white font-black text-[9px] uppercase tracking-widest leading-none">
                                        live in <span className="text-[#FFD700]">{locationName}</span> • {isOnline ? 'Active' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex items-center bg-[#0A192F]/90 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-2xl scale-95">
                                    <button onClick={handleGoOnline} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isOnline ? 'bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20' : 'text-slate-500 hover:text-white'}`}>Online</button>
                                    <button onClick={handleGoOffline} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${!isOnline ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white'}`}>Offline</button>
                                </div>
                            </div>
                        </div>

                        <div className="w-[420px] bg-[#0A192F] border-l border-white/5 flex flex-col z-20 shadow-[-30px_0_60px_rgba(0,0,0,0.4)] relative">
                            <div className="p-8 pb-4 shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">Live Console</h3>
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest transition-all ${isOnline ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20' : 'bg-white/5 text-slate-500 border-white/10'}`}>{isOnline ? 'Online' : 'Offline'}</div>
                                </div>
                                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Active dispatch monitor</p>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                                {isOnline ? (
                                    activeTrip ? (
                                        <div className="bg-[#FFD700] rounded-[32px] p-6 shadow-2xl shadow-[#FFD700]/10 border border-[#FFD700]/30">
                                            <div className="flex items-center justify-between mb-6">
                                                <span className="px-3 py-1 bg-[#0A192F] text-white text-[8px] font-black rounded-full uppercase tracking-widest">Active Engagement</span>
                                                <div className="w-2 h-2 rounded-full bg-[#0A192F] shadow-sm animate-pulse"></div>
                                            </div>
                                            <div className="text-center mb-6">
                                                <p className="text-[#0A192F] font-black text-lg leading-tight mb-1">{activeTrip.status === "ACCEPTED" ? `Heading to Pickup` : activeTrip.status === "ARRIVED" ? `Waiting for Passenger` : activeTrip.status === "STARTED" ? `En Route to Destination` : `Trip Finished`}</p>
                                                <p className="text-[#0A192F]/60 text-[10px] font-bold uppercase tracking-widest leading-none">{activeTrip.passengerName || activeTrip.client || "Passenger"}</p>
                                            </div>
                                            {activeTrip.status === "ACCEPTED" && <button onClick={() => handleUpdateStatus("ARRIVED")} className="w-full py-4 bg-[#0A192F] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Mark Arrived</button>}
                                            {activeTrip.status === "ARRIVED" && <button onClick={() => handleUpdateStatus("STARTED")} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Start Trip</button>}
                                            {activeTrip.status === "STARTED" && <button onClick={() => handleUpdateStatus("COMPLETED")} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">End Trip & Collect</button>}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between mb-2"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incoming Requests</h4><span className="text-[10px] font-black text-[#FFD700]">{incomingRequests.length} NEARBY</span></div>
                                            {incomingRequests.map((req) => (
                                                <div key={req.rideId} className="bg-[#0A192F]/80 backdrop-blur-2xl border border-white/10 rounded-[30px] p-5 transition-all hover:scale-[1.02] hover:border-[#FFD700]/30 shadow-2xl">
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-[#FFD700]/5 rounded-2xl flex items-center justify-center overflow-hidden border border-[#FFD700]/10">
                                                                {req.passengerPhoto ? (
                                                                    <img src={req.passengerPhoto} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className="text-[#FFD700] w-6 h-6" />
                                                                )}
                                                            </div>
                                                            <div><p className="font-black text-white text-base leading-tight">{req.passengerName || "New Passenger"}</p><div className="flex items-center gap-1.5 mt-1"><Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" /><span className="text-[10px] font-black text-slate-400">4.9</span></div></div>
                                                        </div>
                                                        <p className="text-[10px] font-black text-[#FFD700] tracking-widest">NOW</p>
                                                    </div>
                                                    <div className="space-y-3 mb-6">
                                                        <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]"></div><p className="text-[11px] font-bold text-slate-300 truncate">{req.pickup?.label || "Pickup"}</p></div>
                                                        <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div><p className="text-[11px] font-bold text-slate-300 truncate">{req.destination?.label || "Destination"}</p></div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                        <div><p className="text-xl font-black text-[#FFD700]">₹{req.fare?.toFixed(2)}</p></div>
                                                        <div className="flex gap-2"><button onClick={() => handleDeclineRequest(req.id, req.rideId)} className="px-4 py-2.5 bg-white/5 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest border border-transparent hover:border-rose-500/20">Decline</button><button onClick={() => handleAcceptRequest(req)} className="px-6 py-2.5 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Accept</button></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-4"><div className="w-20 h-20 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10"><Power className="w-8 h-8 text-slate-500" /></div><h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-3">System Standby</h4><p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-10">Go online to receive requests</p><button onClick={() => setIsOnline(true)} className="w-full py-5 bg-white text-[#0A192F] rounded-3xl font-black text-[11px] uppercase tracking-[0.2em]">Go Online Now</button></div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === "profile" ? (
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#0A192F]">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Profile <span className="text-[#FFD700]">Settings</span></h2>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-8 text-center">
                                        <div className="relative group mx-auto w-32 h-32 mb-6"><div className="w-full h-full bg-[#FFD700] rounded-[40px] flex items-center justify-center shadow-2xl overflow-hidden border-4 border-[#0A192F]">{previewUrl || user?.profilePhoto ? <img src={previewUrl || user?.profilePhoto} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-[#0A192F]" />}</div><label className="absolute inset-0 flex items-center justify-center bg-[#0A192F]/60 opacity-0 group-hover:opacity-100 cursor-pointer rounded-[40px]"><Camera className="w-8 h-8 text-[#FFD700]" /><input type="file" className="hidden" onChange={handleFileChange} /></label></div>
                                        <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter italic">{user?.name}</h3>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[40px] border border-white/5 p-8 lg:p-12 shadow-2xl">
                                        <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSyncProfile(); }}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label><input className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700]" value={profileName} onChange={(e) => setProfileName(e.target.value)} /></div>
                                                <div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label><input className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 outline-none" value={profileEmail} disabled /></div>
                                            </div>
                                            <div className="pt-8 flex flex-col sm:flex-row gap-4"><button type="submit" className="flex-1 py-4 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">{loading ? "Syncing..." : "Sync Profile"}</button><button type="button" onClick={() => setShowPasswordModal(true)} className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">Change Password</button></div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0A192F]">
                        <History className="w-12 h-12 text-slate-500 mb-6" />
                        <h2 className="text-2xl font-black text-white tracking-tighter italic uppercase">Coming <span className="text-[#FFD700]">Soon</span></h2>
                    </div>
                )}
            </main>

            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-[#0A192F]/80 backdrop-blur-md" onClick={() => setShowPasswordModal(false)}></div>
                    <div className="relative w-full max-w-md bg-[#0A192F] border border-white/10 rounded-[40px] p-8 shadow-2xl">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8">Secure <span className="text-[#FFD700]">Reset</span></h3>
                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <input type="password" required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700]" placeholder="Current Password" value={passwordData.oldPassword} onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })} />
                            <input type="password" required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700]" placeholder="New Password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                            <input type="password" required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFD700]" placeholder="Confirm New Password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                            <button type="submit" className="w-full py-5 bg-[#FFD700] text-[#0A192F] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em]">{loading ? "Updating..." : "Authorize Update"}</button>
                        </form>
                    </div>
                </div>
            )}
            <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.1); border-radius: 20px; }`}</style>
        </div>
    );
}

function HistoryIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
        </svg>
    );
}
