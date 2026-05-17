import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, Smartphone, Loader2, History, ArrowDownLeft,
  Truck, TrendingUp, BadgePercent, Clock, CheckCircle2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

interface EarningSummary {
  totalDeliveries: number;
  totalGross: number;
  totalNet: number;
  totalPlatformFee: number;
  pendingEarnings: number;
  activeDeliveries: number;
  walletBalance: number;
}

interface DeliveryRecord {
  id: string;
  listing: string;
  category: string;
  recipient: string;
  gross: number;
  net: number;
  platformFee: number;
  deliveredAt: string;
  settled: boolean;
}

export default function WalletPage() {
  const { user, updateAuthUser } = useAuth();
  const { updateUserWallet } = useData();
  const [topUpAmount, setTopUpAmount]   = useState("");
  const [phoneNumber, setPhoneNumber]   = useState(user?.phone || "");
  const [isLoading, setIsLoading]       = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Rider earnings state
  const isRider = user?.capabilities?.canDeliver;
  const [earnSummary, setEarnSummary]   = useState<EarningSummary | null>(null);
  const [earnHistory, setEarnHistory]   = useState<DeliveryRecord[]>([]);
  const [earnLoading, setEarnLoading]   = useState(false);

  const walletBalance = user?.walletBalance || 0;

  const loadEarnings = async () => {
    if (!isRider) return;
    setEarnLoading(true);
    try {
      const data: any = await apiClient.get("/transactions/rider/earnings");
      if (data.success) {
        setEarnSummary(data.summary);
        setEarnHistory(data.history ?? []);
        // Sync wallet balance from server — delivery earnings are auto-deposited on completion
        if (typeof data.summary?.walletBalance === "number") {
          updateAuthUser({ walletBalance: data.summary.walletBalance });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load earnings");
    } finally {
      setEarnLoading(false);
    }
  };

  useEffect(() => { if (isRider) loadEarnings(); }, [isRider]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) { toast.error("Please enter a valid amount."); return; }
    if (!phoneNumber) { toast.error("Please enter your M-Pesa phone number."); return; }
    setIsLoading(true);
    try {
      const res: any = await apiClient.post("/users/wallet/topup", { amount, phoneNumber });
      if (!res.success) throw new Error(res.message || "Top-up initiation failed");

      const checkoutRequestId: string = res.checkoutRequestId;
      toast.info("STK Push sent — check your phone and enter your M-Pesa PIN.");

      // Poll for status every 4s for up to 60s
      let attempts = 0;
      const maxAttempts = 15;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes: any = await apiClient.get(
            `/users/wallet/topup/status/${checkoutRequestId}`
          );
          if (statusRes.status === "completed") {
            clearInterval(poll);
            setIsLoading(false);
            setIsDialogOpen(false);
            setTopUpAmount("");
            const newBalance = statusRes.walletBalance ?? walletBalance + amount;
            updateAuthUser({ walletBalance: newBalance });
            if (user?.id) updateUserWallet(user.id, newBalance);
            toast.success(`KES ${amount.toLocaleString()} added to your wallet!`);
          } else if (statusRes.status === "cancelled") {
            clearInterval(poll);
            setIsLoading(false);
            toast.error("Payment was cancelled. Please try again.");
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            setIsLoading(false);
            toast.warning("Payment is taking longer than expected. Check back in a moment.");
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            setIsLoading(false);
          }
        }
      }, 4000);
    } catch (err: any) {
      setIsLoading(false);
      toast.error(err.message || "Top-up failed. Please try again.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="font-heading font-bold text-2xl md:text-3xl">My Wallet</h1>

      {/* Balance + Top-up row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 md:p-8 border-2 border-primary bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3 text-primary mb-4">
            <Wallet className="w-8 h-8" />
            <h2 className="font-heading font-semibold text-lg">Available Balance</h2>
          </div>
          <p className="font-heading font-bold text-4xl md:text-5xl text-foreground">
            KES {walletBalance.toLocaleString()}
          </p>
          {isRider && earnSummary && earnSummary.pendingEarnings > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {fmt(earnSummary.pendingEarnings)} pending from active deliveries
            </p>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-6 bg-gradient-hero text-primary-foreground h-12 text-base font-semibold">
                <ArrowDownLeft className="w-5 h-5 mr-2" /> Top Up via M-Pesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Top Up Wallet</DialogTitle>
                <DialogDescription>Enter an amount to load into your wallet via M-Pesa.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTopUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input type="number" min="1" placeholder="e.g. 500" value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input type="tel" className="pl-9" placeholder="e.g. 0712345678"
                      value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                  </div>
                </div>
                {isLoading && (
                  <div className="bg-muted p-4 rounded-xl flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    Please check your phone and enter your M-Pesa PIN to confirm payment...
                  </div>
                )}
                <Button type="submit" disabled={isLoading} className="w-full h-12 font-semibold">
                  {isLoading ? "Processing..." : "Pay Now"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-lg">Recent Transactions</h2>
          </div>
          <div className="text-center text-muted-foreground py-8">
            <p>No recent transactions.</p>
          </div>
        </Card>
      </div>

      {/* ── Logistics Earnings Section (riders only) ── */}
      {isRider && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> Delivery Earnings
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                You earn 90% of each delivery fee · 10% platform commission
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadEarnings} disabled={earnLoading} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${earnLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* KPI cards */}
          {earnLoading && !earnSummary ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading earnings…
            </Card>
          ) : earnSummary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/10 shrink-0">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-green-700">{fmt(earnSummary.totalNet)}</p>
                    <p className="text-[11px] text-muted-foreground">Total earned (net)</p>
                  </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{earnSummary.totalDeliveries}</p>
                    <p className="text-[11px] text-muted-foreground">Completed deliveries</p>
                  </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-500/10 shrink-0">
                    <BadgePercent className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-red-500">{fmt(earnSummary.totalPlatformFee)}</p>
                    <p className="text-[11px] text-muted-foreground">Platform fee (10%)</p>
                  </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 shrink-0">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-amber-600">{fmt(earnSummary.pendingEarnings)}</p>
                    <p className="text-[11px] text-muted-foreground">Pending ({earnSummary.activeDeliveries} active)</p>
                  </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 shrink-0">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-indigo-600">{fmt(earnSummary.totalGross)}</p>
                    <p className="text-[11px] text-muted-foreground">Total gross billed</p>
                  </div>
                </Card>
              </div>

              {/* Earnings breakdown notice */}
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">How your earnings work</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                  When you complete a delivery, the full delivery fee is split: <strong>90% is deposited directly into your wallet</strong> and 10% is retained by the platform. Earnings are credited automatically once the recipient confirms delivery with their PIN.
                </p>
              </Card>

              {/* Delivery history table */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Delivery History</h3>
                  <Badge variant="outline" className="ml-auto text-xs">{earnHistory.length} completed</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Listing</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Recipient</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Gross</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Platform (10%)</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground">You Earned</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Date</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                            No completed deliveries yet. Accept and complete deliveries to see your earnings here.
                          </td>
                        </tr>
                      ) : earnHistory.map((d) => (
                        <tr key={d.id} className="border-t hover:bg-muted/20">
                          <td className="p-3">
                            <p className="font-medium text-sm truncate max-w-[140px]">{d.listing}</p>
                            {d.category && <p className="text-[11px] text-muted-foreground">{d.category}</p>}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{d.recipient}</td>
                          <td className="p-3 text-right text-xs font-medium">{fmt(d.gross)}</td>
                          <td className="p-3 text-right text-xs text-red-500">−{fmt(d.platformFee)}</td>
                          <td className="p-3 text-right font-bold text-sm text-green-700">{fmt(d.net)}</td>
                          <td className="p-3 text-[11px] text-muted-foreground hidden md:table-cell">
                            {new Date(d.deliveredAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="p-3">
                            {d.settled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                <Clock className="w-2.5 h-2.5" /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Could not load earnings data. <button className="text-primary underline ml-1" onClick={loadEarnings}>Try again</button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
