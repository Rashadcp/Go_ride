import { ChevronRight, LayoutDashboard, History, TrendingUp, Wallet, Settings, ShieldCheck, LogOut, Car, User as UserProfile, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const SIDEBAR_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "history", icon: History, label: "Ride History" },
  { id: "earnings", icon: TrendingUp, label: "Earnings" },
  { id: "wallet", icon: Wallet, label: "Wallet" },
  { id: "settings", icon: Settings, label: "Settings" }
];

export function Sidebar({ 
  user,
  activeTab, 
  setActiveTab, 
  isSidebarExpanded, 
  setIsSidebarExpanded,
  handleLogout 
}: any) {
  const router = useRouter();

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden h-16 bg-[#0A192F] border-b border-white/5 flex items-center px-6 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10">
            <Car className="text-[#0A192F] w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-black leading-none text-sm tracking-tighter uppercase italic">
              Go<span className="text-[#FFD700]">Ride</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex ${isSidebarExpanded ? "w-70" : "w-22.5"} bg-[#0A192F] dark:bg-[#050B14] flex-col pt-10 border-r border-white/5 z-[60] transition-all duration-500 ease-in-out relative group`}>
        <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="absolute -right-3 top-20 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-[#0A192F] shadow-lg border-2 border-[#0A192F] hover:scale-110 active:scale-95 transition-all z-[70]">
          <ChevronRight className={`w-4 h-4 transition-transform duration-500 ${isSidebarExpanded ? "rotate-180" : "rotate-0"}`} />
        </button>

        <div className={`mb-14 transition-all duration-300 ${isSidebarExpanded ? "px-8" : "px-0 flex justify-center"}`}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-[#FFD700] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FFD700]/10 shrink-0">
              <Car className="text-[#0A192F] w-6 h-6" />
            </div>
            {isSidebarExpanded && (
              <div className="transition-all duration-300 opacity-100 transform translate-x-0">
                <h1 className="text-white font-black leading-none mb-1 text-base tracking-tighter uppercase italic">
                  Go<span className="text-[#FFD700]">Ride</span>
                </h1>
                <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-500">Console</p>
              </div>
            )}
          </div>
        </div>

        <nav className={`flex-1 space-y-3 transition-all duration-300 ${isSidebarExpanded ? "px-4" : "px-3"}`}>
          {SIDEBAR_ITEMS.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-center gap-4 rounded-[20px] transition-all group/item ${activeTab === item.id ? "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/10" : "text-slate-400 hover:bg-white/5 hover:text-white"} ${isSidebarExpanded ? "px-4 py-3.5" : "h-[64px] justify-center"}`} 
              title={!isSidebarExpanded ? item.label : ""}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover/item:scale-110`} />
              {isSidebarExpanded && <span className="font-extrabold text-sm tracking-wide truncate">{item.label}</span>}
            </button>
          ))}

          {user?.role === "ADMIN" && (
            <button onClick={() => router.push("/admin/drivers")} className={`w-full flex items-center gap-4 rounded-[20px] transition-all text-emerald-500 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 ${isSidebarExpanded ? "px-4 py-3.5" : "h-16 justify-center"}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              {isSidebarExpanded && <span className="font-extrabold text-sm tracking-wide truncate">Admin</span>}
            </button>
          )}
        </nav>

        <div className={`mt-auto border-t border-white/5 p-4 space-y-4 bg-black/10`}>
          <div className={`flex items-center gap-3 ${isSidebarExpanded ? "px-2 py-2" : "justify-center"}`}>
            <div className="w-12 h-12 rounded-[18px] bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group/profile cursor-pointer hover:border-[#FFD700]/50 transition-colors">
              {user?.profilePhoto ? (
                <Image src={user.profilePhoto} alt="Profile" width={48} height={48} className="object-cover" unoptimized={true} />
              ) : (
                <UserProfile className="text-[#FFD700] w-6 h-6" />
              )}
            </div>
            {isSidebarExpanded && (
              <div className="flex-1 min-w-0 transition-all duration-300">
                <p className="text-sm font-black text-white truncate leading-none mb-1">{user?.name || "Guest"}</p>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-[#FFD700] text-[#FFD700]" />
                  <span className="text-[10px] font-black text-slate-500 tracking-wider">{(user?.rating || 5.0).toFixed(1)} RATIO</span>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLogout} className={`w-full flex items-center gap-3 rounded-[20px] bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all font-black text-[11px] uppercase tracking-widest shadow-lg group/logout ${isSidebarExpanded ? "px-4 py-4 justify-center" : "h-[64px] justify-center"}`}>
            <LogOut className={`w-4 h-4 transition-transform group-hover/logout:-translate-x-1`} />
            {isSidebarExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0A192F] border-t border-white/5 flex items-center justify-around px-2 z-50 backdrop-blur-lg bg-opacity-95">
        {SIDEBAR_ITEMS.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all ${activeTab === item.id ? "text-[#FFD700]" : "text-slate-500 active:text-white"}`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? "scale-110" : ""}`} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label.split(" ")[0]}</span>
          </button>
        ))}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl text-rose-500 active:text-white">
          <LogOut className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Exit</span>
        </button>
      </nav>
    </>
  );
}
