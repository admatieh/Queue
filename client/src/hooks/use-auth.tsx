import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { type User, type InsertUser } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // still loading / checking session
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
  handleLogout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false); // NEW FLAG

  // --- LOGOUT ---
  const handleLogout = () => {
    setUser(null);
    queryClient.setQueryData([api.auth.me.path], null);
    setLocation("/login");
    toast({ title: "Logged out", description: "Session ended." });
  };

  // --- FETCH CURRENT USER ---
  const { refetch, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, {
        credentials: "include",
      });

      if (res.status === 401) {
        setUser(null);
        return null; // not logged in
      }

      if (!res.ok) throw new Error("Failed to fetch user");

      const data: User = await res.json();
      setUser(data);
      return data;
    },
    staleTime: Infinity,
    enabled: false, // we manually call refetch
  });

  // --- LOGIN ---
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Login failed");
      }

      return await res.json(); // { user }
    },
    onSuccess: (data: { user: User }) => {
      setUser(data.user);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Welcome!", description: `Logged in as ${data.user.email}` });
      setLocation("/venues");
    },
  });

  // --- REGISTER ---
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Registration failed");
      }

      return await res.json(); // { user }
    },
    onSuccess: (data: { user: User }) => {
      setUser(data.user);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Welcome!", description: "Account created successfully" });
      setLocation("/venues");
    },
  });

  // --- LOGOUT ---
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: handleLogout,
  });

  // --- initialize on page load ---
  useEffect(() => {
    (async () => {
      await refetch();
      setInitialized(true); // ✅ mark as initialized
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: !initialized || isLoading, // true until initial session check is done
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}