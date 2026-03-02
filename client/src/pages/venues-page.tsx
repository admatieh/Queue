import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useVenues } from "@/hooks/use-venues";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { isVenueOpen } from "@/lib/time";
import {
  MapPin, Users, ArrowRight, Loader2, Building2,
  Search, FilterX, Coffee, Utensils, Cpu, Clock,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech",
  cafe: "Café",
  restaurant: "Restaurant",
};
const CATEGORY_ICONS: Record<string, any> = {
  tech: Cpu,
  cafe: Coffee,
  restaurant: Utensils,
};

function isVenueDisabled(venue: any): boolean {
  if (typeof venue?.status === "string") return venue.status.toLowerCase() === "disabled";
  if (venue?.disabled !== undefined) {
    if (typeof venue.disabled === "string") return venue.disabled.toLowerCase() === "true";
    return Boolean(venue.disabled);
  }
  return false;
}

export default function VenuesPage() {
  const { data: venues, isLoading } = useVenues();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!venues) return [];
    return venues
      .filter((v: any) => !isVenueDisabled(v))
      .filter((venue: any) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          venue.name.toLowerCase().includes(q) ||
          venue.location.toLowerCase().includes(q);
        const matchesCategory =
          categoryFilter === "all" || venue.category === categoryFilter;
        const isOpen = isVenueOpen(venue.openTime, venue.closeTime);
        const matchesAvailability =
          availabilityFilter === "all" ||
          (availabilityFilter === "open" && isOpen) ||
          (availabilityFilter === "seats" && (venue.occupiedSeats || 0) < venue.capacity);
        return matchesSearch && matchesCategory && matchesAvailability;
      });
  }, [venues, searchQuery, categoryFilter, availabilityFilter]);

  const clearFilters = () => {
    setSearchQuery(""); setCategoryFilter("all"); setAvailabilityFilter("all");
  };
  const hasFilters = searchQuery || categoryFilter !== "all" || availabilityFilter !== "all";

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
      <div className="container mx-auto max-w-7xl py-12 px-4 md:px-8">

        {/* ── HERO ── */}
        <div className="mb-14 max-w-2xl animate-fade-up">
          {/* Art-deco rule */}
          <div className="deco-divider mb-5 w-48">
            <span>AVAILABLE VENUES</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight text-foreground">
            Find your{" "}
            <span className="italic text-gradient-gold">perfect seat</span>
            <br />
            in seconds.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed max-w-lg">
            Browse real-time availability across all venues. Reserve with one click, no conflict guaranteed.
          </p>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-fade-up stagger-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or location…"
              className="pl-10 bg-card border-border focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[148px] bg-card border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="cafe">Café</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[148px] bg-card border-border">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Any Status</SelectItem>
                <SelectItem value="open">Open Now</SelectItem>
                <SelectItem value="seats">Seats Available</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-4 w-4 mr-1.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* ── GRID ── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((venue: any, i: number) => {
              const isOpen = isVenueOpen(venue.openTime, venue.closeTime);
              const occupied = venue.occupiedSeats || 0;
              const pct = Math.min((occupied / venue.capacity) * 100, 100);
              const CategoryIcon = CATEGORY_ICONS[venue.category] || Building2;

              return (
                <Link key={venue.id} href={`/venues/${venue.id}`}>
                  <div
                    className={`group cursor-pointer bg-card border border-border rounded-lg overflow-hidden
                                transition-all duration-300 hover:border-primary/40 hover:shadow-gold-glow
                                ticket-notch animate-fade-up`}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    {/* Image */}
                    <div className="relative h-44 bg-muted overflow-hidden">
                      {venue.imageUrl ? (
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-card">
                          <CategoryIcon className="h-14 w-14 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                      {/* Category badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className="flex items-center gap-1 bg-black/60 border border-white/10 text-white text-xs backdrop-blur-sm">
                          <CategoryIcon className="h-3 w-3" />
                          {CATEGORY_LABELS[venue.category] || venue.category}
                        </Badge>
                      </div>

                      {/* Open/closed */}
                      <div className="absolute bottom-3 left-3">
                        <Badge
                          className={`flex items-center gap-1 text-xs font-semibold border ${isOpen
                              ? "bg-status-available/20 border-status-available/50 text-status-available"
                              : "bg-status-occupied/20 border-status-occupied/50 text-status-occupied"
                            }`}
                        >
                          <Clock className="h-3 w-3" />
                          {isOpen ? "Open" : "Closed"} · {venue.openTime}–{venue.closeTime}
                        </Badge>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                        {venue.name}
                      </h3>
                      <p className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                        <MapPin className="h-3.5 w-3.5 text-primary/70" />
                        {venue.location}
                      </p>
                      {venue.description && (
                        <p className="text-muted-foreground text-sm mt-2.5 line-clamp-2">
                          {venue.description}
                        </p>
                      )}

                      {/* Capacity bar */}
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Users className="h-3.5 w-3.5 text-primary/70" />
                            {occupied} / {venue.capacity} occupied
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary h-auto p-0 font-semibold text-sm
                                       group-hover:translate-x-1 transition-transform duration-200"
                          >
                            View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-status-occupied" : pct > 75 ? "bg-status-reserved" : "bg-primary"
                              }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
            <FilterX className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">No venues match</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your filters or search query.</p>
            <Button variant="outline" className="mt-5 border-border" onClick={clearFilters}>
              Reset all filters
            </Button>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}