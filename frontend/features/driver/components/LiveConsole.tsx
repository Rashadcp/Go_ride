"use client";

import React, { useState } from "react";
import { Star, Power, User, Loader2, MessageSquare } from "lucide-react";
import { ChatModal } from "@/features/chat/components/ChatModal";
import { useRideStore } from "@/features/ride/store/useRideStore";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), { ssr: false });

interface LiveConsoleProps {
    user: any;
    userLoc: [number, number] | null;
    isOnline: boolean;
    locationName: string;
    activeTrip: any;
    incomingRequests: any[];
    handleGoOnline: () => void;
    handleGoOffline: () => void;
    handleLocateLive: () => void;
    handleDeclineRequest: (id: string, rideId: string) => void;
    handleAcceptRequest: (req: any) => void;
    handleUpdateStatus: (status: any) => void;
    setActiveTab: (tab: string) => void;
    setIsOnline: (online: boolean) => void;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({
    user,
    userLoc,
    isOnline,
    locationName,
    activeTrip,
    incomingRequests,
    handleGoOnline,
    handleGoOffline,
    handleLocateLive,
    handleDeclineRequest,
    handleAcceptRequest,
    handleUpdateStatus,
    setActiveTab,
    setIsOnline
}) => {
    const { unreadChatMessages } = useRideStore();
    const [isChatOpen, setIsChatOpen] = useState(false);
    return (
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Map Section */}
            <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[40vh]">
                <div className="absolute inset-0 z-0">
                    <MapComponent
                        userLoc={userLoc}
                        showUserMarker={false}
                        rideStatus={activeTrip?.status}
                        passengerLoc={activeTrip ? [activeTrip.pickup.lat, activeTrip.pickup.lng] : null}
                        stops={activeTrip ? [[activeTrip.destination.lat, activeTrip.destination.lng]] : []}
                        onLocate={handleLocateLive}
                        nearbyDrivers={user ? [{ driverId: (user.id || user._id || "") as string, location: { lat: userLoc?.[0] || 0, lng: userLoc?.[1] || 0 } }] : []}
                    />
                    <div className="absolute inset-0 bg-[#0A192F]/20 pointer-events-none"></div>
                </div>

                {/* Status Overlay */}
                <div className="absolute top-4 lg:top-6 left-4 lg:left-6 right-4 lg:right-6 flex flex-col sm:flex-row items-center justify-between gap-3 z-20">
                    <div className="flex items-center gap-3 bg-[#0A192F]/80 backdrop-blur-2xl border border-white/10 px-4 lg:px-6 py-2 lg:py-3 rounded-full shadow-2xl">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#FFD700] animate-pulse ring-4 ring-[#FFD700]/20' : 'bg-slate-500'}`}></div>
                        <span className="text-white font-black text-[8px] lg:text-[9px] uppercase tracking-widest leading-none whitespace-nowrap">
                            live in <span className="text-[#FFD700]">{locationName.substring(0, 15)}...</span> • {isOnline ? 'Active' : 'Offline'}
                        </span>
                    </div>
                    <div className="flex items-center bg-[#0A192F]/90 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-2xl scale-90 lg:scale-95">
                        <button onClick={handleGoOnline} className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${isOnline ? 'bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/20' : 'text-slate-500 hover:text-white'}`}>Online</button>
                        <button onClick={handleGoOffline} className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${!isOnline ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white'}`}>Offline</button>
                    </div>
                </div>
            </div>

            {/* Control Console */}
            <div className="h-[50vh] lg:h-full w-full lg:w-[420px] bg-[#0A192F] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col z-20 shadow-[-30px_0_60px_rgba(0,0,0,0.4)] relative">
                <div className="p-6 lg:p-8 pb-4 shrink-0 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl lg:text-2xl font-black text-white tracking-tighter italic uppercase">Live Console</h3>
                        <div className={`px-3 py-1 rounded-full text-[8px] lg:text-[9px] font-black border uppercase tracking-widest transition-all ${isOnline ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20' : 'bg-white/5 text-slate-500 border-white/10'}`}>{isOnline ? 'Online' : 'Offline'}</div>
                    </div>

