"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface SocialAuthProps {
    role?: "USER" | "DRIVER";
    mode: "login" | "register";
}

export default function SocialAuth({ role, mode }: SocialAuthProps) {
    const router = useRouter();

    const handleGoogleAuth = () => {
        const backendUrl = 'http://localhost:5000/api';
        const roleParam = role ? `?role=${role}` : '';
        window.location.href = `${backendUrl}/auth/google${roleParam}`;
    };

    return (
        <div className="w-full">
            <div className="my-8 flex items-center gap-4 text-slate-400">
                <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Or continue with</span>
                <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
            </div>

            <button
                onClick={handleGoogleAuth}
                className="w-full py-4 bg-white dark:bg-white/5 text-[#0B1215] dark:text-white font-bold rounded-2xl flex items-center justify-center gap-3 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.98] transition-all shadow-sm"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google Account</span>
            </button>
        </div>
    );
}
