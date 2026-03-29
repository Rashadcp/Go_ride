"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-hot-toast";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";

// Modular Components
import { DriverSidebar } from "@/features/driver/components/DriverSidebar";
import { MobileNav } from "@/features/driver/components/MobileNav";
import { LiveConsole } from "@/features/driver/components/LiveConsole";
import { TripHistory } from "@/features/driver/components/TripHistory";
import { ReviewsList } from "@/features/driver/components/ReviewsList";
import { ProfileTab } from "@/features/driver/components/ProfileTab";
import { EarningsTab } from "@/features/driver/components/EarningsTab";
import { NotificationsTab } from "@/features/driver/components/NotificationsTab";
import { Loader2, MessageCircle } from "lucide-react";
import { useRideStore } from "@/features/ride/store/useRideStore";

export default function DriverDashboard() {
    const router = useRouter();
    const { user, clearAuth } = useAuthStore();
    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const { addChatMessage, incrementUnreadCount } = useRideStore();
    const [loading, setLoading] = useState(false);
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [vehicle, setVehicle] = useState<any>(null);
    const [vehiclePreviewUrl, setVehiclePreviewUrl] = useState<string | null>(null);
    const [vehiclePic, setVehiclePic] = useState<File | null>(null);
    const [vehicleData, setVehicleData] = useState({
        numberPlate: "",
        vehicleModel: "",
        vehicleType: "Go"
    });

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
    const [reviews, setReviews] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/rides/history");
                setTrips(data);
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
            }
        };
        if (user && activeTab === 'history') fetchHistory();
    }, [user, activeTab]);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const { data } = await api.get("/rating/my-ratings");
                setReviews(data);
                
                const profile = await api.get("/auth/me");
                useAuthStore.getState().setUser(profile.data);
            } catch (err) {
                console.error("Failed to fetch reviews:", err);
            }
        };
        if (user && activeTab === 'reviews') fetchReviews();
    }, [user, activeTab]);

    useEffect(() => {
        if (user && user.role !== "DRIVER") {
            router.push("/user/dashboard");
        }
    }, [user, router]);

    useEffect(() => {
        const syncProfile = async () => {
            try {
                const { data } = await api.get("/auth/me");
                useAuthStore.getState().setUser(data);
                setProfileName(data.name);
                setProfileEmail(data.email);
            } catch (err) {
                console.error("Profile sync error:", err);
            }
        };

        const fetchVehicle = async () => {
            try {
                const { data } = await api.get("/vehicles/me");
                setVehicle(data);
                setVehicleData({
                    numberPlate: data.numberPlate || "",
                    vehicleModel: data.vehicleModel || "",
                    vehicleType: data.vehicleType || "Go"
                });
            } catch (err) {
                console.error("Vehicle fetch error:", err);
            }
        };

        if (user) {
            syncProfile();
            fetchVehicle();
        }

        try {
            const savedOnline = localStorage.getItem("driverOnlineStatus");
            if (savedOnline === "true") setIsOnline(true);
            const savedLocation = localStorage.getItem("driverLastLocation");
            if (savedLocation) {
                const parsed = JSON.parse(savedLocation);
                if (Array.isArray(parsed) && parsed.length === 2) {
                    setUserLoc([Number(parsed[0]), Number(parsed[1])]);
                }
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("driverOnlineStatus", String(isOnline));
        }
    }, [isOnline]);

    useEffect(() => {
        if (!(isOnline && user && userLoc)) {
            if (isOnline && !userLoc) handleLocateLive();
            return;
        }

        connectSocket();
        socket.emit("join", { userId: user.id || user._id, role: "DRIVER" });
        socket.emit("driver-online", {
            driverId: user.id || user._id,
            location: { lat: userLoc[0], lng: userLoc[1] },
            name: user.name,
            profilePhoto: user.profilePhoto,
            rating: user?.rating || 5.0,
            vehicleType: (user as any).vehicleType || "go"
        });

        const handleIncoming = (request: any) => {
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

        socket.on("new-ride-request", handleIncoming);
        socket.on("ride-request", handleIncoming);
        socket.on("ride-cancelled", handleCancelled);
        socket.on("ride-status-update", handleStatusUpdate);

        socket.on("chat:new_message", (data: any) => {
            const { rideId, senderId, receiverId, message, senderName } = data;
            // Only handle if message is for this user
            if (String(receiverId) === String(user.id || user._id)) {
                const conversationKey = `${rideId}_${[String(senderId), String(receiverId)].sort().join("_")}`;
                addChatMessage(conversationKey, { ...data, isSelf: false });
                incrementUnreadCount(conversationKey);
                
                toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#0A192F] shadow-2xl rounded-[28px] pointer-events-auto flex ring-1 ring-white/10 overflow-hidden border border-white/5`}>
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5">
                                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#FFD700]">
                                        <MessageCircle className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-xs font-black text-white uppercase tracking-widest italic">New Message from {senderName}</p>
                                    <p className="mt-1 text-sm font-bold text-slate-400 line-clamp-2 leading-relaxed">"{message}"</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-white/5">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-white/5 active:scale-95 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ), { duration: 5000, id: `chat-${conversationKey}` });
            }
        });

        return () => {
            socket.off("new-ride-request", handleIncoming);
            socket.off("ride-request", handleIncoming);
            socket.off("ride-cancelled", handleCancelled);
            socket.off("ride-status-update", handleStatusUpdate);
            socket.off("chat:new_message");
            disconnectSocket();
        };
    }, [isOnline, user, userLoc]);

    useEffect(() => {
        if (isOnline && userLoc && user) {
            socket.emit("driver-location-update", {
                driverId: user.id || user._id,
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
                setLocationName(data.locality || data.city || data.principalSubdivision || "Unknown Location");
            } catch (err) {
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

    const handleDeclineRequest = (id: string, rideId: string) => {
        setIncomingRequests(prev => prev.filter(r => r.rideId !== rideId));
        if (user) socket.emit("ride-reject", { rideId, driverId: user.id || user._id });
        toast.error("Request dismissed");
    };

    const handleAcceptRequest = (request: any) => {
        setIncomingRequests(prev => prev.filter(r => r.rideId !== request.rideId));
        if (user) {
            socket.emit("join-ride", { rideId: request.rideId });
            socket.emit("ride-accept", {
                rideId: request.rideId,
                driverId: user.id || user._id,
                passengerId: request.passengerId,
                driverInfo: {
                    name: (user as any).name || (user as any).firstName || "Driver",
                    profilePhoto: user.profilePhoto,
                    rating: user?.rating || 5.0,
                    vehiclePlate: vehicleData.numberPlate || (user as any).vehicleNumber || (vehicle as any)?.numberPlate || "NOT AVAILABLE",
                    vehicleType: (user as any).vehicleType || vehicleData.vehicleType || "go",
                    vehicleModel: vehicleData.vehicleModel || (user as any).vehicleModel || (vehicle as any)?.vehicleModel || "Swift",
                    vehiclePhoto: vehicle?.vehiclePhotos?.[0] || (user as any).vehiclePhoto || null,
                    location: { lat: userLoc?.[0], lng: userLoc?.[1] }
                }
            });
            socket.emit("update-ride-status", {
                rideId: request.rideId,
                driverId: user.id || user._id,
                passengerId: request.passengerId,
                status: 'ACCEPTED'
            });
        }
        setActiveTrip({ ...request, status: 'ACCEPTED', step: 1 });
        toast.success(`Heading to pickup location`);
    };

    const handleUpdateStatus = (status: any) => {
        if (!activeTrip || !user) return;
        socket.emit("update-ride-status", {
            rideId: activeTrip.rideId,
            driverId: user.id || user._id,
            passengerId: activeTrip.passengerId,
            status: status
        });
        if (status === "COMPLETED") {
            toast.success("Ride Completed!");
            setActiveTrip(null);
        } else {
            setActiveTrip({ ...activeTrip, status });
            toast.success(status === "ARRIVED" ? "Arrived at Pickup" : "Trip Started");
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
            if (profilePic) formData.append("profilePhoto", profilePic);
            const response = await api.put("/auth/me", formData, { headers: { "Content-Type": "multipart/form-data" } });
            useAuthStore.getState().setUser(response.data);
            toast.success("Profile updated successfully!");
            setProfilePic(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("numberPlate", vehicleData.numberPlate);
            formData.append("vehicleModel", vehicleData.vehicleModel);
            formData.append("vehicleType", vehicleData.vehicleType);
            if (vehiclePic) {
                formData.append("vehiclePhotos", vehiclePic);
            }

            const response = await api.put("/vehicles", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setVehicle(response.data.vehicle);
            toast.success("Vehicle records updated!");
            setVehiclePic(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update vehicle");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-[#0A192F] flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-[#FFD700] selection:text-[#0A192F]">
            <DriverSidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

            <main className="flex-1 flex flex-col h-full bg-[#0A192F] relative overflow-hidden pb-16 lg:pb-0">
                {activeTab === "dashboard" ? (
                    <LiveConsole 
                        user={user} userLoc={userLoc} isOnline={isOnline} locationName={locationName}
                        activeTrip={activeTrip} incomingRequests={incomingRequests}
                        handleGoOnline={() => setIsOnline(true)} handleGoOffline={() => setIsOnline(false)}
                        handleLocateLive={handleLocateLive} handleDeclineRequest={handleDeclineRequest}
                        handleAcceptRequest={handleAcceptRequest} handleUpdateStatus={handleUpdateStatus}
                        setActiveTab={setActiveTab} setIsOnline={setIsOnline}
                    />
                ) : activeTab === "history" ? (
                    <TripHistory trips={trips} loading={loading} />
                ) : activeTab === "reviews" ? (
                    <ReviewsList reviews={reviews} user={user} onRefresh={() => {}} />
                ) : activeTab === "earnings" ? (
                    <EarningsTab trips={trips} />
                ) : activeTab === "notifications" ? (
                    <NotificationsTab />
                ) : activeTab === "profile" ? (
                    <ProfileTab 
                        user={user} profileName={profileName} setProfileName={setProfileName}
                        profileEmail={profileEmail} previewUrl={previewUrl}
                        handleFileChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setProfilePic(file);
                                const reader = new FileReader();
                                reader.onloadend = () => setPreviewUrl(reader.result as string);
                                reader.readAsDataURL(file);
                            }
                        }}
                        handleSyncProfile={handleSyncProfile}
                        setShowPasswordModal={setShowPasswordModal}
                        loading={loading}
                        // Vehicle Props
                        vehicle={vehicle}
                        vehiclePreviewUrl={vehiclePreviewUrl}
                        handleVehiclePhotoChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setVehiclePic(file);
                                const reader = new FileReader();
                                reader.onloadend = () => setVehiclePreviewUrl(reader.result as string);
                                reader.readAsDataURL(file);
                            }
                        }}
                        handleUpdateVehicle={handleUpdateVehicle}
                        vehicleData={vehicleData}
                        setVehicleData={setVehicleData}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0A192F]">
                        <h2 className="text-2xl font-black text-white italic uppercase">Coming <span className="text-[#FFD700]">Soon</span></h2>
                    </div>
                )}
            </main>

            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
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

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.1); border-radius: 20px; }
                @media (max-width: 1024px) { .custom-scrollbar::-webkit-scrollbar { width: 0px; } }
            `}</style>
        </div>
    );
}
