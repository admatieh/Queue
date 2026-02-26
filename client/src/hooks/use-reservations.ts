import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";

// --- GET SEATS ---
export function useVenueSeats(venueId: string) {
  const { handleLogout } = useAuth();

  return useQuery({
    queryKey: [api.venues.getSeats.path, venueId],
    queryFn: async () => {
      const url = buildUrl(api.venues.getSeats.path, { id: venueId });

      const res = await fetch(url, {
        credentials: "include",
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) throw new Error("Failed to fetch seats");

      return api.venues.getSeats.responses[200].parse(await res.json());
    },
    enabled: !!venueId,
    refetchInterval: 5000,
  });
}

// --- ACTIVE RESERVATIONS ---
export function useMyActiveReservations() {
  const { handleLogout } = useAuth();

  return useQuery({
    queryKey: [api.reservations.listActive.path],
    queryFn: async () => {
      const res = await fetch(api.reservations.listActive.path, {
        credentials: "include",
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) throw new Error("Failed to fetch reservations");

      return api.reservations.listActive.responses[200].parse(await res.json());
    },
  });
}

// --- CREATE RESERVATION ---
export function useCreateReservation() {
  const { handleLogout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
   mutationFn: async (data: { venueId: string; seatId: string; startTime: string; endTime: string }) => {
      const res = await fetch(api.reservations.create.path, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  venueId: data.venueId,
  seatId: data.seatId,
  startTime: data.startTime,
  endTime: data.endTime,
}),
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        if (res.status === 409) throw new Error("Seat already reserved");
        throw new Error("Failed to create reservation");
      }

      return api.reservations.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [api.venues.getSeats.path, variables.venueId],
      });
      queryClient.invalidateQueries({
        queryKey: [api.reservations.listActive.path],
      });
    },
  });
}

// --- CANCEL RESERVATION ---
export function useCancelReservation() {
  const { handleLogout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.reservations.cancel.path, { id });

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      if (res.status === 401) {
        handleLogout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) throw new Error("Failed to cancel reservation");

      return api.reservations.cancel.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.reservations.listActive.path],
      });
    },
  });
}