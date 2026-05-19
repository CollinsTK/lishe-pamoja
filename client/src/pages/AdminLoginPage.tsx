import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiClient.post("/users/login", { email, password });

      // Check if user is admin
      if (!data.isAdmin) {
        setError("Access denied. Admin privileges required.");
        setIsLoading(false);
        return;
      }

      const user: User = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role ?? "admin",
        capabilities: data.capabilities ?? { canBrowse: true, canSell: true, canDeliver: true },
        isAdmin: true,
        phone: data.phone ?? "",
      };

      login(user, data.token);
      // Redirect to admin dashboard
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-destructive/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Back to main site */}
        <Link
          to="/auth"
          className="absolute -top-16 left-0 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to main site
        </Link>

        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-1">
              Lishe Pamoja Hub Administration
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50 space-y-6">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80">
              This area is restricted to authorized administrators only. 
              Unauthorized access attempts are logged and monitored.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-300">
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                required
              />
            </div>

            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Password"
              required
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
            />

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-white font-semibold h-11"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Sign In to Admin"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-500">
              Protected by secure authentication
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System operational
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Lishe Pamoja Hub. All rights reserved.
        </p>
      </div>
    </div>
  );
}