                    {/* Performance Hub */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-[24px] lg:rounded-[28px] p-4 lg:p-5 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/20">
                                <Star className="w-5 h-5 fill-[#FFD700] text-[#FFD700]" />
                            </div>
                            <div>
                                <p className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Rating</p>
                                <p className="text-base lg:text-lg font-black text-white italic leading-none">{user?.rating || "5.0"}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setActiveTab('reviews')}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] font-black text-white uppercase tracking-widest transition-all"
                        >
                            View List
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 lg:px-8 pb-8">
                    {isOnline ? (
                        activeTrip ? (
                            <div className="bg-[#FFD700] rounded-[32px] p-6 shadow-2xl shadow-[#FFD700]/10 border border-[#FFD700]/30">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-[#0A192F] text-white text-[8px] font-black rounded-full uppercase tracking-widest">Active Engagement</span>
                                        <button 
                                            onClick={() => setIsChatOpen(true)}
                                            className="w-8 h-8 bg-[#0A192F] text-[#FFD700] rounded-full flex items-center justify-center border border-white/10 shadow-lg transition-all hover:bg-black hover:scale-110 active:scale-90 relative"
                                            title="Chat with Passenger"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            {(() => {
                                               const receiverId = activeTrip.passengerId?._id || activeTrip.passengerId || activeTrip.createdBy || "";
                                               const chatKey = `${activeTrip.rideId || activeTrip._id || ""}_${[String(user?.id || user?._id), String(receiverId)].sort().join("_")}`;
                                               const unreadCount = unreadChatMessages[chatKey] || 0;
                                               if (unreadCount > 0) return (
                                                 <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white shadow-lg animate-bounce border border-white/20">
                                                   {unreadCount}
                                                 </span>
                                               );
                                               return null;
                                            })()}
                                        </button>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-[#0A192F] shadow-sm animate-pulse"></div>
                                </div>
                                <div className="text-center mb-6">
                                    <p className="text-[#0A192F] font-black text-base lg:text-lg leading-tight mb-1">
                                        {activeTrip.status === "ACCEPTED" ? `Heading to Pickup` : 
                                         activeTrip.status === "ARRIVED" ? `Waiting for Passenger` : 
                                         activeTrip.status === "STARTED" ? `En Route to Destination` : `Trip Finished`}
                                    </p>
                                    <p className="text-[#0A192F]/60 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest leading-none">{activeTrip.passengerName || "Passenger"}</p>
                                </div>
                                <div className="space-y-3">
                                    {activeTrip.status === "ACCEPTED" && <button onClick={() => handleUpdateStatus("ARRIVED")} className="w-full py-4 bg-[#0A192F] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Mark Arrived</button>}
                                    {activeTrip.status === "ARRIVED" && <button onClick={() => handleUpdateStatus("STARTED")} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Start Trip</button>}
                                    {activeTrip.status === "STARTED" && <button onClick={() => handleUpdateStatus("COMPLETED")} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">End Trip & Collect</button>}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 lg:space-y-6">
                                <div className="flex items-center justify-between mb-2"><h4 className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Incoming Requests</h4><span className="text-[9px] font-black text-[#FFD700]">{incomingRequests.length} NEARBY</span></div>
                                {incomingRequests.map((req) => (
                                    <div key={req.rideId} className="bg-[#0A192F]/80 backdrop-blur-2xl border border-white/10 rounded-[28px] lg:rounded-[30px] p-4 lg:p-5 transition-all hover:scale-[1.02] hover:border-[#FFD700]/30 shadow-2xl">
                                        <div className="flex items-start justify-between mb-4 lg:mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center overflow-hidden border border-[#FFD700]/30 shadow-lg">
                                                    {(() => {
                                                       const rawPhoto = req.passengerPhoto || req.photo || req.profilePhoto;
                                                       const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
                                                       let finalSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.passengerName || req.name || "P")}&background=FFD700&color=0A192F&bold=true`;
                                                       
                                                       if (rawPhoto) {
                                                          if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) {
                                                             finalSrc = rawPhoto;
                                                          } else {
                                                             finalSrc = `${baseUrl}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
                                                          }
                                                       }
                                                       return <img src={finalSrc} alt="P" className="w-full h-full object-cover" />;
                                                    })()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-sm lg:text-base leading-tight">{req.passengerName || req.name || "New Passenger"}</p>
                                                    <div className="flex items-center gap-1 mt-1"><Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" /><span className="text-[9px] lg:text-[10px] font-black text-slate-400">{req.passengerRating || "4.9"}</span></div>
                                                </div>
                                            </div>
                                            <p className="text-[8px] lg:text-[10px] font-black text-[#FFD700] tracking-widest">NOW</p>
                                        </div>
                                        <div className="space-y-2 lg:space-y-3 mb-4 lg:mb-6">
                                            <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shrink-0"></div><p className="text-[10px] lg:text-[11px] font-bold text-slate-300 truncate">{req.pickup?.label || "Pickup"}</p></div>
                                            <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></div><p className="text-[10px] lg:text-[11px] font-bold text-slate-300 truncate">{req.destination?.label || "Destination"}</p></div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div><p className="text-lg lg:text-xl font-black text-[#FFD700]">₹{req.fare?.toFixed(2)}</p></div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDeclineRequest(req.id, req.rideId)} className="px-3 lg:px-4 py-2 lg:py-2.5 bg-white/5 text-slate-400 rounded-xl font-black text-[8px] lg:text-[9px] uppercase tracking-widest border border-transparent hover:border-rose-500/20">Decline</button>
                                                <button onClick={() => handleAcceptRequest(req)} className="px-4 lg:px-6 py-2 lg:py-2.5 bg-[#FFD700] text-[#0A192F] rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest shadow-lg">Accept</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/5 rounded-[40px] flex items-center justify-center mb-6 lg:mb-8 border border-white/10"><Power className="w-6 h-6 lg:w-8 lg:h-8 text-slate-500" /></div>
                            <h4 className="text-lg lg:text-xl font-black text-white italic uppercase tracking-tighter mb-2 lg:mb-3">System Standby</h4>
                            <p className="text-slate-500 text-[9px] lg:text-[11px] font-bold uppercase tracking-widest mb-8 lg:mb-10">Go online to receive requests</p>
                            <button onClick={() => setIsOnline(true)} className="w-full py-4 lg:py-5 bg-white text-[#0A192F] rounded-2xl lg:rounded-3xl font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em]">Go Online Now</button>
                        </div>
                    )}
                </div>
            </div>

            {isChatOpen && activeTrip && (
              <ChatModal 
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                rideId={activeTrip.rideId || activeTrip._id || ""}
                userId={user?.id || user?._id || ""}
                receiverId={activeTrip.passengerId?._id || activeTrip.passengerId || activeTrip.createdBy || ""}
                receiverName={activeTrip.passengerName || "Passenger"}
                senderName={user.firstName ? `${user.firstName} ${user.lastName}` : (user.name || "Driver")}
              />
            )}
        </div>
    );
};
