import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Venue, type InsertVenue, type InsertSeat } from "@shared/schema";
import type { User } from "@shared/schema";
import { getToken } from "@/lib/queryClient";

/** Build fetch headers with JWT Authorization if available. */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function useVenues() {
  return useQuery({
    queryKey: [api.venues.list.path],
    queryFn: async () => {
      const res = await fetch(api.venues.list.path);
      if (!res.ok) throw new Error("Failed to fetch venues");
      return api.venues.list.responses[200].parse(await res.json());
    },
  });
}

export function useAdminVenues(user?: User | null) {
  return useQuery({
    queryKey: ["/api/admin/venues/me", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/admin/venues/me", {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch admin venues");
      return (await res.json()) as Venue[];
    },
    enabled: !!user,
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      let data: any = null;
      try { data = await res.json(); } catch { }
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to delete venue");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues/me"], exact: false });
      queryClient.invalidateQueries({ queryKey: [api.venues.list.path] });
    },
  });
}

export function useVenue(id: string) {
  return useQuery({
    queryKey: [api.venues.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.venues.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch venue");
      return api.venues.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (venue: InsertVenue) => {
      const res = await fetch(api.admin.createVenue.path, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(venue),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create venue");
      }
      return api.admin.createVenue.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.venues.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues/me"], exact: false });
    },
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InsertVenue>) => {
      const url = buildUrl(api.admin.updateVenue.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update venue");
      }
      return api.admin.updateVenue.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.venues.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.venues.get.path, id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues/me"], exact: false });
    },
  });
}

export function useCreateSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ venueId, ...seat }: { venueId: string } & Omit<InsertSeat, "venueId">) => {
      const url = buildUrl(api.admin.createSeat.path, { id: venueId });
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(seat),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create seat");
      }
      return api.admin.createSeat.responses[201].parse(await res.json());
    },
    onSuccess: (_, { venueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.venues.getSeats.path, venueId] });
    },
  });
}

export function useUpdateSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, venueId, ...data }: { id: string; venueId: string } & Partial<InsertSeat>) => {
      const url = buildUrl(api.admin.updateSeat.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update seat");
      }
      return api.admin.updateSeat.responses[200].parse(await res.json());
    },
    onSuccess: (_, { venueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.venues.getSeats.path, venueId] });
    },
  });
}

export function useToggleVenueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "disabled" }) => {
      const url = buildUrl(api.admin.updateVenue.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update venue status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues/me"], exact: false });
      queryClient.invalidateQueries({ queryKey: [api.venues.list.path] });
    },
  });
}
