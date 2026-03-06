import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, getToken } from "@/lib/queryClient";

/** Helper: build fetch headers with JWT Authorization if available. */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function useVenueSeats(venueId: string) {
  return useQuery({
    queryKey: [api.venues.getSeats.path, venueId],
    queryFn: async () => {
      const url = buildUrl(api.venues.getSeats.path, { id: venueId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch seats");
      return api.venues.getSeats.responses[200].parse(await res.json());
    },
    enabled: !!venueId,
    refetchInterval: 5000,
  });
}

export function useMyActiveReservations() {
  return useQuery({
    queryKey: [api.reservations.listActive.path],
    queryFn: async () => {
      const res = await fetch(api.reservations.listActive.path, {
        headers: authHeaders(),
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch reservations");
      return api.reservations.listActive.responses[200].parse(await res.json());
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { venueId: string; seatId: string; durationMinutes: number }) => {
      const res = await fetch(api.reservations.create.path, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...data, durationMinutes: data.durationMinutes.toString() as any }),
      });

      if (!res.ok) {
        if (res.status === 409) throw new Error("Seat already reserved");
        if (res.status === 401) throw new Error("Please log in to make a reservation");
        throw new Error("Failed to create reservation");
      }
      return api.reservations.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.venues.getSeats.path, variables.venueId] });
      queryClient.invalidateQueries({ queryKey: [api.reservations.listActive.path] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.reservations.cancel.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to cancel reservation");
      return api.reservations.cancel.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reservations.listActive.path] });
    },
  });
}
