import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = 
  | "super_admin"
  | "manager"
  | "cashier"
  | "bar_staff"
  | "kitchen_staff"
  | "inventory_officer"
  | "accountant"
  | "store_user"
  | "store_admin"
  | "waitstaff";

interface StaffUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: StaffRole;
}

interface StaffAuthContextType {
  staffUser: StaffUser | null;
  isStaffAuthenticated: boolean;
  isLoading: boolean;
  staffLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  staffLogout: () => void;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

const STAFF_SESSION_KEY = "pos_staff_session";

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STAFF_SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate session (max 12 hours)
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          setStaffUser(parsed.user);
        } else {
          localStorage.removeItem(STAFF_SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(STAFF_SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const staffLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc("verify_staff_password", {
        p_username: username,
        p_password: password,
      });

      if (error) {
        console.error("Staff login error:", error);
        return { success: false, error: "Login failed. Please try again." };
      }

      if (!data || data.length === 0) {
        return { success: false, error: "Invalid username or password" };
      }

      const staffData = data[0];
      const user: StaffUser = {
        id: staffData.staff_id,
        username: username.toLowerCase(),
        full_name: staffData.staff_name,
        email: staffData.staff_email,
        role: staffData.staff_role as StaffRole,
      };

      // Store session with 12-hour expiry
      const session = {
        user,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
      setStaffUser(user);

      return { success: true };
    } catch (err) {
      console.error("Staff login exception:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const staffLogout = () => {
    localStorage.removeItem(STAFF_SESSION_KEY);
    setStaffUser(null);
  };

  return (
    <StaffAuthContext.Provider
      value={{
        staffUser,
        isStaffAuthenticated: !!staffUser,
        isLoading,
        staffLogin,
        staffLogout,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error("useStaffAuth must be used within StaffAuthProvider");
  }
  return context;
}
