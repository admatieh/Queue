import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User, type InsertUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { setToken, clearToken, getToken, getQueryFn } from "@/lib/queryClient";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current user — only possible if we have a token in memory.
  // On page refresh the token is gone (in-memory only), so this returns null
  // and the user must log in again.
  const { data: user, error, isLoading } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      if (!getToken()) return null;  // no token → unauthenticated immediately
      const res = await fetch(api.auth.me.path, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        clearToken();
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
    staleTime: Infinity, // user data only changes on login/logout
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: Pick<InsertUser, "email" | "password">) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (data: User & { token: string }) => {
      // Store JWT in memory, clear stale admin caches, set user
      setToken(data.token);
      queryClient.removeQueries({ queryKey: ["/api/admin/venues/me"], exact: false });
      queryClient.removeQueries({ queryKey: ["/api/admin/users"], exact: false });
      const { token: _, ...safeUser } = data;
      queryClient.setQueryData([api.auth.me.path], safeUser);
      toast({ title: "Welcome back!", description: `Logged in as ${data.name || data.email}` });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (data: User & { token: string }) => {
      setToken(data.token);
      const { token: _, ...safeUser } = data;
      queryClient.setQueryData([api.auth.me.path], safeUser);
      toast({ title: "Welcome!", description: "Account created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Server logout is a no-op for JWT — just clears server-side nothing
      await fetch(api.auth.logout.path, {
        method: "POST",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
    },
    onSuccess: () => {
      clearToken();
      queryClient.clear();
      setLocation("/");
      toast({ title: "Logged out", description: "See you next time!" });
    },
    onError: (error: Error) => {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
