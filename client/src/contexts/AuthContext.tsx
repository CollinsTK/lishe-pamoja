import { createContext, useContext, useState, ReactNode } from "react";
import { UserRole, User } from "@/types";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const roleUsers: Record<UserRole, User> = {
  recipient: { id: "u1", name: "Jane Wanjiku", email: "jane@example.com", role: "recipient", phone: "+254 712 345 678" },
  vendor: { id: "u2", name: "John Kamau", email: "john@vendor.com", role: "vendor", phone: "+254 722 456 789" },
  logistics: { id: "u3", name: "Peter Otieno", email: "peter@logistics.com", role: "logistics", phone: "+254 733 567 890" },
  admin: { id: "u4", name: "Admin User", email: "admin@lishepamoja.co.ke", role: "admin", phone: "+254 700 000 000" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("recipient");

  const login = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setUser(roleUsers[selectedRole]);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, setRole, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
