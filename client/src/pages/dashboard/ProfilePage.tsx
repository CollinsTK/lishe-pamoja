import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Shield, Store, Truck, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const { user, capabilities, isAdmin, hasCapability } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const canSell = hasCapability("canSell");
  const canDeliver = hasCapability("canDeliver");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input id="name" value={user?.name || ""} disabled={!isEditing} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={user?.email || ""} disabled={!isEditing} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={user?.phone || ""} disabled={!isEditing} />
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "default" : "outline"}
              className="w-full"
            >
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your subscription and capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Current Plan</p>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {user?.subscription?.plan || "free"}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {capabilities.canBrowse && (
                  <Badge variant="secondary">Browse</Badge>
                )}
                {capabilities.canSell && (
                  <Badge className="bg-green-500">Sell</Badge>
                )}
                {capabilities.canDeliver && (
                  <Badge className="bg-blue-500">Deliver</Badge>
                )}
                {isAdmin && (
                  <Badge className="bg-red-500">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Wallet Balance</p>
              <p className="text-2xl font-bold">KES {user?.walletBalance || 0}</p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/subscription">Manage Subscription</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upgrade Prompts */}
        {!canSell && (
          <Card className="border-dashed border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Store className="h-5 w-5" />
                Start Selling
              </CardTitle>
              <CardDescription>
                Upgrade to list and sell your surplus food
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe to the Vendor or Business plan to start listing your surplus food and reach more customers.
              </p>
              <Button asChild className="w-full bg-amber-600 hover:bg-amber-700">
                <Link to="/dashboard/subscription?plan=vendor" className="flex items-center justify-center gap-2">
                  Upgrade to Sell
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!canDeliver && (
          <Card className="border-dashed border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Truck className="h-5 w-5" />
                Become a Driver
              </CardTitle>
              <CardDescription>
                Subscribe to deliver food to recipients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe to the Logistics or Business plan to start delivering food and earn money.
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link to="/dashboard/subscription?plan=logistics" className="flex items-center justify-center gap-2">
                  Upgrade to Deliver
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Locked Capabilities Info */}
        {canSell && canDeliver && (
          <Card className="border-green-500/30 bg-green-50/30 dark:bg-green-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Lock className="h-5 w-5" />
                All Features Unlocked
              </CardTitle>
              <CardDescription>
                You have access to all platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your current subscription gives you full access to browse, sell, and deliver. You're all set!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
