import { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("lisheUser");
  return stored ? JSON.parse(stored) : null;
};

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lisheToken");
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [role, setRole] = useState<UserRole>(() => getStoredUser()?.role ?? "recipient");

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    setRole(user.role);
    localStorage.setItem("lisheUser", JSON.stringify(user));
    localStorage.setItem("lisheToken", token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole("recipient");
    localStorage.removeItem("lisheUser");
    localStorage.removeItem("lisheToken");
  };

  return (
    <AuthContext.Provider value={{ user, token, role, setRole, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
