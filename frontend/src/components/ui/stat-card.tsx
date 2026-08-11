import React from "react";
import { Card } from "./card";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trend?: string;
  className?: string;
}

export function StatCard({ title, value, subtext, icon, badge, className = "" }: StatCardProps) {
  return (
    <Card className={`p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-50">{value}</span>
            {badge && <div>{badge}</div>}
          </div>
          {subtext && <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">{subtext}</p>}
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
