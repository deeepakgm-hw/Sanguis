"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route Error caught by Next.js boundary:", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />
      
      <div className="glass-card glow-border max-w-md p-8 rounded-2xl flex flex-col items-center shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-4 animate-pulse">
          <ShieldAlert className="h-8 w-8" />
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Application Error</h1>
        <h2 className="text-base font-medium text-muted-foreground mb-4">
          An unexpected error occurred in the component tree.
        </h2>

        {error.message && (
          <div className="w-full text-left bg-muted/60 p-3 rounded-lg border border-border text-xs font-mono text-muted-foreground overflow-auto max-h-32 mb-6">
            <span className="font-bold text-foreground">Message:</span> {error.message}
          </div>
        )}

        <div className="flex w-full gap-3">
          <Button 
            type="button"
            className="flex-1"
            onClick={() => reset()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full glass">
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
