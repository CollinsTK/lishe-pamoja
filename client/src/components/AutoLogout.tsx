import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function AutoLogout({ children }: { children: React.ReactNode }) {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        logout();
        toast.error("Session Expired", {
          description: "You have been logged out due to inactivity.",
        });
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    // Only track if user is logged in
    if (!isAuthenticated) return;

    // Events that indicate user activity
    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart"
    ];

    const handleActivity = () => resetTimer();

    // Setup initial timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, logout]);

  return <>{children}</>;
}
