"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { 
  Command, 
  Search, 
  Sparkles, 
  Layout, 
  Heart, 
  Activity, 
  Sun, 
  Moon, 
  LogOut, 
  Home, 
  Keyboard,
  Building
} from "lucide-react";

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // List of all navigation commands
  const commands = [
    { name: "Go to Tactical Command Center", description: "Admin: Unified view of blood banks & donors", action: () => router.push("/command-center"), icon: Building, category: "Navigation", shortcut: "g c" },
    { name: "Go to Portal Gateway", description: "Switch routes to Sanguis selector hub", action: () => router.push("/dashboard"), icon: Layout, category: "Navigation", shortcut: "g p" },
    { name: "Go to Donor Dashboard", description: "Volunteers: Trace milestones & dispatches", action: () => router.push("/donor/dashboard"), icon: Heart, category: "Navigation", shortcut: "g d" },
    { name: "Go to Emergency Request Form", description: "Hospitals: Dispatch matching engine", action: () => router.push("/requests/new"), icon: Activity, category: "Navigation", shortcut: "g h" },
    { name: "Go to Home / Landing Page", description: "Back to marketing landing grids", action: () => router.push("/"), icon: Home, category: "Navigation", shortcut: "g o" },
    { name: "Toggle Theme: Dark Mode", description: "Switch UI layout to dark mode styling", action: () => setTheme("dark"), icon: Moon, category: "Preferences", shortcut: "t d" },
    { name: "Toggle Theme: Light Mode", description: "Switch UI layout to light mode styling", action: () => setTheme("light"), icon: Sun, category: "Preferences", shortcut: "t l" },
  ];

  // Filter commands by search query
  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Close on escape
      if (e.key === "Escape") {
        setIsOpen(false);
      }

      // Single-character/combination keyboard shortcuts (if modal is closed and no input is focused)
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (!isOpen && !isInputFocused) {
        // Toggle theme shortcut: 't'
        if (e.key === "t") {
          e.preventDefault();
          const nextTheme = theme === "dark" ? "light" : "dark";
          setTheme(nextTheme);
          toast.success(`Theme toggled to ${nextTheme} mode`);
        }

        // Direct navigation shortcut sequences: 'g' then 'd', 'h', 'p', 'o'
        if (e.key === "d") {
          e.preventDefault();
          router.push("/donor/dashboard");
        }
        if (e.key === "h") {
          e.preventDefault();
          router.push("/requests/new");
        }
        if (e.key === "p") {
          e.preventDefault();
          router.push("/dashboard");
        }
        if (e.key === "c") {
          e.preventDefault();
          router.push("/command-center");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, theme, setTheme, router]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      /* Floating micro shortcut trigger at bottom-right corner */
      <div 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full border border-border/50 bg-background/90 px-4 py-2 text-[10px] font-bold text-muted-foreground shadow-xl glass cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 opacity-60 hover:opacity-100"
      >
        <Keyboard className="h-3.5 w-3.5" /> Press <kbd className="font-sans font-bold border border-border/40 px-1 rounded bg-muted/80">⌘K</kbd> to search
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      {/* Backdrop overlay listener */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

      {/* Command Palette Card */}
      <Card className="w-full max-w-lg glass-card border border-border/40 relative z-10 shadow-2xl overflow-hidden bg-card/65 animate-[scaleIn_0.15s_ease-out]">
        
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or jump to page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-0 text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/65 px-1.5 py-0.5 rounded border border-border/30 shrink-0">ESC</span>
        </div>

        {/* Command list content */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4">
          
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No matching commands found.</div>
          ) : (
            <div>
              {/* Group headings */}
              <div className="px-3 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quick Shortcuts
              </div>

              <div className="space-y-0.5 mt-1">
                {filtered.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <div
                      key={cmd.name}
                      onClick={() => {
                        cmd.action();
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/40 cursor-pointer transition-all duration-150 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-muted p-1.5 text-muted-foreground group-hover:bg-background group-hover:text-destructive transition-all">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{cmd.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cmd.description}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">
                        {cmd.shortcut}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        
        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-muted/30 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>Press <kbd className="font-mono border border-border/30 px-1 rounded bg-muted">↑↓</kbd> to select</span>
            <span>·</span>
            <span><kbd className="font-mono border border-border/30 px-1 rounded bg-muted">Enter</kbd> to execute</span>
          </span>
          <span className="font-semibold text-destructive flex items-center gap-0.5">
            Sanguis Assist v1.1
          </span>
        </div>

      </Card>
    </div>
  );
}
