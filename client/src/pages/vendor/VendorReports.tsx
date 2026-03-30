import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const monthlyData = [
  { month: "Jan", listed: 12, sold: 8, expired: 2 },
  { month: "Feb", listed: 18, sold: 14, expired: 3 },
  { month: "Mar", listed: 15, sold: 11, expired: 1 },
];

const categoryData = [
  { name: "Vegetables", value: 35 },
  { name: "Bakery", value: 25 },
  { name: "Fruits", value: 20 },
  { name: "Dairy", value: 12 },
  { name: "Other", value: 8 },
];

const COLORS = ["hsl(145, 55%, 32%)", "hsl(32, 90%, 55%)", "hsl(38, 92%, 50%)", "hsl(200, 60%, 50%)", "hsl(160, 10%, 45%)"];

export default function VendorReports() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">Reports</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Fulfillment Rate</p>
          <p className="font-heading font-bold text-2xl text-success">85%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Expiry Rate</p>
          <p className="font-heading font-bold text-2xl text-warning">13%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Avg. Claims/Day</p>
          <p className="font-heading font-bold text-2xl text-primary">4.2</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Peak Hour</p>
          <p className="font-heading font-bold text-2xl">12 PM</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">Monthly Performance</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 88%)" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="listed" fill="hsl(145, 55%, 32%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sold" fill="hsl(32, 90%, 55%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expired" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">Popular Categories</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
