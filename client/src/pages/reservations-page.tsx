import { useMyActiveReservations, useCancelReservation } from "@/hooks/use-reservations";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarX, Clock, MapPin, Ticket, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}m ${String(s).padStart(2, "0")}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  const isExpiringSoon = (() => {
    const diff = new Date(endTime).getTime() - Date.now();
    return diff > 0 && diff < 5 * 60 * 1000;
  })();

  return (
    <span className={`font-mono font-semibold tabular-nums ${isExpiringSoon ? "text-status-occupied animate-pulse" : "text-primary"}`}>
      {timeLeft}
    </span>
  );
}

export default function ReservationsPage() {
  const { data: reservations, isLoading } = useMyActiveReservations();
  const cancelReservation = useCancelReservation();
  const { toast } = useToast();

  const handleCancel = (id: string, seatLabel?: string) => {
    cancelReservation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Reservation cancelled", description: "Your seat has been released." });
      },
      onError: (err) => {
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="container mx-auto max-w-3xl py-12 px-4 md:px-8">

        {/* Header */}
        <div className="mb-10 animate-fade-up">
          <div className="deco-divider mb-4 w-48">
            <span>YOUR BOOKINGS</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">My Reservations</h1>
          <p className="text-muted-foreground mt-2">Track your active bookings and remaining time.</p>
        </div>

        {reservations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg animate-fade-up stagger-2">
            <div className="w-14 h-14 bg-card border border-border rounded-lg flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">No active reservations</h3>
            <p className="text-muted-foreground text-sm">Browse venues to reserve your next seat.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations?.map((res, i) => (
              <div
                key={res.id}
                className={`bg-card border border-border rounded-lg overflow-hidden transition-all duration-200
                            hover:border-primary/30 animate-fade-up`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                {/* Gold top bar */}
                <div className="h-0.5 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                        {res.venueName}
                      </h3>
                      <p className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                        <MapPin className="h-3.5 w-3.5 text-primary/70" />
                        Seat {res.seatRow}{res.seatCol}
                      </p>
                    </div>
                    <Badge className="shrink-0 bg-primary/10 text-primary border-primary/30 text-xs font-bold uppercase tracking-wider">
                      Active
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-border/50">
                    <div>
                      <p className="label-caps mb-1">Start time</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(res.startTime), "h:mm a")}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps mb-1">Duration</p>
                      <p className="text-sm font-medium text-foreground">{res.durationMinutes} min</p>
                    </div>
                    <div>
                      <p className="label-caps mb-1">Remaining</p>
                      <Countdown endTime={res.endTime as unknown as string} />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(res.id)}
                      disabled={cancelReservation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 text-sm"
                    >
                      {cancelReservation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        : <CalendarX className="w-4 h-4 mr-2" />
                      }
                      Cancel Reservation
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
