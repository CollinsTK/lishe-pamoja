import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Camera } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function LogisticsDispatches() {
  const { dispatches, updateDispatch } = useData();
  const [pinMode, setPinMode] = useState<{ id: string; type: "pickup" | "delivery" } | null>(null);
  const [pinInput, setPinInput] = useState("");

  const activeDispatches = dispatches.filter((d) => !["Delivered", "Failed"].includes(d.status));
  const completedDispatches = dispatches.filter((d) => ["Delivered", "Failed"].includes(d.status));

  const handleVerifyPin = (d: any) => {
    if (!pinMode) return;
    
    if (pinMode.type === "pickup") {
      if (pinInput === d.pickupPin) {
        updateDispatch(d.id, { status: "PickedUp" });
        toast.success("Pickup verified successfully!");
        setPinMode(null);
        setPinInput("");
      } else {
        toast.error("Invalid Pickup PIN");
      }
    } else {
      if (pinInput === d.deliveryPin) {
        updateDispatch(d.id, { status: "Delivered" });
        toast.success("Delivery verified successfully!");
        setPinMode(null);
        setPinInput("");
      } else {
        toast.error("Invalid Delivery PIN");
      }
    }
  };

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

          <div className="flex flex-col gap-2">
            {d.status === "Assigned" && pinMode?.id !== d.id && (
              <Button size="sm" onClick={() => setPinMode({ id: d.id, type: "pickup" })} className="bg-gradient-hero text-primary-foreground">
                Enter Vendor PIN to Confirm Pickup
              </Button>
            )}
            {d.status === "PickedUp" && (
              <Button size="sm" onClick={() => updateDispatch(d.id, { status: "InTransit" })} className="bg-gradient-accent text-accent-foreground">
                Start Transit
              </Button>
            )}
            {d.status === "InTransit" && pinMode?.id !== d.id && (
              <Button size="sm" onClick={() => setPinMode({ id: d.id, type: "delivery" })} className="bg-gradient-hero text-primary-foreground">
                <Camera className="w-4 h-4 mr-1" /> Enter Recipient PIN to Deliver
              </Button>
            )}

            {pinMode?.id === d.id && (
              <div className="flex gap-2 items-center bg-muted p-2 rounded-lg mt-2">
                <Input
                  type="text"
                  placeholder={pinMode.type === "pickup" ? "Vendor 4-digit PIN" : "Recipient 4-digit PIN"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  maxLength={4}
                  className="bg-background"
                />
                <Button size="sm" onClick={() => handleVerifyPin(d)} className="bg-primary text-primary-foreground">
                  Verify
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setPinMode(null); setPinInput(""); }}>
                  Cancel
                </Button>
              </div>
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
