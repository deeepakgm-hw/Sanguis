"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center overflow-hidden">
      {/* Glow circles */}
      <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="glass-card glow-border max-w-md p-8 rounded-2xl flex flex-col items-center shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 animate-bounce">
          <AlertCircle className="h-8 w-8" />
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">404</h1>
        <h2 className="text-xl font-bold mb-3">Resource Not Found</h2>
        
        <p className="text-sm text-muted-foreground mb-8">
          The requested page or resource does not exist, or you do not have sufficient permissions to view it.
        </p>

        <div className="flex w-full gap-3">
          <Button 
            type="button"
            variant="outline" 
            className="flex-1 glass"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Link href="/" className="flex-1">
            <Button className="w-full">
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
