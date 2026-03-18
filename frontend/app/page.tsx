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
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans overflow-x-hidden selection:bg-[#FFD700]/30 transition-colors duration-500">
      {/* --- Navigation --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-[#0A192F]/90 backdrop-blur-xl border-b border-gray-100/50 dark:border-white/5 md:px-24">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0A192F] fill-current">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
            </svg>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#0A192F] dark:text-white">GO<span className="text-[#FFD700]">RIDE</span></span>
        </div>

        <div className="hidden lg:flex items-center gap-10 text-[13px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          <a href="#" className="hover:text-[#FFD700] transition-colors">Home</a>
          <a href="#how-it-works" className="hover:text-[#FFD700] transition-colors">How It Works</a>
          <a href="#services" className="hover:text-[#FFD700] transition-colors">Services</a>
          <a href="#about" className="hover:text-[#FFD700] transition-colors">About</a>
        </div>

        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <>
              <a href="/login" className="hidden sm:block px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 hover:text-[#FFD700] transition-colors">Login</a>
              <a href="/register" className="px-6 py-2.5 text-sm font-bold text-[#0A192F] bg-[#FFD700] rounded-xl hover:bg-[#E6C200] transition-all shadow-xl shadow-[#FFD700]/15 active:scale-95">Register</a>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 text-sm font-bold border-2 border-red-500/10 dark:border-red-500/20 text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/5 transition-all active:scale-95"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden md:pt-52 md:pb-40 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,215,0,0.12)_0%,_transparent_60%)]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-50 dark:bg-[#FFD700]/5 border border-[#FFD700]/20 mb-10 animate-fade-in-down shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8860B] dark:text-[#FFD700]">The Future of Mobility</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-[#0A192F] dark:text-white mb-10 leading-[1] [text-wrap:balance]">
            Seamless Travel. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#E6C200]">Hybrid Performance.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-500 text-lg md:text-xl leading-relaxed mb-14 px-4">
            Experience the first all-in-one platform that combines on-demand taxi services with smart peer-to-peer ride-sharing. Better for you, better for the planet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => router.push('/register')}
              className="group relative flex items-center gap-3 px-10 py-5 bg-[#0A192F] text-white rounded-2xl font-bold transition-all hover:bg-[#001F3F] hover:-translate-y-1 shadow-2xl active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              Join as Passenger
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/register?role=DRIVER')}
              className="flex items-center gap-3 px-10 py-5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-1 shadow-sm active:scale-95"
            >
              Earn as Driver
            </button>
          </div>
        </div>
      </section>

      {/* --- For Users Section --- */}
      <section id="how-it-works" className="py-32 px-6 md:px-24 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center mb-24">
          <h2 className="text-4xl font-extrabold text-[#0A192F] mb-4">For Users</h2>
          <div className="w-20 h-1.5 bg-[#FFD700] mx-auto rounded-full mb-6"></div>
          <p className="text-slate-500 max-w-lg mx-auto">Choose between a private taxi or split the cost with our smart shared ride system.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { id: "01", title: "Register & Login", desc: "Create your profile in seconds and verify your identity.", icon: <UserPlus className="w-6 h-6" /> },
            { id: "02", title: "Book a Ride", desc: "Enter your destination and choose between private or shared taxis.", icon: <MapPin className="w-6 h-6" /> },
            { id: "03", title: "Share Your Ride", desc: "Toggle to 'Hybrid' to split costs and meet new people.", icon: <Share2 className="w-6 h-6" /> },
            { id: "04", title: "Travel & Pay", desc: "Track your route in realtime and pay automatically via wallet.", icon: <Wallet className="w-6 h-6" /> },
          ].map((item, i) => (
            <div key={i} className="group p-10 rounded-3xl bg-white border border-slate-100 hover:border-[#FFD700]/30 hover:shadow-2xl hover:shadow-[#FFD700]/5 transition-all duration-500">
              <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center mb-10 text-[#B8860B] group-hover:scale-110 group-hover:bg-[#FFD700] group-hover:text-[#0A192F] transition-all">
                {item.icon}
              </div>
              <span className="text-[#FFD700]/40 font-black text-2xl mb-4 block">{item.id}.</span>
              <h3 className="text-xl font-extrabold text-[#0A192F] mb-4">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Unique Feature Section --- */}
      <section id="services" className="px-6 md:px-24 mb-32 scroll-mt-20">
        <div className="max-w-7xl mx-auto rounded-[48px] bg-[#0A192F] overflow-hidden flex flex-col lg:flex-row border border-white/5">
          <div className="flex-1 p-12 md:p-20 flex flex-col justify-center relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/5 blur-[100px] -z-0"></div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-[#FFD700]/20 mb-8 self-start">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFD700]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFD700]">Unique Feature</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1]">
              Share Your Ride, <br />
              <span className="text-[#FFD700]">Save the Planet.</span>
            </h2>

            <p className="text-slate-400 text-lg mb-12 leading-relaxed max-w-xl">
              Why travel alone? Our hybrid model allows passengers to become hosts. Reduce traffic congestion and earn credits while commuting your usual route.
            </p>

            <button className="px-10 py-5 bg-[#FFD700] text-[#0A192F] rounded-2xl font-bold self-start shadow-xl shadow-[#FFD700]/10 hover:bg-[#E6C200] hover:-translate-y-1 transition-all active:scale-95">
              Try Ride Sharing Today
            </button>
          </div>

          <div className="flex-1 h-[400px] lg:h-auto relative">
            <Image
              src="/assets/passenger_service.png"
              alt="Passenger enjoying a ride"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0A192F] via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      {/* --- For Professional Drivers Section --- */}
      <section className="py-24 px-6 md:px-24 bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,215,0,0.05)_0%,_transparent_50%)]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 w-full order-2 lg:order-1">
            <div className="relative inline-block w-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#FFD700]/5 blur-[80px] -z-10"></div>
              <Image
                src="/assets/professional_driver.png"
                alt="Professional Taxi Driver"
                width={720}
                height={800}
                className="w-full h-auto rounded-[3rem] shadow-2xl border-4 border-white"
              />
              <div className="absolute bottom-10 left-10 p-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 animate-bounce">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0A192F] rounded-2xl flex items-center justify-center text-[#FFD700]">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Dashboard</p>
                    <p className="font-bold text-slate-900">Verified Professional Network</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 order-1 lg:order-2">
            <h2 className="text-4xl md:text-5xl font-black text-[#0A192F] mb-8 leading-[1.2]">
              For Professional <br /> <span className="text-[#B8860B]">Taxi Drivers</span>
            </h2>
            <p className="text-slate-500 mb-12 text-lg">Maximize your earnings with our professional taxi fleet module. Accept rides whenever it fits your schedule.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {[
                { title: "Professional Registration", desc: "Submit your license and vehicle documents for verification.", icon: <ShieldCheck className="w-6 h-6" /> },
                { title: "Go Online", desc: "Toggle your status to online whenever you're ready to start receiving calls.", icon: <Globe className="w-6 h-6" /> },
                { title: "Accept Requests", desc: "View trip details and estimated earnings before accepting any request.", icon: <CheckCircle className="w-6 h-6" /> },
                { title: "Complete & Earn", desc: "Navigate with ease, complete the trip, and get paid instantly to your wallet.", icon: <Wallet className="w-6 h-6" /> },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-[#FFD700]/20 text-[#B8860B] flex items-center justify-center font-black text-xs">0{i + 1}</span>
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed pl-12">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="px-6 md:px-24 mb-24 mt-32">
        <div className="max-w-7xl mx-auto rounded-[40px] bg-[#0A192F] overflow-hidden relative group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,215,0,0.15)_0%,_transparent_60%)] group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 py-24 px-6 text-center">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">
              Ready to <span className="text-[#FFD700] italic">move freely?</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-14 text-lg">
              Join thousands of users and drivers today. <br /> The smarter way to commute is just one tap away.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={() => router.push('/register')}
                className="w-full sm:w-auto px-12 py-5 bg-[#FFD700] text-[#0A192F] rounded-2xl font-bold hover:bg-[#E6C200] transition-all shadow-2xl shadow-[#FFD700]/10 active:scale-95"
              >
                Get Started
              </button>
              <button
                onClick={() => router.push('/register')}
                className="w-full sm:w-auto px-12 py-5 bg-white/10 text-white border border-white/20 backdrop-blur-md rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer id="about" className="pt-32 pb-16 px-6 md:px-24 bg-black text-white transition-colors duration-500 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 mb-24">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#0A192F] fill-current">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                  </svg>
                </div>
                <span className="font-black text-xl tracking-tight text-white uppercase italic">GO<span className="text-[#FFD700]">RIDE</span></span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed mb-8">
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
                <h4 className="font-bold text-[#FFD700] mb-8 uppercase tracking-[0.15em] text-[10px]">{col.title}</h4>
                <ul className="space-y-4">
                  {col.links.map((link, j) => (
                    <li key={j}><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-500 text-xs">
              © 2026 GoRide Technologies Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Designed with passion </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]"></div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFD700]">By Rashad</span>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
