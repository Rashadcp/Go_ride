import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, leftIcon, rightIcon, containerClassName = "", className = "", ...props }, ref) => {

        const baseInputStyles = "w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-[20px] text-sm font-bold text-[#0A192F] placeholder:text-slate-300 outline-none focus:bg-white focus:border-[#FFD700]/40 transition-all shadow-sm";
        const errorStyles = error ? "border-red-500 focus:border-red-500" : "";

        return (
            <div className={`space-y-1.5 ${containerClassName}`}>
                {label && (
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`${baseInputStyles} ${errorStyles} ${leftIcon ? "pl-12" : ""} ${rightIcon ? "pr-12" : ""} ${className}`}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && <p className="text-xs text-red-500 ml-1 mt-1 font-bold">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";
