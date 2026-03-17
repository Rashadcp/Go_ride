import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg" | "xl";
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", size = "md", loading, leftIcon, rightIcon, fullWidth, children, ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl";

        const variants = {
            primary: "bg-[#FFD700] text-[#0A192F] shadow-lg shadow-[#FFD700]/10 hover:bg-[#E6C200]",
            secondary: "bg-[#0A192F] text-white hover:bg-[#001F3F] shadow-xl",
            danger: "bg-red-500 text-white hover:bg-red-600",
            ghost: "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
            outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
        };

        const sizes = {
            sm: "px-4 py-2 text-xs",
            md: "px-6 py-3 text-sm",
            lg: "px-8 py-4 text-base",
            xl: "px-10 py-5 text-lg"
        };

        const widthClass = fullWidth ? "w-full" : "";

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
                disabled={loading || props.disabled}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = "Button";
