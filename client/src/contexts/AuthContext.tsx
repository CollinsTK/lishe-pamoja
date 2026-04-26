import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateAuthUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
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
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const currentToken = getStoredToken();
      if (!currentToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setRole(userData.role);
          localStorage.setItem("lisheUser", JSON.stringify(userData));
        } else {
          // Token is invalid or server rejected it
          logout();
        }
      } catch (error) {
        // Network error (server down)
        console.error("Session verification failed:", error);
        logout();
      } finally {
        setIsInitializing(false);
      }
    };

    verifySession();
  }, []);

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

  const updateAuthUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem("lisheUser", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, role, setRole, login, logout, updateAuthUser, isAuthenticated: !!user, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
