import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Store, Truck, Shield } from "lucide-react";
import logoUrl from "@/assets/lishe-logo.svg";

const roles: { value: UserRole; label: string; icon: any; desc: string }[] = [
  { value: "recipient", label: "Recipient", icon: Users, desc: "Browse & claim surplus food" },
  { value: "vendor", label: "Vendor", icon: Store, desc: "List surplus food for redistribution" },
  { value: "logistics", label: "Logistics Partner", icon: Truck, desc: "Deliver food to recipients" },
  { value: "admin", label: "Admin", icon: Shield, desc: "Manage the platform" },
];

const roleRoutes: Record<UserRole, string> = {
  recipient: "/",
  vendor: "/vendor",
  logistics: "/logistics",
  admin: "/admin",
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>("recipient");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
    navigate(roleRoutes[selectedRole]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-xl overflow-hidden border border-primary/30 bg-white">
            <img src={logoUrl} alt="Lishe Connect Hub logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-primary">Lishe Connect Hub</h1>
          <p className="text-muted-foreground text-sm">
            Kenya's food surplus redistribution platform
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl p-6 shadow-card space-y-6">
          <h2 className="font-heading font-semibold text-xl text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>

          {/* Role Selection (signup only) */}
          {!isLogin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">I am a...</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedRole === r.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <r.icon className={`w-5 h-5 mb-1 ${selectedRole === r.value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-semibold">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLogin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sign in as...</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedRole === r.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <r.icon className={`w-5 h-5 mb-1 ${selectedRole === r.value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-semibold">{r.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">Full Name</Label>
                <Input id="name" placeholder="Jane Wanjiku" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                <Input id="phone" placeholder="+254 712 345 678" />
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground font-semibold">
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
