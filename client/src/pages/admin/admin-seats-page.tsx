import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useVenue, useCreateSeat, useUpdateSeat } from "@/hooks/use-venues";
import { useVenueSeats } from "@/hooks/use-reservations";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSeatSchema, type InsertSeat } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Edit, Hash, Armchair, ShieldCheck, PlayCircle, StopCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function AddSeatDialog({ venueId, open, onOpenChange }: { venueId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
    const createSeat = useCreateSeat();
    const { toast } = useToast();

    const form = useForm<Omit<InsertSeat, "venueId">>({
        resolver: zodResolver(insertSeatSchema.omit({ venueId: true })),
        defaultValues: {
            label: "",
            section: "Main",
            locationDescription: "",
            status: "available",
            type: "standard"
        }
    });

    const onSubmit = (data: Omit<InsertSeat, "venueId">) => {
        createSeat.mutate({ venueId, ...data }, {
            onSuccess: () => {
                toast({ title: "Seat Added", description: `Seat ${data.label} added to ${data.section}.` });
                onOpenChange(false);
                form.reset();
            },
            onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Seat</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="label"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seat Label</FormLabel>
                                        <FormControl><Input placeholder="A1" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="section"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Section</FormLabel>
                                        <FormControl><Input placeholder="Main" {...field} value={field.value || ""} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="locationDescription"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location Description</FormLabel>
                                    <FormControl><Input placeholder="Near the window" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seat Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="standard">Standard</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="available">Available</SelectItem>
                                                <SelectItem value="disabled">Disabled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={createSeat.isPending}>
                            {createSeat.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Seat
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminSeatsPage() {
    const { id: venueId } = useParams();
    const { data: venue, isLoading: isVenueLoading } = useVenue(venueId || "");
    const { data: seatData, isLoading: isSeatsLoading } = useVenueSeats(venueId || "");
    const updateSeat = useUpdateSeat();
    const { toast } = useToast();

    const [isAddOpen, setIsAddOpen] = useState(false);

    const toggleSeatStatus = (seatId: string, currentStatus: string) => {
        const newStatus = currentStatus === "disabled" ? "available" : "disabled";
        updateSeat.mutate({ id: seatId, venueId: venueId!, status: newStatus }, {
            onSuccess: () => toast({ title: "Status Updated", description: `Seat marked as ${newStatus}.` }),
            onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
        });
    };

    const groupedSeats = useMemo(() => {
        if (!seatData?.seats) return {};
        return seatData.seats.reduce((acc, seat) => {
            const section = seat.section || "Uncategorized";
            if (!acc[section]) acc[section] = [];
            acc[section].push(seat);
            return acc;
        }, {} as Record<string, typeof seatData.seats>);
    }, [seatData]);

    if (isVenueLoading || isSeatsLoading) {
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
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/venues">
                        <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Manage Seats</h1>
                        <p className="text-muted-foreground mt-1">Configure seating capacity for {venue.name}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Seat
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Hash className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Displayed Seats</p>
                        <p className="text-2xl font-bold">{seatData?.seats?.length || 0}</p>
                    </div>
                </div>
                <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <Armchair className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Available Seats</p>
                        <p className="text-2xl font-bold">{seatData?.seats?.filter(s => s.status === "available").length || 0}</p>
                    </div>
                </div>
                <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
                        <Armchair className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Occupied/Reserved</p>
                        <p className="text-2xl font-bold">
                            {seatData?.seats?.filter(s => s.status === "occupied" || s.isReserved).length || 0}
                        </p>
                    </div>
                </div>
                <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <StopCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Disabled Seats</p>
                        <p className="text-2xl font-bold">{seatData?.seats?.filter(s => s.status === "disabled").length || 0}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {Object.keys(groupedSeats).length === 0 ? (
                    <div className="text-center p-12 bg-card rounded-xl border border-dashed text-muted-foreground">
                        <Armchair className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium text-foreground">No seats configured</p>
                        <p className="mt-1 mb-4">You haven't added any seats to this venue yet.</p>
                        <Button onClick={() => setIsAddOpen(true)} variant="outline">Add Your First Seat</Button>
                    </div>
                ) : (
                    Object.entries(groupedSeats).map(([section, seats]) => (
                        <div key={section} className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <div className="bg-muted/30 p-4 border-b flex items-center justify-between">
                                <h2 className="text-lg font-semibold">{section}</h2>
                                <Badge variant="secondary">{seats.length} Seats</Badge>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-wrap gap-4">
                                    {seats.map((seat) => {
                                        const isDisabled = seat.status === "disabled";
                                        const isOccupiedOrReserved = seat.status === "occupied" || seat.isReserved;

                                        let bgClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
                                        if (isDisabled) bgClass = "bg-muted border-muted-foreground/20 text-muted-foreground opacity-60";
                                        else if (isOccupiedOrReserved) bgClass = "bg-rose-500/10 border-rose-500/20 text-rose-700";

                                        return (
                                            <div
                                                key={seat.id}
                                                className={`group relative w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${bgClass}`}
                                            >
                                                <span className="font-bold">{seat.label}</span>

                                                {/* Status Toggle Overlay */}
                                                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg border">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary"
                                                        title={isDisabled ? "Enable Seat" : "Disable Seat"}
                                                        onClick={() => toggleSeatStatus(seat.id, seat.status)}
                                                        disabled={updateSeat.isPending}
                                                    >
                                                        {isDisabled ? <PlayCircle className="w-4 h-4" /> : <StopCircle className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AddSeatDialog venueId={venueId!} open={isAddOpen} onOpenChange={setIsAddOpen} />
        </AdminLayout>
    );
}
