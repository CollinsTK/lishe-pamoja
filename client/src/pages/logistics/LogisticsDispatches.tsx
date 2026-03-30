import { sampleDispatches } from "@/data/sampleData";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Camera } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LogisticsDispatches() {
  const [dispatches, setDispatches] = useState(sampleDispatches);

  const updateStatus = (id: string, newStatus: string) => {
    setDispatches((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus as any } : d))
    );
    toast.success(`Dispatch ${id} updated to ${newStatus}`);
  };

  const activeDispatches = dispatches.filter((d) => !["Delivered", "Failed"].includes(d.status));
  const completedDispatches = dispatches.filter((d) => ["Delivered", "Failed"].includes(d.status));

  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-heading font-bold text-xl">Active Dispatches</h2>
      {activeDispatches.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-sm">No active dispatches</p>
        </div>
      )}
      {activeDispatches.map((d) => (
        <Card key={d.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-heading font-semibold text-sm">Dispatch #{d.id}</p>
              <p className="text-xs text-muted-foreground">Order #{d.orderId}</p>
            </div>
            <StatusBadge status={d.status} />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="truncate">{d.pickupAddress}</span>
            <ArrowRight className="w-3 h-3" />
            <MapPin className="w-3 h-3 text-destructive" />
            <span className="truncate">{d.dropoffAddress}</span>
          </div>

          <div className="flex gap-2">
            {d.status === "Assigned" && (
              <Button size="sm" onClick={() => updateStatus(d.id, "PickedUp")} className="bg-gradient-hero text-primary-foreground flex-1">
                Confirm Pickup
              </Button>
            )}
            {d.status === "PickedUp" && (
              <Button size="sm" onClick={() => updateStatus(d.id, "InTransit")} className="bg-gradient-accent text-accent-foreground flex-1">
                Start Transit
              </Button>
            )}
            {d.status === "InTransit" && (
              <Button size="sm" onClick={() => updateStatus(d.id, "Delivered")} className="bg-gradient-hero text-primary-foreground flex-1">
                <Camera className="w-4 h-4 mr-1" /> Complete Delivery
              </Button>
            )}
          </div>
        </Card>
      ))}

      {completedDispatches.length > 0 && (
        <>
          <h3 className="font-heading font-semibold text-lg mt-6">Completed</h3>
          {completedDispatches.map((d) => (
            <Card key={d.id} className="p-4 opacity-70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Dispatch #{d.id}</p>
                  <p className="text-xs text-muted-foreground">{d.pickupAddress} → {d.dropoffAddress}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
