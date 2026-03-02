import { useMemo, useState } from "react";
import { useAdminVenues, useDeleteVenue, useCreateVenue } from "@/hooks/use-venues";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, LayoutGrid, Search, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVenueSchema, type InsertVenue } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function CreateVenueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const createVenue = useCreateVenue();
    const { toast } = useToast();
    const form = useForm<InsertVenue>({
        resolver: zodResolver(insertVenueSchema),
        defaultValues: { name: "", location: "", description: "", capacity: 50, openTime: "09:00", closeTime: "17:00", timezone: "UTC", category: "tech", status: "active" },
    });
    const onSubmit = (data: InsertVenue) => {
        createVenue.mutate(data, {
            onSuccess: () => { toast({ title: "Venue created" }); onOpenChange(false); form.reset(); },
            onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card border-border shadow-card ticket-notch">
                <DialogHeader>
                    <div className="deco-divider mb-2 w-36"><span>NEW VENUE</span></div>
                    <DialogTitle className="font-display text-xl text-foreground">Create Venue</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        {(["name", "location", "description"] as const).map((name) => (
                            <FormField key={name} control={form.control} name={name} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">{name.charAt(0).toUpperCase() + name.slice(1)}</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        ))}
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="label-caps">Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="tech">Tech</SelectItem>
                                        <SelectItem value="cafe">Café</SelectItem>
                                        <SelectItem value="restaurant">Restaurant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-3">
                            {(["openTime", "closeTime"] as const).map((name) => (
                                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="label-caps">{name === "openTime" ? "Opens" : "Closes"}</FormLabel>
                                        <FormControl><Input type="time" {...field} className="bg-background border-border" /></FormControl>
                                    </FormItem>
                                )} />
                            ))}
                        </div>
                        <FormField control={form.control} name="capacity" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="label-caps">Capacity</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value || "0", 10))} className="bg-background border-border" /></FormControl>
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-gold-glow font-semibold" disabled={createVenue.isPending}>
                            {createVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Venue
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminVenuesPage() {
    const { user } = useAuth();
    const { data: venues, isLoading } = useAdminVenues(user);
    const deleteVenue = useDeleteVenue();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const isSuperAdmin = user?.role === "super_admin";

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return (venues || []).filter((v: any) =>
            !q || v.name?.toLowerCase().includes(q) || v.location?.toLowerCase().includes(q)
        );
    }, [venues, search]);

    const handleDelete = (id: string, name: string) => {
        deleteVenue.mutate(id, {
            onSuccess: () => toast({ title: "Deleted", description: `"${name}" removed.` }),
            onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        });
    };

    return (
        <AdminLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="deco-divider w-40 mb-2"><span>MANAGE VENUES</span></div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Venues</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {isSuperAdmin ? "All venues in the system." : "Venues assigned to you."}
                    </p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground shadow-gold-glow font-semibold">
                        <Plus className="w-4 h-4 mr-2" /> New Venue
                    </Button>
                )}
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden ticket-notch">
                <div className="p-4 border-b border-border flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search venues…" className="pl-9 bg-background border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <span className="text-xs text-muted-foreground label-caps">{filtered.length} venues</span>
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center text-muted-foreground">
                        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No venues found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="label-caps text-muted-foreground">Name</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Location</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Status</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Hours</TableHead>
                                    <TableHead className="label-caps text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((venue: any) => (
                                    <TableRow key={venue.id} className="border-border hover:bg-white/[0.02] transition-colors">
                                        <TableCell className="font-semibold text-foreground">{venue.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{venue.location}</TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] font-bold uppercase tracking-wider ${venue.status === "active"
                                                ? "bg-status-available/10 text-status-available border-status-available/30"
                                                : "bg-muted text-muted-foreground border-border"
                                                }`}>
                                                {venue.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{venue.openTime}–{venue.closeTime}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/admin/venues/${venue.id}`}>
                                                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                                                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                                                    </Button>
                                                </Link>
                                                <Link href={`/admin/venues/${venue.id}/seats`}>
                                                    <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary">
                                                        <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Seats
                                                    </Button>
                                                </Link>
                                                {isSuperAdmin && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs" disabled={deleteVenue.isPending}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-card border-border">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="font-display text-foreground">Delete venue?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-muted-foreground">This will soft-delete "{venue.name}" and hide it from the platform.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(venue.id, venue.name)} className="bg-destructive text-white">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <CreateVenueDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </AdminLayout>
    );
}