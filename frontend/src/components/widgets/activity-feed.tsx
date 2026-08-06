import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  severity?: "info" | "warning" | "critical";
}

const severityDot: Record<NonNullable<ActivityItem["severity"]>, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  critical: "bg-destructive",
};

/** Generic timeline/activity feed — reused for audit logs, security events, notifications. */
export function ActivityFeed({ title, items }: { title: string; items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing to show yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severityDot[item.severity ?? "info"])} />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{item.timestamp}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
