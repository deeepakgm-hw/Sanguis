"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, UserX, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { StatCard } from "@/components/widgets/stat-card";
import { ActivityFeed } from "@/components/widgets/activity-feed";

interface SecurityEvent {
  _id: string;
  type: string;
  email?: string;
  ip: string;
  createdAt: string;
}

const severityFor = (type: string): "info" | "warning" | "critical" => {
  if (type === "TOKEN_REUSE_DETECTED" || type === "ACCOUNT_LOCKED") return "critical";
  if (type === "LOGIN_FAILURE" || type === "ACCESS_DENIED") return "warning";
  return "info";
};

/**
 * Admin-only security dashboard. Server already enforces requireRole("admin")
 * on /audit/* — this page-level check just avoids a flash of a 403 UI.
 */
export default function SecurityDashboardPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) return router.replace("/login");
    if (user.role !== "admin") return router.replace("/dashboard");

    api
      .get("/audit/security-events", { params: { limit: 20 } })
      .then((res) => setEvents(res.data.data))
      .finally(() => setLoading(false));
  }, [isBootstrapping, user, router]);

  const failedLogins = events.filter((e) => e.type === "LOGIN_FAILURE").length;
  const lockouts = events.filter((e) => e.type === "ACCOUNT_LOCKED").length;
  const reuseDetections = events.filter((e) => e.type === "TOKEN_REUSE_DETECTED").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Security Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Events (recent)" value={events.length} icon={Activity} />
        <StatCard label="Failed Logins" value={failedLogins} icon={ShieldAlert} />
        <StatCard label="Account Lockouts" value={lockouts} icon={Lock} />
        <StatCard label="Token Reuse Alerts" value={reuseDetections} icon={UserX} />
      </div>

      {!loading && (
        <ActivityFeed
          title="Recent Security Events"
          items={events.map((e) => ({
            id: e._id,
            title: e.type.replace(/_/g, " "),
            description: `${e.email ?? "unknown"} · ${e.ip}`,
            timestamp: new Date(e.createdAt).toLocaleString(),
            severity: severityFor(e.type),
          }))}
        />
      )}
    </main>
  );
}
