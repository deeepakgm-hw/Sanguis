"use client";

import React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { TopBar } from "@/components/ui/top-bar";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-zinc-950 font-mono text-slate-900 dark:text-zinc-100">
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar />

      {/* Main App Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Persistent Top Header Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
