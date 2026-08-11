"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Shield, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";

export function TopBar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Global Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blood requests, donors, or hospitals…"
          className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        {user?.role && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <Shield className="h-3 w-3" />
            {user.role}
          </span>
        )}

        {/* Notifications Icon */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Avatar Direct Link */}
        <Link href="/profile/settings" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-rose-600/30 border border-rose-500">
            {user?.name?.charAt(0) || <User className="h-4 w-4" />}
          </div>
        </Link>
      </div>
    </header>
  );
}
