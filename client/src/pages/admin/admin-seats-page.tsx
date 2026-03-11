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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Hash, Armchair, StopCircle, PlayCircle, Pencil, Wand2, RefreshCw, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/queryClient";
import { api } from "@shared/routes";

function authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

/* ── Add Seat Dialog ──────────────────────────────────────────────────────── */
function AddSeatDialog({ venueId, open, onOpenChange }: { venueId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
    const createSeat = useCreateSeat();
    const { toast } = useToast();
    const form = useForm<Omit<InsertSeat, "venueId">>({
        resolver: zodResolver(insertSeatSchema.omit({ venueId: true })),
        defaultValues: { label: "", section: "", locationDescription: "", status: "available", type: "standard" }
    });
    const onSubmit = (data: Omit<InsertSeat, "venueId">) => {
        createSeat.mutate({ venueId, ...data }, {
            onSuccess: () => { toast({ title: "Seat Added" }); onOpenChange(false); form.reset(); },
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
                            <FormField control={form.control} name="label" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Label</FormLabel>
                                    <FormControl><Input placeholder="A1" {...field} className="bg-background border-border" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="section" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Section</FormLabel>
                                    <FormControl><Input placeholder="Main" {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="locationDescription" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="label-caps">Location Hint</FormLabel>
                                <FormControl><Input placeholder="Near the window" {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="premium">Premium</SelectItem>
                                            <SelectItem value="accessible">Accessible</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-gold-glow font-semibold" disabled={createSeat.isPending}>
                            {createSeat.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Seat
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/* ── Edit Seat Dialog ─────────────────────────────────────────────────────── */
function EditSeatDialog({ seat, venueId, open, onOpenChange }: { seat: any; venueId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
    const updateSeat = useUpdateSeat();
    const { toast } = useToast();
    const form = useForm<Omit<InsertSeat, "venueId">>({
        resolver: zodResolver(insertSeatSchema.omit({ venueId: true })),
        values: {
            label: seat?.label || "",
            section: seat?.section || "",
            locationDescription: seat?.locationDescription || "",
            type: seat?.type || "standard",
            status: seat?.status === "occupied" ? "available" : (seat?.status || "available"),
        }
    });
    const onSubmit = (data: Omit<InsertSeat, "venueId">) => {
        updateSeat.mutate({ id: seat.id, venueId, ...data }, {
            onSuccess: () => { toast({ title: "Seat Updated" }); onOpenChange(false); },
            onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                    <div className="deco-divider mb-2 w-32"><span>EDIT SEAT</span></div>
                    <DialogTitle className="font-display text-xl text-foreground">Edit Seat</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="label" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Label</FormLabel>
                                    <FormControl><Input {...field} className="bg-background border-border" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="section" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Section</FormLabel>
                                    <FormControl><Input placeholder="e.g. Main, VIP, Window" {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="locationDescription" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="label-caps">Location Hint</FormLabel>
                                <FormControl><Input placeholder="Near the window" {...field} value={field.value || ""} className="bg-background border-border" /></FormControl>
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Type / Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="premium">Premium</SelectItem>
                                            <SelectItem value="accessible">Accessible</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="label-caps">Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
                            <Button type="submit" className="bg-primary text-primary-foreground shadow-gold-glow font-semibold" disabled={updateSeat.isPending}>
                                {updateSeat.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/* ── Bulk Rename Dialog ───────────────────────────────────────────────────── */
const NAMING_PATTERNS = [
    { id: "seat_n", label: "Seat 1, Seat 2, Seat 3…", description: "Simple numbered seats" },
    { id: "letter_num", label: "A1, A2… B1, B2…", description: "Row letter + column number" },
    { id: "prefix_n", label: "Custom prefix + number", description: "E.g. VIP-1, VIP-2…" },
    { id: "section_n", label: "Section name + number", description: "E.g. Main-1, Window-3…" },
];

function BulkRenameDialog({ seats, venueId, open, onOpenChange }: { seats: any[]; venueId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [pattern, setPattern] = useState("seat_n");
    const [prefix, setPrefix] = useState("");
    const [colsPerRow, setColsPerRow] = useState(10);
    const [startNum, setStartNum] = useState(1);
    const [filterSection, setFilterSection] = useState("__all__");
    const [isSaving, setIsSaving] = useState(false);

    // Unique sections
    const sections = useMemo(() => {
        const s = new Set(seats.map(s => s.section || "Uncategorized"));
        return ["__all__", ...Array.from(s)];
    }, [seats]);

    // Which seats to rename
    const targetSeats = useMemo(() => {
        if (filterSection === "__all__") return seats;
        return seats.filter(s => (s.section || "Uncategorized") === filterSection);
    }, [seats, filterSection]);

    // Preview new labels
    const previews: string[] = useMemo(() => {
        return targetSeats.map((_, i) => {
            const n = startNum + i;
            if (pattern === "seat_n") return `Seat ${n}`;
            if (pattern === "letter_num") {
                const row = String.fromCharCode(65 + Math.floor(i / colsPerRow));
                const col = (i % colsPerRow) + 1;
                return `${row}${col}`;
            }
            if (pattern === "prefix_n") return `${prefix || "Seat"}-${n}`;
            if (pattern === "section_n") {
                const sec = targetSeats[i]?.section || "Seat";
                return `${sec}-${n}`;
            }
            return `Seat ${n}`;
        });
    }, [targetSeats, pattern, prefix, colsPerRow, startNum]);

    const handleApply = async () => {
        if (targetSeats.length === 0) return;
        setIsSaving(true);
        try {
            await Promise.all(
                targetSeats.map((seat, i) =>
                    fetch(`/api/admin/seats/${seat.id}`, {
                        method: "PUT",
                        headers: authHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ label: previews[i] }),
                    })
                )
            );
            qc.invalidateQueries({ queryKey: [api.venues.getSeats.path, venueId] });
            toast({ title: "Seats renamed", description: `${targetSeats.length} seat labels updated.` });
            onOpenChange(false);
        } catch {
            toast({ title: "Error", description: "Some seats failed to rename.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                    <div className="deco-divider mb-2 w-40"><span>BULK RENAME</span></div>
                    <DialogTitle className="font-display text-xl text-foreground">Auto-Generate Seat Names</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-2">
                    {/* Filter by section */}
                    <div className="space-y-1.5">
                        <Label className="label-caps">Apply to</Label>
                        <Select value={filterSection} onValueChange={setFilterSection}>
                            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="__all__">All seats ({seats.length})</SelectItem>
                                {sections.slice(1).map(s => (
                                    <SelectItem key={s} value={s}>Section: {s} ({seats.filter(x => (x.section || "Uncategorized") === s).length})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pattern picker */}
                    <div className="space-y-1.5">
                        <Label className="label-caps">Naming Pattern</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {NAMING_PATTERNS.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPattern(p.id)}
                                    className={`text-left px-4 py-3 rounded-lg border transition-all ${pattern === p.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                                >
                                    <div className="font-semibold text-sm">{p.label}</div>
                                    <div className="text-xs opacity-60 mt-0.5">{p.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pattern-specific options */}
                    {pattern === "letter_num" && (
                        <div className="space-y-1.5">
                            <Label className="label-caps">Seats per row</Label>
                            <Input type="number" value={colsPerRow} min={1} max={50} onChange={e => setColsPerRow(parseInt(e.target.value) || 10)} className="bg-background border-border" />
                        </div>
                    )}
                    {pattern === "prefix_n" && (
                        <div className="space-y-1.5">
                            <Label className="label-caps">Prefix</Label>
                            <Input placeholder="VIP" value={prefix} onChange={e => setPrefix(e.target.value)} className="bg-background border-border" />
                        </div>
                    )}
                    {(pattern === "seat_n" || pattern === "prefix_n") && (
                        <div className="space-y-1.5">
                            <Label className="label-caps">Start number</Label>
                            <Input type="number" value={startNum} min={1} onChange={e => setStartNum(parseInt(e.target.value) || 1)} className="bg-background border-border" />
                        </div>
                    )}

                    {/* Preview */}
                    {previews.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="label-caps">Preview ({targetSeats.length} seats)</Label>
                            <div className="bg-background border border-border rounded-lg p-3 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                {previews.slice(0, 24).map((label, i) => (
                                    <span key={i} className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">{label}</span>
                                ))}
                                {previews.length > 24 && (
                                    <span className="text-[11px] text-muted-foreground self-center">+{previews.length - 24} more…</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
                    <Button onClick={handleApply} disabled={isSaving || targetSeats.length === 0} className="bg-primary text-primary-foreground shadow-gold-glow font-semibold">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Apply to {targetSeats.length} seats
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function AdminSeatsPage() {
    const { id: venueId } = useParams();
    const { data: venue, isLoading: isVenueLoading } = useVenue(venueId || "");
    const { data: seatData, isLoading: isSeatsLoading } = useVenueSeats(venueId || "");
    const updateSeat = useUpdateSeat();
    const { toast } = useToast();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [editingSeat, setEditingSeat] = useState<any>(null);
    const [renamingSection, setRenamingSection] = useState<string | null>(null);
    const [newSectionName, setNewSectionName] = useState("");
    const [isSavingSection, setIsSavingSection] = useState(false);

    const handleRenameSection = async (oldName: string, seats: any[]) => {
        const trimmed = newSectionName.trim();
        if (!trimmed || trimmed === oldName) { setRenamingSection(null); return; }
        setIsSavingSection(true);
        try {
            await Promise.all(
                seats.map(seat =>
                    fetch(`/api/admin/seats/${seat.id}`, {
                        method: "PUT",
                        headers: authHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ section: trimmed }),
                    })
                )
            );
            qc.invalidateQueries({ queryKey: [api.venues.getSeats.path, venueId] });
            toast({ title: "Section renamed", description: `"${oldName}" → "${trimmed}"` });
        } catch {
            toast({ title: "Error", description: "Failed to rename section.", variant: "destructive" });
        } finally {
            setIsSavingSection(false);
            setRenamingSection(null);
        }
    };

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

    const qc = useQueryClient();

    const TYPE_BADGE: Record<string, string> = {
        premium: "bg-primary/10 text-primary border-primary/30",
        accessible: "bg-blue-500/10 text-blue-400 border-blue-400/30",
        standard: "",
    };

    if (isVenueLoading || isSeatsLoading) return (
        <AdminLayout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>
    );

    if (!venue) return (
        <AdminLayout><div className="p-12 text-center text-muted-foreground">Venue not found</div></AdminLayout>
    );

    const allSeats = seatData?.seats || [];

    return (
        <AdminLayout>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Link href="/admin/venues">
                        <Button variant="outline" size="icon" className="border-border h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
                    </Link>
                    <div>
                        <div className="deco-divider w-40 mb-1"><span>SEAT MANAGEMENT</span></div>
                        <h1 className="text-3xl font-display font-bold text-foreground">Manage Seats</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Configure seating for {venue.name}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-border gap-2" onClick={() => setIsBulkOpen(true)} disabled={allSeats.length === 0}>
                        <Wand2 className="w-4 h-4" /> Bulk Rename
                    </Button>
                    <Button onClick={() => setIsAddOpen(true)} className="bg-primary text-primary-foreground shadow-gold-glow font-semibold">
                        <Plus className="w-4 h-4 mr-2" /> Add Seat
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Seats", value: allSeats.length, icon: Hash, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Available", value: allSeats.filter(s => s.status === "available" && !s.isReserved).length, icon: Armchair, color: "text-status-available", bg: "bg-status-available/10" },
                    { label: "Occupied", value: allSeats.filter(s => s.status === "occupied" || s.isReserved).length, icon: Armchair, color: "text-destructive", bg: "bg-destructive/10" },
                    { label: "Disabled", value: allSeats.filter(s => s.status === "disabled").length, icon: StopCircle, color: "text-muted-foreground", bg: "bg-muted" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground label-caps">{label}</p>
                            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Seat grid grouped by section */}
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
                                {renamingSection === section ? (
                                    <form
                                        className="flex items-center gap-2 flex-1"
                                        onSubmit={e => { e.preventDefault(); handleRenameSection(section, seats); }}
                                    >
                                        <Input
                                            autoFocus
                                            value={newSectionName}
                                            onChange={e => setNewSectionName(e.target.value)}
                                            className="h-7 text-xs bg-background border-border py-0 px-2 max-w-[200px]"
                                        />
                                        <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-status-available hover:bg-status-available/10" disabled={isSavingSection}>
                                            {isSavingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        </Button>
                                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => setRenamingSection(null)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </form>
                                ) : (
                                    <button
                                        className="flex items-center gap-2 group/section"
                                        onClick={() => { setRenamingSection(section); setNewSectionName(section); }}
                                        title="Click to rename section"
                                    >
                                        <h2 className="text-sm font-semibold label-caps text-muted-foreground group-hover/section:text-foreground transition-colors">{section}</h2>
                                        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/section:opacity-100 transition-opacity" />
                                    </button>
                                )}
                                <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">{seats.length} seats</Badge>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-wrap gap-3">
                                    {seats.map((seat) => {
                                        const isDisabled = seat.status === "disabled";
                                        const isOccupied = seat.status === "occupied" || seat.isReserved;
                                        const typeBadge = TYPE_BADGE[seat.type as string] || "";

                                        let bgClass = "bg-status-available/10 border-status-available/30 text-status-available";
                                        if (isDisabled) bgClass = "bg-muted/30 border-border text-muted-foreground/50";
                                        else if (isOccupied) bgClass = "bg-destructive/10 border-destructive/20 text-destructive";

                                        return (
                                            <div
                                                key={seat.id}
                                                className={`group relative w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${bgClass}`}
                                            >
                                                <span className="font-bold text-sm leading-tight text-center px-1 truncate w-full text-center">{seat.label}</span>
                                                {seat.type && seat.type !== "standard" && (
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${typeBadge || "bg-muted text-muted-foreground border-border"}`}>
                                                        {seat.type}
                                                    </span>
                                                )}

                                                {/* Hover overlay with edit + toggle */}
                                                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 shadow-lg border border-border">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-primary hover:bg-primary/20"
                                                        title="Edit seat"
                                                        onClick={() => setEditingSeat(seat)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:bg-muted"
                                                        title={isDisabled ? "Enable Seat" : "Disable Seat"}
                                                        onClick={() => toggleSeatStatus(seat.id, seat.status)}
                                                        disabled={updateSeat.isPending}
                                                    >
                                                        {isDisabled ? <PlayCircle className="w-3.5 h-3.5 text-status-available" /> : <StopCircle className="w-3.5 h-3.5" />}
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
            {editingSeat && (
                <EditSeatDialog
                    seat={editingSeat}
                    venueId={venueId!}
                    open={!!editingSeat}
                    onOpenChange={(v) => { if (!v) setEditingSeat(null); }}
                />
            )}
            {isBulkOpen && (
                <BulkRenameDialog
                    seats={allSeats}
                    venueId={venueId!}
                    open={isBulkOpen}
                    onOpenChange={setIsBulkOpen}
                />
            )}
        </AdminLayout>
    );
}
