import { useState } from "react";
import { useAdminVenues, useDeleteVenue, useCreateVenue } from "@/hooks/use-venues";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

function CreateVenueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const createVenue = useCreateVenue();
    const { toast } = useToast();

    const form = useForm<InsertVenue>({
        resolver: zodResolver(insertVenueSchema),
        defaultValues: {
            name: "",
            location: "",
            description: "",
            capacity: 50,
            openTime: "09:00",
            closeTime: "17:00",
            timezone: "UTC",
            category: "tech",
            status: "active"
        }
    });

    const onSubmit = (data: InsertVenue) => {
        createVenue.mutate(data, {
            onSuccess: () => {
                toast({ title: "Success", description: "Venue created effectively." });
                onOpenChange(false);
                form.reset();
            },
            onError: (err) => {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Venue</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Venue Name</FormLabel>
                                    <FormControl><Input placeholder="Acme Space" {...field} /></FormControl>
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
                                    <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
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
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        <FormField
                            control={form.control}
                            name="capacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Capacity (Seats)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={createVenue.isPending}>
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
    const { data: venues, isLoading } = useAdminVenues();
    const deleteVenue = useDeleteVenue();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { user } = useAuth();
    const isSuperAdmin = user?.role === "super_admin";

    const filteredVenues = venues?.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const handleDelete = (id: string, name: string) => {
        deleteVenue.mutate(id, {
            onSuccess: () => {
                toast({ title: "Deleted", description: `Venue ${name} was disabled.` });
            },
            onError: (err) => {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        });
    };

    return (
        <AdminLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Venues</h1>
                    <p className="text-muted-foreground mt-1">
                        {isSuperAdmin ? "Manage all venues in the system." : "Manage venues assigned to you."}
                    </p>
                </div>

                {isSuperAdmin && (
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Create Venue
                    </Button>
                )}
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-4 border-b flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search venues..."
                            className="pl-9 bg-muted/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 flex justify-center text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredVenues.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No venues found</p>
                        <p className="text-sm">Try adjusting your search query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVenues.map((venue) => (
                                    <TableRow key={venue.id}>
                                        <TableCell className="font-medium text-primary">
                                            {venue.name}
                                            {venue.status === "disabled" && <Badge variant="outline" className="ml-2 text-xs text-muted-foreground">Disabled</Badge>}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{venue.location}</TableCell>
                                        <TableCell>
                                            <Badge variant={venue.status === "active" ? "default" : "secondary"}>
                                                {venue.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {venue.openTime} - {venue.closeTime}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={`/admin/venues/${venue.id}`}>
                                                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                                </Button>
                                            </Link>
                                            <Link href={`/admin/venues/${venue.id}/seats`}>
                                                <Button variant="outline" size="sm" className="hidden sm:inline-flex border-primary/20 hover:bg-primary/10 text-primary">
                                                    <LayoutGrid className="w-4 h-4 mr-2" /> Seats
                                                </Button>
                                            </Link>

                                            {isSuperAdmin && venue.status !== "disabled" && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolute sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will soft-delete the venue "{venue.name}". Existing reservations may be affected.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(venue.id, venue.name)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete Venue
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
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
