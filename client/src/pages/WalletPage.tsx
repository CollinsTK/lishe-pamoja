import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Smartphone, Loader2, History, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function WalletPage() {
  const { user, updateAuthUser } = useAuth();
  const { updateUserWallet } = useData();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const walletBalance = user?.walletBalance || 0;

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topUpAmount);

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!phoneNumber) {
      toast.error("Please enter your M-Pesa phone number.");
      return;
    }

    setIsLoading(true);

    // Mock STK Push delay
    setTimeout(() => {
      setIsLoading(false);
      setIsDialogOpen(false);
      
      // Update local wallet in Auth Context and Data Context
      const newBalance = walletBalance + amount;
      updateAuthUser({ walletBalance: newBalance });
      if (user?.id) {
        updateUserWallet(user.id, amount);
      }

      toast.success(`KES ${amount.toLocaleString()} successfully added to your wallet!`);
      setTopUpAmount("");
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="font-heading font-bold text-2xl md:text-3xl">My Wallet</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 md:p-8 border-2 border-primary bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3 text-primary mb-4">
            <Wallet className="w-8 h-8" />
            <h2 className="font-heading font-semibold text-lg">Available Balance</h2>
          </div>
          <p className="font-heading font-bold text-4xl md:text-5xl text-foreground">
            KES {walletBalance.toLocaleString()}
          </p>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-6 bg-gradient-hero text-primary-foreground h-12 text-base font-semibold">
                <ArrowDownLeft className="w-5 h-5 mr-2" /> Top Up via M-Pesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Top Up Wallet</DialogTitle>
                <DialogDescription>
                  Enter an amount to load into your wallet via M-Pesa.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTopUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      className="pl-9"
                      placeholder="e.g. 0712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
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
    </div>
  );
}
