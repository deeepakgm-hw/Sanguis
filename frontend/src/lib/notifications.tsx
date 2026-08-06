import React from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Info, ShieldAlert, XCircle } from "lucide-react";

export const notify = {
  success: (title: string, message?: string) => {
    toast.custom(() => (
      <div className="flex w-[350px] gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-md shadow-md glow-border">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    ));
  },
  
  error: (title: string, message?: string) => {
    toast.custom(() => (
      <div className="flex w-[350px] gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 backdrop-blur-md shadow-md glow-border">
        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    ));
  },

  info: (title: string, message?: string) => {
    toast.custom(() => (
      <div className="flex w-[350px] gap-3 rounded-lg border border-primary/10 bg-muted/40 p-4 backdrop-blur-md shadow-md glow-border">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    ));
  },

  security: (title: string, message?: string, eventCode?: string) => {
    toast.custom(() => (
      <div className="flex w-[350px] gap-3 rounded-lg border border-red-500/40 bg-red-950/20 p-4 backdrop-blur-md shadow-lg shadow-red-950/10 ring-1 ring-red-500/20">
        <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-red-500">Security Alert</p>
            {eventCode && (
              <span className="rounded bg-red-500/10 px-1 py-0.5 text-[9px] font-mono font-semibold text-red-400 border border-red-500/25">
                {eventCode}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    ), {
      duration: 6000,
    });
  },

  warn: (title: string, message?: string) => {
    toast.custom(() => (
      <div className="flex w-[350px] gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-md shadow-md glow-border">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>
    ));
  }
};
