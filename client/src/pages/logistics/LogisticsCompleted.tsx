import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function LogisticsCompleted() {
  const { dispatches, orders, users } = useData();
  const completed = dispatches.filter((d) => ["Delivered", "Failed"].includes(d.status));

  const downloadReport = () => {
    const reportData = completed.map(d => {
      const order = orders.find(o => o.id === d.orderId);
      const buyerName = order?.recipientId ? users.find(u => u.id === order.recipientId)?.name || "Unknown Buyer" : "N/A";
      const vendorName = order?.vendorId ? users.find(u => u.id === order.vendorId)?.name || "Unknown Vendor" : "N/A";

      return {
        DispatchID: d.id,
        Date: new Date(d.createdAt).toLocaleDateString("en-KE"),
        Pickup: d.pickupAddress,
        Dropoff: d.dropoffAddress,
        Vendor: vendorName,
        Buyer: buyerName,
        Status: d.status,
        Distance: "Estimated from map",
        Earnings: "KES 150", // Simulated static earnings for mock data
      };
    });
    
    const csv = Papa.unparse(reportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dispatch_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-bold text-xl">Completed Dispatches</h2>
        {completed.length > 0 && (
          <Button onClick={downloadReport} size="sm" variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </div>

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
