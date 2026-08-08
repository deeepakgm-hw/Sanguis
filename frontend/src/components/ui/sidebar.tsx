"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  PlusCircle,
  Bell,
  User,
  History,
  Grid2X2,
  HelpCircle,
  BookOpen,
  Settings,
  Heart,
  LogOut,
  Droplet,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export function Sidebar() {
  const pathname = usePathname();
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  const navItems: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: <Home className="h-4.5 w-4.5" /> },
    { label: "Donation", href: "/donation", icon: <Droplet className="h-4.5 w-4.5 text-[#E5384D]" />, badge: "CAMPAIGNS" },
    { label: "Search", href: "/search", icon: <Search className="h-4.5 w-4.5" /> },
    { label: "Create Request", href: "/requests/new", icon: <PlusCircle className="h-4.5 w-4.5" /> },
    { label: "Notifications", href: "/notifications", icon: <Bell className="h-4.5 w-4.5" /> },
    { label: "My Profile", href: "/profile", icon: <User className="h-4.5 w-4.5" /> },
    { label: "Donation History", href: "/profile/history", icon: <History className="h-4.5 w-4.5" /> },
    { label: "Compatibility Chart", href: "/profile/compatibility", icon: <Grid2X2 className="h-4.5 w-4.5" /> },
    { label: "FAQ", href: "/profile/faq", icon: <HelpCircle className="h-4.5 w-4.5" /> },
    { label: "Blog", href: "/profile/blog", icon: <BookOpen className="h-4.5 w-4.5" /> },
    { label: "Settings", href: "/profile/settings", icon: <Settings className="h-4.5 w-4.5" /> },
    { label: "Donate to Sanguis", href: "/donate", icon: <Heart className="h-4.5 w-4.5 text-[#E5384D]" /> },
  ];

  return (
    <aside className="w-64 h-screen border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between p-4 sticky top-0 shrink-0 font-mono">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-1">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md border border-slate-200 dark:border-zinc-800" />
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-zinc-100 uppercase">Sanguis</h1>
            <p className="text-[10px] font-bold text-[#E5384D] tracking-wider uppercase">Blood Network</p>
          </div>
        </Link>

        {/* Persistent 11-Item Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href !== "/profile" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs transition-all duration-200 ${
                  isActive
                    ? "bg-[#E5384D] text-white shadow-md shadow-rose-600/20"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                      isActive ? "bg-white text-[#E5384D]" : "bg-rose-100 text-[#E5384D] dark:bg-rose-950/60 dark:text-rose-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-[#E5384D] uppercase border border-slate-300 dark:border-zinc-700">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={clear}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-[#E5384D] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
