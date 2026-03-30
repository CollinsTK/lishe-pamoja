import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const impactData = [
  { metric: "Meals Saved", value: 4520 },
  { metric: "CO₂ Reduced (kg)", value: 890 },
  { metric: "Families Served", value: 1230 },
  { metric: "Food Waste (kg)", value: 3200 },
];

const monthlyImpact = [
  { month: "Oct", saved: 320, wasted: 45 },
  { month: "Nov", saved: 410, wasted: 38 },
  { month: "Dec", saved: 380, wasted: 52 },
  { month: "Jan", saved: 520, wasted: 30 },
  { month: "Feb", saved: 480, wasted: 28 },
];

export default function AdminReports() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">Impact Reports</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {impactData.map((d) => (
          <Card key={d.metric} className="p-4 text-center">
            <p className="font-heading font-bold text-2xl text-primary">{d.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{d.metric}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">Monthly Impact: Saved vs Wasted (meals)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyImpact}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 88%)" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="saved" fill="hsl(145, 55%, 32%)" radius={[4, 4, 0, 0]} name="Meals Saved" />
            <Bar dataKey="wasted" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Meals Wasted" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
