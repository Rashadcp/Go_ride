"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Bell, HelpCircle, Wallet, IndianRupee } from "lucide-react";

import { useUser } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

// Stores
import { useRideStore } from "@/features/ride/store/useRideStore";

// Hooks
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";

// Components
import { Sidebar } from "@/features/dashboard/components/Sidebar";
import { HistoryTab } from "@/features/dashboard/components/HistoryTab";
import { EarningsTab } from "@/features/dashboard/components/EarningsTab";
import { WalletTab } from "@/features/dashboard/components/WalletTab";
import { SettingsTab } from "@/features/dashboard/components/SettingsTab";
import { PassengerView } from "@/features/ride/components/PassengerView";
import { DriverView } from "@/features/driver/components/DriverView";

export default function UserDashboard() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Global State
  const { 
    activeTab, 
    setActiveTab, 
    isSidebarExpanded, 
    setIsSidebarExpanded,
    isDriverMode,
    setIsDriverMode,
    isNotificationsOpen,
    setIsNotificationsOpen,
    setIsRouteSearched,
    setSearchStarted,
    setLoadingDrivers
  } = useRideStore();

  // Queries (TanStack Query)
  const dashboardData = useDashboardData();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !userLoading && user?.role === "DRIVER" && ["PENDING", "AWAITING_APPROVAL"].includes(user?.status || "")) {
      router.push("/driver/onboarding");
    }
  }, [mounted, router, user, userLoading]);

  if (!mounted || userLoading) {
    return (
      <div className="h-screen bg-[#0A192F] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (user?.role === "DRIVER" && ["PENDING", "AWAITING_APPROVAL"].includes(user?.status || "")) {
    return null;
  }

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden selection:bg-[#FFD700]/30 font-sans transition-colors duration-500">
      <Sidebar 
        user={user}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarExpanded={isSidebarExpanded} 
        setIsSidebarExpanded={setIsSidebarExpanded}
        handleLogout={handleLogout}
      />

      <main className="flex-1 relative flex flex-col overflow-hidden">
        {activeTab === "dashboard" && (
          <>
            <div className="absolute top-8 right-8 z-50 flex items-stretch justify-end gap-4 pointer-events-auto">
               {!isDriverMode && (
                 <div className="bg-[#FEF3C7]/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-white/50 h-[44px]">
                   <Wallet className="text-[#0A192F] w-5 h-5" />
                   <div className="flex items-center gap-1 text-[#0A192F] font-black tracking-tight text-sm mt-0.5">
                       <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                       <span>{Number((user as any)?.walletBalance ?? 0).toFixed(2)}</span>
                   </div>
                 </div>
               )}
               
               <div className="flex p-1 bg-white/80 backdrop-blur-md rounded-full shadow-2xl border border-white group/switcher overflow-hidden h-[44px]">
                   <button onClick={() => { setIsDriverMode(false); setIsRouteSearched(false); setSearchStarted(false); setLoadingDrivers(false); }} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!isDriverMode ? "bg-[#0A192F] text-[#FFD700] shadow-lg" : "text-slate-400 hover:text-slate-600"}`}>
                       Passenger
                   </button>
                   <button onClick={() => { setIsDriverMode(true); setIsRouteSearched(false); setSearchStarted(false); setLoadingDrivers(false); }} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isDriverMode ? "bg-[#FFD700] text-[#0A192F] shadow-lg" : "text-slate-400 hover:text-slate-600"}`}>
                       Share My Ride
                   </button>
               </div>
               
               <div className="flex items-center gap-3">
                 <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className={`w-11 h-11 bg-white/80 backdrop-blur-md rounded-full shadow-xl flex items-center justify-center transition-all border border-white ${isNotificationsOpen ? "text-[#0A192F] bg-white ring-2 ring-[#FFD700]/20" : "text-slate-400 hover:text-[#0A192F]"}`}>
                   <Bell className="w-5 h-5 relative" />
                   <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                 </button>
                 <button className="w-11 h-11 bg-white/80 backdrop-blur-md rounded-full shadow-xl flex items-center justify-center text-slate-400 hover:text-[#0A192F] transition-all border border-white">
                   <HelpCircle className="w-5 h-5" />
                 </button>
               </div>
            </div>

            {!isDriverMode ? (
              <PassengerView user={user} />
            ) : (
              <DriverView user={user} />
            )}
          </>
        )}

        {activeTab === "history" && (
          <HistoryTab ridesHistory={dashboardData.ridesHistory} setActiveTab={setActiveTab} />
        )}

        {activeTab === "earnings" && (
          <EarningsTab />
        )}

        {activeTab === "wallet" && (
          <WalletTab user={user} setShowTopUpModal={() => {}} />
        )}

        {activeTab === "settings" && (
          <SettingsTab 
            user={user}
            isUpdatingProfile={dashboardData.updateProfileMutation.isPending}
            profileData={{ firstName: "", lastName: "" }}
            setProfileData={() => {}}
            handleUpdateProfile={() => {}}
            handleUpdateImage={() => {}}
            isAddingAddress={false}
            setIsAddingAddress={() => {}}
            addressFormData={{ label: "", address: "" }}
            setAddressFormData={() => {}}
            handleAddAddress={() => {}}
            handleDeleteAddress={() => {}}
            securityData={{}}
            setSecurityData={() => {}}
            handleChangePassword={() => {}}
          />
        )}
      </main>
      
      <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
