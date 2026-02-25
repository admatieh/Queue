import { useState, useRef } from "react";
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
import { Loader2, ArrowLeft, Image as ImageIcon, Upload, Trash, LayoutGrid } from "lucide-react";

export default function AdminVenueEditPage() {
    const { id } = useParams();
    const { data: venue, isLoading: isVenueLoading } = useVenue(id || "");
    const updateVenue = useUpdateVenue();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<InsertVenue>({
        resolver: zodResolver(insertVenueSchema.partial()),
        defaultValues: {
            name: "",
            location: "",
            description: "",
            capacity: 0,
            openTime: "09:00",
            closeTime: "22:00",
            timezone: "UTC",
            category: "tech",
            status: "active",
        },
        values: venue ? {
            name: venue.name || "",
            location: venue.location || "",
            description: venue.description || "",
            capacity: venue.capacity || 0,
            openTime: venue.openTime || "09:00",
            closeTime: venue.closeTime || "22:00",
            timezone: venue.timezone || "UTC",
            category: venue.category || "tech",
            status: venue.status || "active",
        } : undefined
    });

    const onSubmit = (data: Partial<InsertVenue>) => {
        if (!id) return;
        updateVenue.mutate({ id, ...data }, {
            onSuccess: () => toast({ title: "Success", description: "Venue updated effectively." }),
            onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        // Validate size (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await fetch(`/api/admin/venues/${id}/upload`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Upload failed");
            }

            toast({ title: "Image uploaded", description: "Venue image updated." });
            // Reload or invalidate logic usually handled via queryClient in a robust setup,
            // but modifying window location helps force refresh of image without caching issues directly.
            window.location.reload();
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    if (isVenueLoading) {
        return (
            <AdminLayout>
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            </AdminLayout>
        );
    }

    if (!venue) {
        return (
            <AdminLayout>
                <div className="p-12 text-center text-muted-foreground">Venue not found</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-6 flex items-center gap-4">
                <Link href="/admin/venues">
                    <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Venue</h1>
                    <p className="text-muted-foreground mt-1">Update details and imagery for {venue.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-xl border shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6">General Information</h2>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Venue Name</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="tech">Tech</SelectItem>
                                                        <SelectItem value="cafe">Cafe</SelectItem>
                                                        <SelectItem value="restaurant">Restaurant</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea rows={4} {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="location"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Location</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                                    <FormField
                                        control={form.control}
                                        name="openTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Open Time</FormLabel>
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="closeTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Close Time</FormLabel>
                                                <FormControl><Input type="time" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="timezone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Timezone</FormLabel>
                                                <FormControl><Input {...field} value={field.value || "UTC"} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="capacity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Capacity</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="pt-4 border-t flex items-center justify-between">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-3 space-y-0">
                                                <FormLabel className="mb-0">Venue Status:</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger className="w-32"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="disabled">Disabled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={updateVenue.isPending}>
                                        {updateVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-card rounded-xl border shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Venue Image</h2>
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                        </div>

                        <div className="aspect-video bg-muted rounded-lg overflow-hidden flex flex-col items-center justify-center border-2 border-dashed relative group">
                            {venue.imageUrl ? (
                                <>
                                    <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" onClick={() => updateVenue.mutate({ id: venue.id, imageUrl: "" })}>
                                            <Trash className="w-4 h-4 mr-2" /> Remove
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground text-center p-4">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No image uploaded</p>
                                    <p className="text-xs mt-1">16:9 aspect ratio recommended</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border shadow-sm p-6 bg-primary/5 border-primary/20">
                        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-primary">
                            <LayoutGrid className="w-5 h-5" /> Seat Management
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Configure seating arrangements, sections, and individual seat availability constraints.
                        </p>
                        <Link href={`/admin/venues/${venue.id}/seats`}>
                            <Button className="w-full" variant="outline">Manage Seats</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
