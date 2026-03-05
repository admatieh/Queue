import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useVenues } from "@/hooks/use-venues";
import { useAuth } from "@/hooks/use-auth";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isVenueOpen } from "@/lib/time";
import { MapPin, Users, ArrowRight, Loader2, Building2, Search, FilterX, Coffee, Utensils, Cpu } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech",
  cafe: "Cafe",
  restaurant: "Restaurant",
};

const CATEGORY_ICONS: Record<string, any> = {
  tech: Cpu,
  cafe: Coffee,
  restaurant: Utensils,
};

export default function VenuesPage() {
  const { data: venues, isLoading } = useVenues();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");

  const { user } = useAuth(); 
  const [, setLocation] = useLocation();

  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    return venues.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || venue.category === categoryFilter;

      const isOpen = isVenueOpen(venue.openTime, venue.closeTime);
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "open" && isOpen) ||
        (availabilityFilter === "seats" && (venue.occupiedSeats || 0) < venue.capacity);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [venues, searchQuery, categoryFilter, availabilityFilter]);

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="container py-10 px-4 md:px-8 mx-auto">
        {/* ...Filters & Search code unchanged... */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVenues.map((venue) => {
            const isOpen = isVenueOpen(venue.openTime, venue.closeTime);
            const occupied = venue.occupiedSeats || 0;

            const badgeColor = isOpen
              ? "bg-green-500/90 text-white border-green-400"
              : "bg-red-500/90 text-white border-red-400";

            const CategoryIcon = CATEGORY_ICONS[venue.category] || Building2;

            return (
              <Card
                key={venue.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20 overflow-hidden relative"
              >
                <div className="relative h-48 w-full bg-muted overflow-hidden">
                  {venue.imageUrl ? (
                    <img
                      src={venue.imageUrl}
                      alt={venue.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                      <CategoryIcon className="h-16 w-16 text-primary/20" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                  <div className="absolute top-4 right-4 group-hover:scale-110 transition-transform duration-300">
                    <Badge variant="secondary" className="backdrop-blur-md bg-white/10 text-white border-white/20 capitalize gap-1">
                      <CategoryIcon className="h-3 w-3" />
                      {CATEGORY_LABELS[venue.category] || venue.category}
                    </Badge>
                  </div>

                  <div className="absolute bottom-4 left-4 text-white">
                    <Badge className={`mb-2 backdrop-blur-md border ${badgeColor}`}>
                      {isOpen ? "Open" : "Closed"} {venue.openTime} - {venue.closeTime}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-display text-xl">{venue.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-primary/60" /> {venue.location}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {venue.description || "A great place to work and study."}
                  </p>
                </CardContent>

                <CardFooter className="flex justify-between items-center pt-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{occupied} / {venue.capacity} occupied</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${occupied >= venue.capacity ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min((occupied / venue.capacity) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* --- RESERVE / VIEW BUTTON WITH AUTH CHECK --- */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group-hover:text-primary group-hover:translate-x-1 transition-all"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!user) {
                        setLocation("/login");
                      } else {
                      
                        setLocation(`/venues/${venue.id}`);
                      }
                    }}
                  >
                    View <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* ...No venues fallback code unchanged... */}
      </div>
    </LayoutShell>
  );
}