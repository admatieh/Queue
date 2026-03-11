import { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useVenueSeats, useCreateReservation } from "@/hooks/use-reservations";
import { useVenue } from "@/hooks/use-venues";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Clock, MapPin, Users, ChevronLeft, Ticket,
  CheckCircle, Info, Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { VenueMap } from "@/components/venue-map";


/* ────────────────────────────────────────────
   Seat Legend
   ──────────────────────────────────────────── */
function SeatLegend() {
  const items = [
    { label: "Available", className: "bg-status-available/15 border-status-available/60", dot: "bg-status-available" },
    { label: "Selected", className: "bg-primary/20 border-primary", dot: "bg-primary" },
    { label: "Reserved", className: "bg-status-reserved/15 border-status-reserved/40", dot: "bg-status-reserved" },
    { label: "Occupied", className: "bg-status-occupied/15 border-status-occupied/40", dot: "bg-status-occupied" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map(({ label, className, dot }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded border ${className} flex items-center justify-center`}>
            <div className={`w-2 h-2 rounded-full ${dot}`} />
          </div>
          <span className="label-caps">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   Individual Seat Tile
   ──────────────────────────────────────────── */
interface SeatTileProps {
  seat: any;
  selected: boolean;
  onClick: () => void;
  animDelay: number;
}

function SeatTile({ seat, selected, onClick, animDelay }: SeatTileProps) {
  const isDisabled = seat.status === "disabled";
  const isOccupied = seat.status === "occupied";
  const isReserved = seat.isReserved;
  const isInteractable = !isDisabled && !isOccupied && !isReserved;

  if (isDisabled) return null;

  return (
    <button
      onClick={isInteractable ? onClick : undefined}
      disabled={!isInteractable}
      aria-label={`Seat ${seat.label} — ${selected ? "selected" : isOccupied ? "occupied" : isReserved ? "reserved" : "available"}`}
      title={seat.locationDescription || `Seat ${seat.label}`}
      className={cn(
        "relative w-13 h-13 rounded-md border text-xs font-bold",
        "transition-all duration-150 seat-enter",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        {
          // Available
          "bg-status-available/10 border-status-available/50 text-status-available hover:bg-status-available/20 hover:border-status-available hover:scale-105 hover:shadow-[0_0_12px_hsl(155_55%_45%/0.3)] cursor-pointer":
            isInteractable && !selected,
          // Selected
          "bg-primary/25 border-primary text-primary scale-110 shadow-gold-glow cursor-pointer ring-1 ring-primary/50":
            selected,
          // Reserved
          "bg-status-reserved/10 border-status-reserved/30 text-status-reserved/60 cursor-not-allowed":
            isReserved && !selected,
          // Occupied
          "bg-muted/30 border-border/50 text-muted-foreground/40 cursor-not-allowed":
            isOccupied && !selected,
        }
      )}
      style={{ animationDelay: `${animDelay}ms`, width: "52px", height: "52px" }}
    >
      {seat.label}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <CheckCircle className="w-3 h-3 text-primary-foreground" />
        </span>
      )}
    </button>
  );
}



/* ────────────────────────────────────────────
   Photo Gallery
   ──────────────────────────────────────────── */
function VenueGallery({ images, name }: { images: string[]; name: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {images.slice(0, 6).map((url, i) => (
          <button
            key={i}
            onClick={() => setLightbox(url)}
            className="relative aspect-square rounded overflow-hidden border border-border group hover:border-primary/50 transition-all"
          >
            <img src={url} alt={`${name} photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            {i === 5 && images.length > 6 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">
                +{images.length - 6} more
              </div>
            )}
          </button>
        ))}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Gallery"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────── */
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

  const groupedSeats = useMemo(() => {
    if (!seatData?.seats) return {} as Record<string, any[]>;
    return seatData.seats.reduce((acc: Record<string, any[]>, seat: any) => {
      const s = seat.section || "General";
      if (!acc[s]) acc[s] = [];
      acc[s].push(seat);
      return acc;
    }, {});
  }, [seatData]);

  const selectedSeat = useMemo(
    () => seatData?.seats?.find((s: any) => s.id === selectedSeatId),
    [seatData, selectedSeatId]
  );

  const availableCount = useMemo(
    () => seatData?.seats?.filter((s: any) => s.status === "available" && !s.isReserved).length ?? 0,
    [seatData]
  );

  const handleSeatClick = useCallback((seat: any) => {
    if (seat.status === "disabled" || seat.status === "occupied" || seat.isReserved) return;
    if (selectedSeatId === seat.id) { setSelectedSeatId(null); return; }
    setSelectedSeatId(seat.id);
  }, [selectedSeatId]);

  const handleConfirmReservation = () => {
    if (!selectedSeatId) return;
    createReservation.mutate(
      { venueId, seatId: selectedSeatId, durationMinutes: Number(duration) },
      {
        onSuccess: () => {
          toast({
            title: "Reservation Confirmed!",
            description: `Seat ${selectedSeat?.label} reserved for ${duration} minutes.`,
          });
          setIsModalOpen(false);
          setSelectedSeatId(null);
        },
        onError: (err) => {
          toast({ title: "Booking Failed", description: (err as Error).message, variant: "destructive" });
          setIsModalOpen(false);
        },
      }
    );
  };

  // Gallery images: prefer `images[]` array, fall back to single `imageUrl`
  const galleryImages = useMemo(() => {
    if (!venue) return [];
    if (Array.isArray((venue as any).images) && (venue as any).images.length > 0) return (venue as any).images;
    if (venue.imageUrl) return [venue.imageUrl];
    return [];
  }, [venue]);

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  if (!venue) return <LayoutShell><div className="text-center py-20 text-muted-foreground">Venue not found</div></LayoutShell>;

  return (
    <LayoutShell>
      <div className="container mx-auto max-w-7xl py-8 px-4 md:px-8">

        {/* Back */}
        <Link href="/venues">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground mb-6 -ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> All Venues
          </Button>
        </Link>

        {/* ── VENUE HEADER ── */}
        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          {/* Left: Info */}
          <div className="lg:col-span-2 animate-fade-up">
            <div className="deco-divider mb-4 w-40">
              <span>SEAT SELECTION</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
              {venue.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 text-primary/70" />
                {venue.location}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Clock className="h-4 w-4 text-primary/70" />
                {venue.openTime} – {venue.closeTime}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Users className="h-4 w-4 text-primary/70" />
                {availableCount} seats available
              </span>
            </div>
            {venue.description && (
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-lg">
                {venue.description}
              </p>
            )}
          </div>

          {/* Right: Map */}
          <div className="animate-fade-up stagger-2">
            <p className="label-caps mb-2">Location</p>
            {venue.lat && venue.lng ? (
              <VenueMap
                lat={venue.lat}
                lng={venue.lng}
                className="w-full h-52 rounded-lg overflow-hidden border border-border"
              />
            ) : (
              <div className="w-full h-52 bg-card border border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-8 w-8 text-primary/40" />
                <span className="text-sm font-medium">{venue.address || venue.location}</span>
                <span className="text-xs label-caps text-muted-foreground/50">No map pin set yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <div className="mb-10 animate-fade-up stagger-3">
            <p className="label-caps mb-2 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" /> Photos
            </p>
            <VenueGallery images={galleryImages} name={venue.name} />
          </div>
        )}

        {/* ── TWO-COLUMN: SEAT MAP + SELECTION PANEL ── */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">

          {/* LEFT: Seat map */}
          <div className="bg-card border border-border rounded-lg p-6 ticket-notch animate-fade-up stagger-3">
            {/* Stage */}
            <div className="mb-10 text-center">
              <div className="stage-bar mb-2" />
              <span className="label-caps text-muted-foreground/60">Front · Screen · Stage</span>
            </div>

            {/* Legend */}
            <div className="mb-8">
              <SeatLegend />
            </div>

            {/* Seat sections */}
            <div className="space-y-10">
              {Object.entries(groupedSeats).map(([section, seats]) => (
                <div key={section}>
                  <div className="deco-divider mb-4">
                    <span className="font-medium">{section}</span>
                  </div>
                  <div
                    className="flex flex-wrap gap-3"
                    role="group"
                    aria-label={`Section: ${section}`}
                  >
                    {(seats as any[]).map((seat: any, i: number) => (
                      <SeatTile
                        key={seat.id}
                        seat={seat}
                        selected={selectedSeatId === seat.id}
                        onClick={() => handleSeatClick(seat)}
                        animDelay={i * 20}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(groupedSeats).length === 0 && (
                <p className="text-muted-foreground text-center py-12">No seats configured for this venue.</p>
              )}
            </div>
          </div>

          {/* RIGHT: Selection / booking panel */}
          <div className="space-y-4">
            {/* Selection state */}
            <div className="bg-card border border-border rounded-lg p-5 ticket-notch animate-fade-up stagger-4">
              <p className="label-caps mb-4">Your Selection</p>

              {selectedSeat ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Seat</span>
                      <span className="font-display font-bold text-foreground text-2xl">{selectedSeat.label}</span>
                    </div>
                    {selectedSeat.section && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Section</span>
                        <span className="text-sm font-medium text-foreground">{selectedSeat.section}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
                        {selectedSeat.type}
                      </Badge>
                    </div>
                    {selectedSeat.locationDescription && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">
                        {selectedSeat.locationDescription}
                      </p>
                    )}
                  </div>

                  {/* Duration selector */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="label-caps mb-2">Duration</p>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="w-full bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-gold-glow"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Reserve Seat
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => setSelectedSeatId(null)}
                  >
                    Clear selection
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground/50">
                  <div className="w-12 h-12 border-2 border-dashed border-border rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm">Click a green seat to select it</p>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="bg-card border border-border rounded-lg p-4 flex gap-3">
              <Info className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reservations auto-expire at the selected end time. Please arrive within 5 minutes of your start time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION DIALOG ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-sm bg-card border-border shadow-card ticket-notch"
          aria-describedby="reservation-desc"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-xl text-foreground">Confirm Reservation</DialogTitle>
            <DialogDescription id="reservation-desc" className="text-muted-foreground">
              You're reserving seat <strong className="text-primary">{selectedSeat?.label}</strong> for {duration} minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="bg-background border border-border rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venue</span>
                <span className="font-medium text-foreground">{venue.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seat</span>
                <span className="font-bold text-primary">{selectedSeat?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-foreground">{duration} min</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow font-semibold"
              onClick={handleConfirmReservation}
              disabled={createReservation.isPending}
            >
              {createReservation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
