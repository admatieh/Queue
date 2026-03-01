import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useVenues } from "@/hooks/use-venues";
import { useAuth } from "@/hooks/use-auth"; // <-- import your auth hook
import { LayoutShell } from "@/components/layout-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { isVenueOpen } from "@/lib/time";
import {
  MapPin,
  Users,
  ArrowRight,
  Loader2,
  Building2,
  Search,
  FilterX,
  Coffee,
  Utensils,
  Cpu
} from "lucide-react";

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


function isVenueDisabled(venue: any): boolean {
  // status: "disabled" | "active"
  if (typeof venue?.status === "string") {
    return venue.status.toLowerCase() === "disabled";
  }

  // disabled: boolean | "true"/"false" | 0/1
  if (venue?.disabled !== undefined) {
    if (typeof venue.disabled === "string") return venue.disabled.toLowerCase() === "true";
    return Boolean(venue.disabled) === true;
  }

  // active: boolean | "true"/"false" | 0/1  (disabled when active is false)
  if (venue?.active !== undefined) {
    if (typeof venue.active === "string") return venue.active.toLowerCase() === "false";
    return Boolean(venue.active) === false;
  }

  // isActive: boolean | "true"/"false" | 0/1 (disabled when isActive is false)
  if (venue?.isActive !== undefined) {
    if (typeof venue.isActive === "string") return venue.isActive.toLowerCase() === "false";
    return Boolean(venue.isActive) === false;
  }

  // Default: if field is missing, assume it's active (NOT disabled)
  return false;
}

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

      const matchesCategory =
        categoryFilter === "all" || venue.category === categoryFilter;

      const isOpen = isVenueOpen(venue.openTime, venue.closeTime);
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "open" && isOpen) ||
        (availabilityFilter === "seats" &&
          (venue.occupiedSeats || 0) < venue.capacity);

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
      <div className="container py-10 px-4 md:px-8 mx-auto bg-[#f6f3ed]">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="max-w-2xl">
            <h1
              className="
              font-editorial
              text-[48px] md:text-[72px]
              leading-[1.02]
              tracking-[-0.02em]
              text-[#1C1C1C]
            "
            >
              Check Available{" "}
              <span className="italic font-bold text-black">Venues</span>
              <br />
              <span className="italic font-bold text-accentRed">
                you will find whatever suits you
              </span>
            </h1>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or location..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="cafe">Cafe</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={availabilityFilter}
              onValueChange={setAvailabilityFilter}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Status</SelectItem>
                <SelectItem value="open">Open Now</SelectItem>
                <SelectItem value="seats">Seats Available</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery ||
              categoryFilter !== "all" ||
              availabilityFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setAvailabilityFilter("all");
                  }}
                  className="text-muted-foreground"
                >
                  <FilterX className="h-4 w-4 mr-2" /> Clear
                </Button>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVenues.map((venue) => {
            const isOpen = isVenueOpen(venue.openTime, venue.closeTime)
            const occupied = venue.occupiedSeats || 0;

            const badgeColor = isOpen
              ? "bg-green-500/90 text-white border-green-400"
              : "bg-red-500/90 text-white border-red-400"

            const CategoryIcon = CATEGORY_ICONS[venue.category] || Building2;

            return (
              <Link key={venue.id} href={`/venues/${venue.id}`}>
                <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20 overflow-hidden relative">
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
                      <Badge
                        className={`mb-2 backdrop-blur-md border ${badgeColor}`}
                      >
                        {isOpen ? "Open" : "Closed"}{" "}
                        {venue.openTime} - {venue.closeTime}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group-hover:text-primary group-hover:translate-x-1 transition-all"
                    >
                      View <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>

        {filteredVenues.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border px-6 mt-8">
            <FilterX className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No venues match your filters</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter settings.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setAvailabilityFilter("all");
              }}
            >
              Reset all filters
            </Button>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}