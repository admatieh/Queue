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
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                    <div className="deco-divider mb-2 w-32"><span>ADD SEAT</span></div>
                    <DialogTitle className="font-display text-xl text-foreground">Add New Seat</DialogTitle>
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

                        <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-gold-glow font-semibold" disabled={createSeat.isPending}>
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
                        <Button variant="outline" size="icon" className="border-border h-9 w-9">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="deco-divider w-40 mb-1"><span>SEAT MANAGEMENT</span></div>
                        <h1 className="text-3xl font-display font-bold text-foreground">Manage Seats</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Configure seating for {venue.name}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-primary text-primary-foreground shadow-gold-glow font-semibold">
                    <Plus className="w-4 h-4 mr-2" /> Add Seat
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Seats", value: seatData?.seats?.length || 0, icon: Hash, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Available", value: seatData?.seats?.filter(s => s.status === "available").length || 0, icon: Armchair, color: "text-status-available", bg: "bg-status-available/10" },
                    { label: "Occupied", value: seatData?.seats?.filter(s => s.status === "occupied" || s.isReserved).length || 0, icon: Armchair, color: "text-destructive", bg: "bg-destructive/10" },
                    { label: "Disabled", value: seatData?.seats?.filter(s => s.status === "disabled").length || 0, icon: StopCircle, color: "text-muted-foreground", bg: "bg-muted" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground label-caps">{label}</p>
                            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
                        </div>
                    </div>
                ))}
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
                        <div key={section} className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="bg-background/50 p-4 border-b border-border flex items-center justify-between">
                                <h2 className="text-sm font-semibold label-caps text-muted-foreground">{section}</h2>
                                <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">{seats.length} seats</Badge>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-wrap gap-4">
                                    {seats.map((seat) => {
                                        const isDisabled = seat.status === "disabled";
                                        const isOccupiedOrReserved = seat.status === "occupied" || seat.isReserved;

                                        let bgClass = "bg-status-available/10 border-status-available/30 text-status-available";
                                        if (isDisabled) bgClass = "bg-muted/30 border-border text-muted-foreground/50";
                                        else if (isOccupiedOrReserved) bgClass = "bg-destructive/10 border-destructive/20 text-destructive";

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
