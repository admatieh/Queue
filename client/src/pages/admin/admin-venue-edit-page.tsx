import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useVenue, useUpdateVenue } from "@/hooks/use-venues";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVenueSchema, type InsertVenue } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
    Loader2, ArrowLeft, Upload, Trash2, LayoutGrid, MapPin,
    Star, Image as ImageIcon, Search,
} from "lucide-react";
import { VenueMap } from "@/components/venue-map";

export default function AdminVenueEditPage() {
    const { id } = useParams();
    const { data: venue, isLoading } = useVenue(id || "");
    const updateVenue = useUpdateVenue();
    const { toast } = useToast();
    const qc = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

    // Map state — independent of the form so the map re-renders live
    const [mapLat, setMapLat] = useState<number>(48.8566);  // default: Paris
    const [mapLng, setMapLng] = useState<number>(2.3522);
    const [hasPin, setHasPin] = useState(false);
    const [geoSearch, setGeoSearch] = useState("");
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Seed map coordinates from saved venue once loaded
    useEffect(() => {
        if (venue?.lat && venue?.lng) {
            setMapLat(venue.lat);
            setMapLng(venue.lng);
            setHasPin(true);
        }
    }, [venue?.lat, venue?.lng]);

    const handleMapMove = (lat: number, lng: number) => {
        setMapLat(lat); setMapLng(lng); setHasPin(true);
    };

    const handleGeocode = async () => {
        const q = geoSearch.trim();
        if (!q) return;
        setIsGeocoding(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
                { headers: { "Accept-Language": "en" } }
            );
            const data = await res.json();
            if (!data.length) { toast({ title: "Not found", description: "Try a more specific address.", variant: "destructive" }); return; }
            setMapLat(parseFloat(data[0].lat));
            setMapLng(parseFloat(data[0].lon));
            setHasPin(true);
        } catch {
            toast({ title: "Geocode failed", variant: "destructive" });
        } finally { setIsGeocoding(false); }
    };

    const form = useForm<InsertVenue>({
        resolver: zodResolver(insertVenueSchema.partial()),
        defaultValues: { name: "", location: "", address: "", description: "", capacity: 0, openTime: "09:00", closeTime: "22:00", timezone: "UTC", category: "tech", status: "active" },
        values: venue ? {
            name: venue.name || "", location: venue.location || "", address: (venue as any).address || "",
            description: venue.description || "", capacity: venue.capacity || 0,
            openTime: venue.openTime || "09:00", closeTime: venue.closeTime || "22:00",
            timezone: venue.timezone || "UTC", category: venue.category || "tech", status: venue.status || "active",
        } : undefined,
    });

    const onSubmit = (data: Partial<InsertVenue>) => {
        if (!id) return;
        // Include current map pin coordinates in save
        const payload: any = { ...data };
        if (hasPin) { payload.lat = mapLat; payload.lng = mapLng; }
        updateVenue.mutate({ id, ...payload }, {
            onSuccess: () => toast({ title: "Saved", description: "Venue updated." }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Too large", description: "Max 5MB", variant: "destructive" }); return;
        }
        setIsUploading(true);
        const fd = new FormData();
        fd.append("image", file);
        try {
            const res = await fetch(`/api/admin/venues/${id}/upload`, { method: "POST", body: fd });
            if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
            toast({ title: "Uploaded!", description: "Image added to gallery." });
            qc.invalidateQueries({ queryKey: ["/api/venues", id] });
            e.target.value = "";
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        } finally { setIsUploading(false); }
    };

    const handleDeleteImage = async (imageUrl: string) => {
        if (!id) return;
        setDeletingUrl(imageUrl);
        try {
            const res = await fetch(`/api/admin/venues/${id}/images`, {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            toast({ title: "Removed", description: "Image deleted." });
            qc.invalidateQueries({ queryKey: ["/api/venues", id] });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally { setDeletingUrl(null); }
    };

    const handleSetPrimary = async (imageUrl: string) => {
        if (!id || !venue) return;
        const images = (venue as any).images || [];
        const reordered = [imageUrl, ...images.filter((u: string) => u !== imageUrl)];
        await fetch(`/api/admin/venues/${id}/images/reorder`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: reordered }),
        });
        qc.invalidateQueries({ queryKey: ["/api/venues", id] });
        toast({ title: "Primary set", description: "First image is now the cover." });
    };

    const galleryImages: string[] = (venue as any)?.images || (venue?.imageUrl ? [venue.imageUrl] : []);

    if (isLoading) return (
        <AdminLayout>
            <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        </AdminLayout>
    );

    if (!venue) return (
        <AdminLayout>
            <div className="p-12 text-center text-muted-foreground">Venue not found</div>
        </AdminLayout>
    );

    return (
        <AdminLayout>
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <Link href="/admin/venues">
                    <Button variant="outline" size="icon" className="border-border h-9 w-9">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <div className="deco-divider w-36 mb-1"><span>EDIT VENUE</span></div>
                    <h1 className="text-3xl font-display font-bold text-foreground">{venue.name}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ═══ LEFT: Form ═══ */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-lg p-6 ticket-notch">
                        <h2 className="label-caps mb-5">General Information</h2>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="label-caps">Venue Name</FormLabel>
                                            <FormControl><Input {...field} className="bg-background border-border" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="category" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="label-caps">Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-card border-border">
                                                    <SelectItem value="tech">Tech</SelectItem>
                                                    <SelectItem value="cafe">Café</SelectItem>
                                                    <SelectItem value="restaurant">Restaurant</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="label-caps">Description</FormLabel>
                                        <FormControl><Textarea rows={3} {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="location" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="label-caps">Location (display text)</FormLabel>
                                            <FormControl><Input {...field} placeholder="Lower East Side, NYC" className="bg-background border-border" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name={"address" as any} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="label-caps">Street Address (for Maps)</FormLabel>
                                            <FormControl><Input {...field} placeholder="123 Main St, City" className="bg-background border-border" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                                    {(["openTime", "closeTime", "timezone"] as const).map((name) => (
                                        <FormField key={name} control={form.control} name={name} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="label-caps">{name === "openTime" ? "Opens" : name === "closeTime" ? "Closes" : "Timezone"}</FormLabel>
                                                <FormControl><Input type={name.includes("Time") ? "time" : "text"} {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                                            </FormItem>
                                        )} />
                                    ))}
                                    <FormField control={form.control} name="capacity" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="label-caps">Capacity</FormLabel>
                                            <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} className="bg-background border-border" /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="pt-4 border-t border-border flex items-center justify-between">
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem className="flex items-center gap-3 space-y-0">
                                            <FormLabel className="label-caps mb-0">Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-32 bg-background border-border"><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-card border-border">
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="disabled">Disabled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <Button type="submit" disabled={updateVenue.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow font-semibold">
                                        {updateVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>

                {/* ═══ RIGHT: Gallery + Actions ═══ */}
                <div className="space-y-5">
                    {/* Gallery */}
                    <div className="bg-card border border-border rounded-lg p-5 ticket-notch">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="label-caps">Photo Gallery</h2>
                            <Button
                                variant="outline" size="sm"
                                className="border-primary/30 text-primary hover:bg-primary/10 text-xs"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                                Add Photo
                            </Button>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </div>

                        {galleryImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {galleryImages.map((url: string, i: number) => (
                                    <div key={i} className="relative group aspect-square rounded overflow-hidden border border-border">
                                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                        {i === 0 && (
                                            <div className="absolute top-1.5 left-1.5 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                Cover
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {i !== 0 && (
                                                <button
                                                    onClick={() => handleSetPrimary(url)}
                                                    className="p-1.5 bg-primary/80 hover:bg-primary rounded text-primary-foreground"
                                                    title="Set as cover"
                                                >
                                                    <Star className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteImage(url)}
                                                disabled={deletingUrl === url}
                                                className="p-1.5 bg-destructive/80 hover:bg-destructive rounded text-white"
                                                title="Delete"
                                            >
                                                {deletingUrl === url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                                <ImageIcon className="h-10 w-10 mb-2" />
                                <p className="text-xs">No photos yet</p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">Hover an image to set as cover or delete. First image is the listing cover.</p>
                    </div>

                    {/* Location Pin */}
                    <div className="bg-card border border-border rounded-lg p-5 ticket-notch">
                        <h2 className="label-caps mb-3 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary" /> Location Pin
                        </h2>
                        <p className="text-xs text-muted-foreground mb-3">
                            Search an address or click/drag the pin on the map. Saved with your venue.
                        </p>

                        {/* Address search */}
                        <div className="flex gap-2 mb-3">
                            <Input
                                placeholder="Search address…"
                                value={geoSearch}
                                onChange={e => setGeoSearch(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleGeocode()}
                                className="bg-background border-border text-sm h-8"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 shrink-0 border-border"
                                onClick={handleGeocode}
                                disabled={isGeocoding}
                            >
                                {isGeocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            </Button>
                        </div>

                        {/* Map */}
                        <VenueMap
                            lat={mapLat}
                            lng={mapLng}
                            interactive
                            onMove={handleMapMove}
                            className="w-full h-52 rounded-lg overflow-hidden border border-border"
                        />

                        {hasPin && (
                            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                                {mapLat.toFixed(5)}, {mapLng.toFixed(5)}
                            </p>
                        )}
                    </div>

                    {/* Seat Management */}
                    <div className="bg-card border border-primary/20 rounded-lg p-5">
                        <h2 className="label-caps mb-3 text-primary">Seat Management</h2>
                        <p className="text-sm text-muted-foreground mb-4">Configure seating sections and availability.</p>
                        <Link href={`/admin/venues/${venue.id}/seats`}>
                            <Button className="w-full" variant="outline" size="sm">
                                <LayoutGrid className="w-4 h-4 mr-2" /> Manage Seats
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
