import { MapPin } from "lucide-react";

export default function LogisticsMap() {
  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-heading font-bold text-xl">Route Map</h2>
      <div className="h-[60vh] rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
        <MapPin className="w-12 h-12 mb-3 text-primary/40" />
        <p className="font-medium">Route Map View</p>
        <p className="text-sm">Interactive pickup/dropoff routes coming soon</p>
      </div>
    </div>
  );
}
