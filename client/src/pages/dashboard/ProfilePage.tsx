import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Mail, Phone, Shield, Store, Truck, Lock, ArrowRight, Calendar, MapPin, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function getDaysInfo(startDate?: string | Date | null, endDate?: string | Date | null) {
  if (!endDate) return { daysRemaining: 0, totalDays: 30, pct: 0 };
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const start = startDate ? new Date(startDate).getTime() : end - 30 * 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const daysUsed = totalDays - daysRemaining;
  const pct = Math.round((daysUsed / totalDays) * 100);
  return { daysRemaining, totalDays, pct };
}

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];

export default function ProfilePage() {
  const { user, capabilities, isAdmin, hasCapability, updateAuthUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const canSell = hasCapability("canSell");
  const canDeliver = hasCapability("canDeliver");

  const sub = user?.subscription;
  const hasActiveSub = sub?.status === "active" && sub?.plan && sub.plan !== "free";
  const { daysRemaining, totalDays, pct } = getDaysInfo(sub?.startDate, sub?.endDate);

  const existingLat  = user?.location?.lat  ?? null;
  const existingLng  = user?.location?.lng  ?? null;
  const existingAddr = user?.location?.address ?? null;

  const [pin, setPin]             = useState<{ lat: number; lng: number } | null>(
    existingLat && existingLng ? { lat: existingLat, lng: existingLng } : null
  );
  const [address, setAddress]     = useState<string>(existingAddr ?? "");
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving]       = useState(false);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setPin({ lat, lng });
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      setAddress(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  }, []);

  const saveLocation = async () => {
    if (!pin) return;
    setSaving(true);
    try {
      const res: any = await apiClient.put("/users/me", {
        location: { lat: pin.lat, lng: pin.lng, address },
      });
      updateAuthUser({ location: { lat: pin.lat, lng: pin.lng, address } });
      toast.success("Location saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  const clearLocation = async () => {
    setSaving(true);
    try {
      await apiClient.put("/users/me", { location: { lat: null, lng: null, address: null } });
      updateAuthUser({ location: { lat: null, lng: null, address: null } });
      setPin(null);
      setAddress("");
      toast.success("Location cleared");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear location");
    } finally {
      setSaving(false);
    }
  };

  const mapCenter: [number, number] = pin
    ? [pin.lat, pin.lng]
    : existingLat && existingLng
      ? [existingLat, existingLng]
      : DEFAULT_CENTER;

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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Current Plan</p>
                <Badge variant={hasActiveSub ? "default" : "outline"} className={hasActiveSub ? "bg-primary" : ""}>
                  {sub?.status || "free"}
                </Badge>
              </div>
              <p className="text-lg font-bold capitalize">{sub?.plan || "Free"}</p>

              {hasActiveSub && sub?.endDate && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining` : "Expires today"}
                    </span>
                    <span>{totalDays} days total</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(sub.endDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
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
                <Link to="/dashboard/subscription" className="flex items-center justify-center gap-2">
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
                <Link to="/dashboard/subscription" className="flex items-center justify-center gap-2">
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

      {/* ── My Location ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            My Location
          </CardTitle>
          <CardDescription>
            Tap anywhere on the map to set your location — used to show listings near you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Address display */}
          {(address || geocoding) && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/60 text-sm">
              {geocoding
                ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                : <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              }
              <span className="text-muted-foreground">{geocoding ? "Getting address…" : address}</span>
            </div>
          )}

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 280 }}>
            <MapContainer
              center={mapCenter}
              zoom={pin || (existingLat && existingLng) ? 15 : 12}
              style={{ width: "100%", height: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickHandler onPick={handleMapClick} />
              {pin && <Marker position={[pin.lat, pin.lng]} />}
            </MapContainer>
          </div>

          {!pin && !existingLat && (
            <p className="text-xs text-muted-foreground text-center">Click on the map to drop a pin</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={saveLocation}
              disabled={!pin || saving}
              className="flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Location
            </Button>
            {(pin || existingLat) && (
              <Button
                variant="outline"
                onClick={clearLocation}
                disabled={saving}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
