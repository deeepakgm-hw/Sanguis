import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
}

/** Generic KPI widget — reused across admin/security/analytics dashboards. */
export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {trend && (
          <p className={cn("mt-1 text-xs font-medium", trend.direction === "up" ? "text-emerald-600" : "text-destructive")}>
            {trend.direction === "up" ? "▲" : "▼"} {trend.value}
          </p>
        )}
      </div>
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}
