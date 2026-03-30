import { sampleDispatches } from "@/data/sampleData";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";

export default function LogisticsCompleted() {
  const completed = sampleDispatches.filter((d) => ["Delivered", "Failed"].includes(d.status));

  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-heading font-bold text-xl">Completed Dispatches</h2>
      {completed.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-sm">No completed dispatches yet</p>
        </div>
      )}
      {completed.map((d) => (
        <Card key={d.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Dispatch #{d.id}</p>
              <p className="text-xs text-muted-foreground">{d.pickupAddress} → {d.dropoffAddress}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(d.createdAt).toLocaleDateString("en-KE")}</p>
            </div>
            <StatusBadge status={d.status} />
          </div>
          {d.proofPhoto && <p className="text-xs text-success mt-2">📸 Proof uploaded</p>}
        </Card>
      ))}
    </div>
  );
}
