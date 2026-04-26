import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useData } from "@/contexts/DataContext";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function AdminReports() {
  const { listings, orders, dispatches, users } = useData();

  // Calculate real metrics from data
  const completedOrders = orders.filter(o => o.status === "Completed" || o.status === "Confirmed").length;
  const totalQuantity = listings.reduce((sum, l) => sum + l.quantity, 0);
  const freeListings = listings.filter(l => l.isFree).length;
  const deliveryOrders = orders.filter(o => o.fulfillmentMode === "Delivery").length;
  const completedDeliveries = dispatches.filter(d => d.status === "Delivered").length;

  // Simulated impact metrics based on real data
  const mealsSaved = completedOrders * 2; // Estimate 2 meals per order
  const familiesServed = users.filter(u => u.role === "recipient").length + completedOrders;
  const foodWastePrevented = totalQuantity; // kg estimate
  const co2Reduced = Math.round(foodWastePrevented * 0.28); // 0.28kg CO2 per kg food saved

  const impactData = [
    { metric: "Meals Saved", value: mealsSaved },
    { metric: "CO₂ Reduced (kg)", value: co2Reduced },
    { metric: "Families Served", value: familiesServed },
    { metric: "Food Waste Prevented (kg)", value: foodWastePrevented },
  ];

  // Monthly impact (simulated from real data)
  const monthlyImpact = [
    { month: "Oct", saved: Math.max(1, Math.round(completedOrders * 0.15)), wasted: Math.round(foodWastePrevented * 0.05) },
    { month: "Nov", saved: Math.max(1, Math.round(completedOrders * 0.18)), wasted: Math.round(foodWastePrevented * 0.04) },
    { month: "Dec", saved: Math.max(1, Math.round(completedOrders * 0.2)), wasted: Math.round(foodWastePrevented * 0.06) },
    { month: "Jan", saved: Math.max(1, Math.round(completedOrders * 0.22)), wasted: Math.round(foodWastePrevented * 0.03) },
    { month: "Feb", saved: Math.max(1, Math.round(completedOrders * 0.25)), wasted: Math.round(foodWastePrevented * 0.02) },
  ];

  const downloadReport = () => {
    // Generate an overall platform report
    const reportData = [
      { Metric: "Total Users", Value: users.length },
      { Metric: "Total Orders", Value: orders.length },
      { Metric: "Completed Orders", Value: completedOrders },
      { Metric: "Meals Saved", Value: mealsSaved },
      { Metric: "CO2 Reduced (kg)", Value: co2Reduced },
      { Metric: "Food Waste Prevented (kg)", Value: foodWastePrevented },
    ];
    
    // Convert to CSV
    const csv = Papa.unparse(reportData);
    
    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `admin_platform_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadUsersReport = () => {
    const usersData = users.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Status: u.status || "Active",
      Joined: u.createdAt || new Date().toISOString().split('T')[0]
    }));

    const csv = Papa.unparse(usersData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `platform_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-heading font-bold text-2xl">Impact Reports</h1>
        <div className="flex gap-2">
          <Button onClick={downloadUsersReport} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Users CSV
          </Button>
          <Button onClick={downloadReport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Platform CSV
          </Button>
        </div>
      </div>

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

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-heading font-semibold mb-3">Listing Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Listings</span>
              <span className="font-medium">{listings.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free Listings</span>
              <span className="font-medium">{freeListings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Listings</span>
              <span className="font-medium">{listings.length - freeListings}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold mb-3">Delivery Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Orders</span>
              <span className="font-medium">{deliveryOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed Deliveries</span>
              <span className="font-medium text-success">{completedDeliveries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-medium text-warning">{deliveryOrders - completedDeliveries}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
