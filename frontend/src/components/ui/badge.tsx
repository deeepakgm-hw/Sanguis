import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "critical" | "high" | "medium" | "low" | "completed" | "pending" | "cancelled" | "blood" | "outline" | "default";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseStyle = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors border";
  
  const variants = {
    critical: "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 animate-pulse",
    high: "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    medium: "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
    low: "bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
    pending: "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    cancelled: "bg-slate-500/10 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800 line-through",
    blood: "bg-rose-600 text-white border-rose-700 font-extrabold shadow-sm",
    outline: "border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300",
    default: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700",
  };

  return <div className={`${baseStyle} ${variants[variant] || variants.default} ${className}`} {...props} />;
}
