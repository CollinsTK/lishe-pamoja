import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Listing statuses (backend exact)
  available: "bg-success/10 text-success",
  partially_claimed: "bg-warning/10 text-warning",
  fully_claimed: "bg-primary/10 text-primary",
  expired: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  // Transaction statuses (backend exact)
  CLAIMED: "bg-warning/10 text-warning",
  LOGISTICS_ASSIGNED: "bg-secondary/10 text-secondary",
  IN_TRANSIT: "bg-primary/10 text-primary",
  DELIVERED: "bg-success/10 text-success",
  COMPLETED: "bg-primary/10 text-primary",
  CANCELLED: "bg-muted text-muted-foreground",
  // Dispatch statuses
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

