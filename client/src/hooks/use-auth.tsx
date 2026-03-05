import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, ReactNode } from "react";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { type User, type InsertUser } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

  // --- FETCH CURRENT USER ---
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, {
        credentials: "include", // 🔥 مهم مع httpOnly cookie
      });

      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");

      return await res.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    queryClient.setQueryData([api.auth.me.path], null);
    setLocation("/login");
    toast({ title: "Logged out", description: "Session ended." });
  };

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

      return await res.json();
    },

    onSuccess: (data: { user: User }) => {
      queryClient.setQueryData([api.auth.me.path], data.user);

      toast({
        title: "Welcome!",
        description: `Logged in as ${data.user.email}`,
      });

      setLocation("/venues");
    },

    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Wrong email or password",
        variant: "destructive",
      });
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

      return await res.json();
    },

    onSuccess: (data: { user: User }) => {
      queryClient.setQueryData([api.auth.me.path], data.user);

      toast({
        title: "Welcome!",
        description: "Account created successfully",
      });

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

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated: !!user,
        isLoading,
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