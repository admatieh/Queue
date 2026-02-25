import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useVenueSeats, useCreateReservation } from "@/hooks/use-reservations";
import { useVenue } from "@/hooks/use-venues";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Armchair, Users, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// --- Types ---
type SeatStatus = "available" | "occupied" | "reserved" | "disabled" | "selected";

// --- Components ---

function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground bg-card p-4 rounded-xl border border-border/50 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-emerald-500 shadow-sm" />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-primary shadow-sm" />
        <span>Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/50" />
        <span>Reserved</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
        <span>Occupied</span>
      </div>
    </div>
  );
}

export default function SeatMapPage() {
  const params = useParams();
  const venueId = params.id as string;
  const { toast } = useToast();

  const { data: venue, isLoading: isVenueLoading } = useVenue(venueId);
  const { data: seatData, isLoading: isSeatsLoading } = useVenueSeats(venueId);
  const createReservation = useCreateReservation();

  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duration, setDuration] = useState("30");

  const isLoading = isVenueLoading || isSeatsLoading;

  // Process seats into sections
  const groupedSeats = useMemo(() => {
    if (!seatData?.seats || seatData.seats.length === 0) {
      return {};
    }

    return seatData.seats.reduce((acc, seat) => {
      const section = seat.section || "Main";
      if (!acc[section]) acc[section] = [];
      acc[section].push(seat);
      return acc;
    }, {} as Record<string, typeof seatData.seats>);
  }, [seatData]);

  const handleSeatClick = (seat: any) => {
    if (seat.status === "disabled" || seat.status === "occupied" || seat.isReserved) return;

    setSelectedSeatId(seat.id);
    setIsModalOpen(true);
  };

  const handleConfirmReservation = () => {
    if (!selectedSeatId) return;

    createReservation.mutate(
      {
        venueId,
        seatId: selectedSeatId,
        durationMinutes: Number(duration)
      },
      {
        onSuccess: () => {
          toast({
            title: "Reservation Confirmed!",
            description: `You have reserved seat ${selectedSeatId} for ${duration} minutes.`,
          });
          setIsModalOpen(false);
          setSelectedSeatId(null);
        },
        onError: (err) => {
          toast({
            title: "Booking Failed",
            description: err.message,
            variant: "destructive",
          });
          setIsModalOpen(false);
        }
      }
    );
  };

  const getSeatStatusColor = (seat: any): string => {
    if (selectedSeatId === seat.id) return "bg-primary text-primary-foreground scale-110 shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background";
    if (seat.status === "disabled") return "opacity-0 pointer-events-none"; // Hide disabled seats or make them invisible
    if (seat.status === "occupied") return "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed";
    if (seat.isReserved) return "bg-rose-500/10 text-rose-500 border-2 border-rose-500/20 cursor-not-allowed";
    return "bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 cursor-pointer hover:shadow-md hover:-translate-y-1";
  };

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  if (!venue) return <LayoutShell><div>Venue not found</div></LayoutShell>;

  return (
    <LayoutShell>
      <div className="container py-8 px-4 md:px-8 mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center gap-6 mb-10">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold font-display">{venue.name}</h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Open {venue.openTime} - {venue.closeTime}
            </p>
          </div>
          <SeatLegend />
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-8 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="mb-12 w-full max-w-md text-center">
            <div className="h-2 w-full bg-muted rounded-full mb-2" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Front of Room (Screen/Stage)</span>
          </div>

          <div className="w-full space-y-12">
            {Object.entries(groupedSeats).map(([sectionName, seats]) => (
              <div key={sectionName} className="space-y-4">
                <h3 className="text-xl font-medium tracking-tight border-b pb-2">{sectionName}</h3>
                <div className="flex flex-wrap gap-4">
                  {seats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status !== "available" && !seat.isReserved}
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 seat-enter",
                        getSeatStatusColor(seat)
                      )}
                      title={`Seat ${seat.label} - ${seat.locationDescription || 'No description'}`}
                    >
                      {seat.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedSeats).length === 0 && (
              <div className="text-muted-foreground">No seats available constraint for this venue.</div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Reservation</DialogTitle>
            <DialogDescription>
              Select how long you need the seat for.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="duration" className="text-right text-sm font-medium">
                Duration
              </label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="45">45 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 text-primary" />
              <p>Reservations auto-expire. Please check in within 5 minutes of start time.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmReservation} disabled={createReservation.isPending}>
              {createReservation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
