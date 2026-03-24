"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  MapPin,
  Share2,
  Wallet,
  CheckCircle,
  Navigation,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Globe,
  Instagram,
  Twitter,
  Facebook
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null;
    setIsLoggedIn(!!token);
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-[family-name:var(--font-roboto)] overflow-x-hidden selection:bg-[#FFD700]/30 transition-colors duration-500">
      {/* --- Navigation --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#F5F5F0]/80 backdrop-blur-xl border-b border-[#E5E5E0] md:px-24">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-lg shadow-[#1A1A1A]/10 group-hover:scale-105 transition-transform">
            <Navigation className="w-5 h-5 text-[#FFD700] fill-current" strokeWidth={1.5} />
          </div>
          <span className="font-[family-name:var(--font-montserrat)] font-black text-xl lg:text-2xl tracking-tighter text-[#1A1A1A]">GO<span className="text-[#FFD700]">RIDE</span></span>
        </div>

        <div className="hidden lg:flex items-center gap-10 text-[11px] font-black text-[#4A4A48] uppercase tracking-[0.2em]">
          <a href="#" className="hover:text-[#1A1A1A] transition-colors">Home</a>
          <a href="#how-it-works" className="hover:text-[#1A1A1A] transition-colors">How It Works</a>
          <a href="#services" className="hover:text-[#1A1A1A] transition-colors">Services</a>
          <a href="#about" className="hover:text-[#1A1A1A] transition-colors">About</a>
        </div>

        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <>
              <a href="/login" className="hidden sm:block px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#4A4A48] hover:text-[#1A1A1A] transition-colors">Login</a>
              <a href="/register" className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] bg-[#FFD700] rounded-xl hover:bg-[#FFC000] transition-all shadow-xl shadow-[#FFD700]/15 active:scale-95">Register</a>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden md:pt-52 md:pb-40 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,215,0,0.1)_0%,_transparent_60%)] font-[family-name:var(--font-montserrat)]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E5E5E0] mb-10 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B8860B]">The Future of Mobility</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-[#1A1A1A] mb-10 leading-[0.9] uppercase">
            Seamless <br />
            <span className="text-[#FFD700]">Travel.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-[#4A4A48] font-medium text-lg md:text-xl leading-relaxed mb-14 px-4 font-[family-name:var(--font-roboto)]">
            Experience the first all-in-one platform that combines on-demand taxi services with smart peer-to-peer ride-sharing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => router.push('/register')}
              className="group relative flex items-center gap-3 px-10 py-5 bg-[#1A1A1A] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:-translate-y-1 shadow-2xl active:scale-95 overflow-hidden"
            >
              Join as Passenger
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/register?role=DRIVER')}
              className="flex items-center gap-3 px-10 py-5 bg-white border border-[#E5E5E0] rounded-2xl font-black uppercase tracking-widest text-xs text-[#1A1A1A] transition-all hover:bg-slate-50 hover:-translate-y-1 shadow-sm active:scale-95"
            >
              Earn as Driver
            </button>
          </div>
        </div>
      </section>

      {/* --- For Users Section --- */}
      <section id="how-it-works" className="py-32 px-6 md:px-24 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center mb-24 font-[family-name:var(--font-montserrat)]">
          <h2 className="text-4xl font-black text-[#1A1A1A] mb-4 uppercase tracking-tight">How it Works</h2>
          <div className="w-20 h-1 bg-[#FFD700] mx-auto rounded-full mb-6"></div>
          <p className="text-[#4A4A48] font-medium max-w-lg mx-auto font-[family-name:var(--font-roboto)]">Choose between a private taxi or split the cost with our smart shared ride system.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { id: "01", title: "Identity", desc: "Create your profile in seconds and verify your identity.", icon: <UserPlus className="w-6 h-6" /> },
            { id: "02", title: "Book", desc: "Enter your destination and choose between private or shared taxis.", icon: <MapPin className="w-6 h-6" /> },
            { id: "03", title: "Hybrid", desc: "Toggle to 'Hybrid' to split costs and meet new people.", icon: <Share2 className="w-6 h-6" /> },
            { id: "04", title: "Payment", desc: "Track your route in realtime and pay automatically via wallet.", icon: <Wallet className="w-6 h-6" /> },
          ].map((item, i) => (
            <div key={i} className="group p-10 rounded-3xl bg-white border border-[#E5E5E0] hover:border-[#FFD700]/30 hover:shadow-xl transition-all duration-500">
              <div className="w-14 h-14 bg-[#F5F5F0] rounded-2xl flex items-center justify-center mb-10 text-[#B8860B] group-hover:scale-110 group-hover:bg-[#FFD700] group-hover:text-[#1A1A1A] transition-all shadow-sm">
                {item.icon}
              </div>
              <span className="text-[#B8860B]/20 font-black text-2xl mb-4 block font-[family-name:var(--font-montserrat)]">STEP {item.id}</span>
              <h3 className="text-xl font-black text-[#1A1A1A] mb-4 uppercase tracking-tighter font-[family-name:var(--font-montserrat)]">{item.title}</h3>
              <p className="text-[#4A4A48] font-medium text-sm leading-relaxed font-[family-name:var(--font-roboto)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Unique Feature Section --- */}
      <section id="services" className="px-6 md:px-24 mb-32 scroll-mt-20">
        <div className="max-w-7xl mx-auto rounded-[48px] bg-[#1A1A1A] overflow-hidden flex flex-col lg:flex-row border border-white/5 shadow-2xl">
          <div className="flex-1 p-12 md:p-20 flex flex-col justify-center relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/5 blur-[100px] -z-0"></div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 mb-8 self-start">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFD700]" strokeWidth={1.5} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700]">Unique Feature</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1] uppercase tracking-tighter font-[family-name:var(--font-montserrat)]">
              Share Your Ride, <br />
              <span className="text-[#FFD700]">Save Money.</span>
            </h2>

            <p className="text-slate-400 font-medium text-lg mb-12 leading-relaxed max-w-xl font-[family-name:var(--font-roboto)]">
              Why travel alone? Our hybrid model allows passengers to become hosts. Reduce traffic congestion and earn credits while commuting your usual route.
            </p>

            <button className="px-10 py-5 bg-[#FFD700] text-[#1A1A1A] rounded-2xl font-black uppercase tracking-widest text-xs self-start shadow-xl shadow-[#FFD700]/10 hover:bg-[#FFC000] hover:-translate-y-1 transition-all active:scale-95">
              Try Ride Sharing Today
            </button>
          </div>

          <div className="flex-1 h-[400px] lg:h-auto relative grayscale opacity-80 hover:grayscale-0 transition-all duration-700">
            <Image
              src="/assets/passenger_service.png"
              alt="Passenger enjoying a ride"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#1A1A1A] via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer id="about" className="pt-32 pb-16 px-6 md:px-24 bg-[#1A1A1A] text-white transition-colors duration-500 scroll-mt-20 font-[family-name:var(--font-roboto)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 mb-24">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-9 h-9 bg-[#FFD700] rounded-xl flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-[#1A1A1A] fill-current" strokeWidth={1.5} />
                </div>
                <span className="font-black text-2xl tracking-tighter text-white uppercase font-[family-name:var(--font-montserrat)]">GO<span className="text-[#FFD700]">RIDE</span></span>
              </div>
              <p className="text-slate-400 font-medium max-w-sm leading-relaxed mb-8">
                Redefining urban mobility through a unique blend of ride-sharing and professional taxi services. Sustainable, safe, and efficient.
              </p>
              <div className="flex gap-4">
                {[Instagram, Twitter, Facebook].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#FFD700] hover:border-[#FFD700] transition-all">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: "Platform", links: ["How it Works", "Pricing", "Safety", "Cities"] },
              { title: "Company", links: ["About Us", "Careers", "Contact", "Newsroom"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Compliance"] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-black text-[#FFD700] mb-8 uppercase tracking-[0.2em] text-[10px] font-[family-name:var(--font-montserrat)]">{col.title}</h4>
                <ul className="space-y-4 font-medium text-xs">
                  {col.links.map((link, j) => (
                    <li key={j}><a href="#" className="text-slate-400 hover:text-white transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em]">
            <p className="text-slate-500 underline decoration-[#FFD700] decoration-2 underline-offset-4">© 2026 GoRide Technologies Inc.</p>
            <span className="text-[#FFD700]">By Rashad</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
