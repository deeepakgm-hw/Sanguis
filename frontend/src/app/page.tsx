"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/auth.store";
import { Shield, Zap, ShieldCheck, Cpu } from "lucide-react";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background Gradient Accents */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />
      
      {/* Subtle Dot Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(0,0,0,0))]" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-lg object-cover shadow-md" />
            <span className="text-lg font-bold tracking-tight">Sanguis</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button className="font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="font-semibold">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button className="font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative mx-auto max-w-7xl px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        {/* Glow pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border/85 bg-muted/50 px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm mb-6 glass animate-pulse">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
          Verified Donor Network · Real-Time Emergency Dispatch
        </div>

        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl leading-tight">
          Blood Donors Found in <span className="bg-gradient-to-r from-primary via-muted-foreground to-primary bg-clip-text text-transparent text-glow">Seconds</span>
        </h1>
        
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Sanguis connects verified hospitals with eligible blood donors in real time. AI urgency scoring prioritises critical requests while geo-based dispatch routes the nearest compatible donor — saving lives when every minute counts.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          {user ? (
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 font-semibold shadow-lg hover:scale-105 transition-all text-base">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 font-semibold shadow-lg hover:scale-105 transition-all text-base">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-12 px-8 font-semibold glass hover:scale-105 transition-all text-base">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Feature Grid */}
        <section className="mt-24 grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="glass-card glow-border p-8 rounded-xl text-left flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-md">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Cyber Security First</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Built-in OWASP Top 10 protection, Helmet/CORS headers, Argon2 hashing, rate limiting, and NoSQL/XSS sanitization out of the box.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card glow-border p-8 rounded-xl text-left flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-md">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">In-Memory Databases</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Run locally with zero dependencies. MongoDB Memory Server and mock Redis run dynamically within the node process.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card glow-border p-8 rounded-xl text-left flex flex-col justify-between transition-all hover:translate-y-[-4px] hover:shadow-md">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">AI & LLM Integration Ready</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Pre-wired handlers for OpenAI, Claude, and Gemini APIs. Easily implement PDF chat, OCR, and anomaly threat analysis.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-border/40 py-8 text-center text-xs text-muted-foreground glass">
        &copy; {new Date().getFullYear()} Sanguis. Every second counts.
      </footer>
    </div>
  );
}
