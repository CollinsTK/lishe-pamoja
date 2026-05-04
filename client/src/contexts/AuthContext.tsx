import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserCapabilities } from "@/types";
import { API_BASE } from "@/lib/apiClient";

// Default capabilities for new users
const defaultCapabilities: UserCapabilities = {
  canBrowse: true,
  canSell: false,
  canDeliver: false,
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  capabilities: UserCapabilities;
  isAdmin: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateAuthUser: (updates: Partial<User>) => void;
  hasCapability: (capability: keyof UserCapabilities) => boolean;
  hasAnyCapability: (...capabilities: (keyof UserCapabilities)[]) => boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("lisheUser");
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem("lisheUser");
    return null;
  }
};

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lisheToken");
};

const normalizeUser = (userData: any): User => ({
  ...userData,
  id: userData.id || userData._id,
  capabilities: userData.capabilities || defaultCapabilities,
  isAdmin: userData.isAdmin || false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isInitializing, setIsInitializing] = useState(true);

  // Get capabilities from user or use defaults
  const capabilities = user?.capabilities || defaultCapabilities;
  const isAdmin = user?.isAdmin || false;

  useEffect(() => {
    const verifySession = async () => {
      const currentToken = getStoredToken();
      if (!currentToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE}/users/me`, {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const userData = await response.json();
          const normalizedUser = normalizeUser(userData);
          setUser(normalizedUser);
          localStorage.setItem("lisheUser", JSON.stringify(normalizedUser));
        } else {
          // Token is invalid or server rejected it
          logout();
        }
      } catch (error) {
        // Network error (server down) or timeout
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn("Session verification timed out");
        } else {
          console.error("Session verification failed:", error);
        }
        logout();
      } finally {
        setIsInitializing(false);
      }
    };

    // Ensure session verification doesn't hang forever
    const timeout = setTimeout(() => {
      console.warn("Session verification timed out, forcing initialization complete");
      setIsInitializing(false);
    }, 8000);

    verifySession().finally(() => clearTimeout(timeout));
  }, []);

  const login = (user: User, token: string) => {
    const normalizedUser = normalizeUser(user);
    setUser(normalizedUser);
    setToken(token);
    localStorage.setItem("lisheUser", JSON.stringify(normalizedUser));
    localStorage.setItem("lisheToken", token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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

  // Helper functions to check capabilities
  const hasCapability = (capability: keyof UserCapabilities): boolean => {
    // Admin has all capabilities
    if (isAdmin) return true;
    return capabilities[capability] === true;
  };

  const hasAnyCapability = (...caps: (keyof UserCapabilities)[]): boolean => {
    // Admin has all capabilities
    if (isAdmin) return true;
    return caps.some(cap => capabilities[cap] === true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      capabilities,
      isAdmin,
      login,
      logout,
      updateAuthUser,
      hasCapability,
      hasAnyCapability,
      isAuthenticated: !!user,
      isInitializing,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
