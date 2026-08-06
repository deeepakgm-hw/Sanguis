"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DashboardPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  async function handleLogout() {
    await api.post("/auth/logout");
    clear();
    router.push("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-8 w-8 rounded-lg object-cover shadow-sm" />
          <h1 className="text-2xl font-bold tracking-tight">Sanguis Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Role: {user.role} · Email: {user.email}
        </CardContent>
      </Card>
    </main>
  );
}
