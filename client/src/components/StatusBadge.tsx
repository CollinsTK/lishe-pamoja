import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Available: "bg-success/10 text-success",
  Reserved: "bg-warning/10 text-warning",
  Sold: "bg-primary/10 text-primary",
  Expired: "bg-destructive/10 text-destructive",
  Cancelled: "bg-muted text-muted-foreground",
  Pending: "bg-warning/10 text-warning",
  Confirmed: "bg-success/10 text-success",
  Completed: "bg-primary/10 text-primary",
  Assigned: "bg-secondary/10 text-secondary",
  PickedUp: "bg-warning/10 text-warning",
  InTransit: "bg-primary/10 text-primary",
  Delivered: "bg-success/10 text-success",
  Failed: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        statusColors[status] || "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}
