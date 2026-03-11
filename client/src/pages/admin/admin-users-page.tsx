import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Plus, Edit, Search, Users, ShieldCheck, Ban, CheckCircle2, ChevronsUpDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useAdminVenues } from "@/hooks/use-venues";
import { getToken } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

function normalizeId(u: any) {
    return u?._id || u?.id;
}

async function readError(res: Response, fallback: string) {
    if (res.ok) return fallback;
    try {
        const j = await res.json();
        return j?.message || j?.error || fallback;
    } catch {
        return fallback;
    }
}

export default function AdminUsersPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isSuperAdmin = user?.role === "super_admin";

    const [search, setSearch] = useState("");

    // Add Admin dialog
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [newAdminName, setNewAdminName] = useState("");
    const [newAdminRole, setNewAdminRole] = useState("admin");
    const [newAdminVenueId, setNewAdminVenueId] = useState<string>("none");

    // Promote User dialog
    const [isPromoteOpen, setIsPromoteOpen] = useState(false);
    const [promoteComboOpen, setPromoteComboOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>("none");
    const [promoteRole, setPromoteRole] = useState("admin");
    const [promoteVenueId, setPromoteVenueId] = useState<string>("none");

    // Edit Admin dialog
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [editStatus, setEditStatus] = useState<"active" | "disabled">("active");
    const [editVenueId, setEditVenueId] = useState<string>("none");

    // Venues list for assigning admins
    const { data: venuesData } = useAdminVenues(user);
    const venueOptions = useMemo(() => {
        const list = (venuesData || []).map((v: any) => ({ id: v.id, name: v.name, status: v.status, active: v.active }));
        // hide disabled venues from selection (optional)
        return list.filter((v) => v.status !== "disabled" && v.active !== false);
    }, [venuesData]);

    // Admin list
    const { data, isLoading } = useQuery({
        queryKey: ["/api/admin/users", search],
        queryFn: async () => {
            const qs = search ? `?search=${encodeURIComponent(search)}` : "";
            const res = await fetch(`/api/admin/users${qs}`, { headers: authHeaders() });
            if (!res.ok) throw new Error(await readError(res, "Failed to fetch admins"));
            return (await res.json()) as { data: User[]; total: number };
        },
        enabled: isSuperAdmin,
    });

    // All users list for promotion (loaded once when dialog opens, filtered client-side)
    const { data: allUsers, isLoading: isLoadingUsers } = useQuery({
        queryKey: ["/api/admin/all-users"],
        queryFn: async () => {
            const res = await fetch(`/api/admin/all-users`, { headers: authHeaders() });
            if (!res.ok) throw new Error(await readError(res, "Failed to fetch users"));
            return (await res.json()) as { data: User[]; total: number };
        },
        enabled: isSuperAdmin && isPromoteOpen,
    });

    const createAdmin = useMutation({
        mutationFn: async () => {
            const payload: any = {
                email: newAdminEmail,
                password: newAdminPassword,
                name: newAdminName,
                role: newAdminRole,
            };
            if (newAdminVenueId !== "none") payload.venueId = newAdminVenueId;

            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(await readError(res, "Failed to create admin"));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "Admin Created", description: "Successfully added new administrator." });
            setIsAddOpen(false);
            setNewAdminEmail("");
            setNewAdminPassword("");
            setNewAdminName("");
            setNewAdminRole("admin");
            setNewAdminVenueId("none");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const promoteUser = useMutation({
        mutationFn: async () => {
            if (selectedUserId === "none") throw new Error("Please select a user.");

            const payload: any = { userId: selectedUserId, role: promoteRole };
            if (promoteVenueId !== "none") payload.venueId = promoteVenueId;

            const res = await fetch("/api/admin/users/promote", {
                method: "POST",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(await readError(res, "Failed to promote user"));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "Success", description: "User promoted to admin." });
            setIsPromoteOpen(false);
            setSelectedUserId("none");
            setPromoteRole("admin");
            setPromoteVenueId("none");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateAdmin = useMutation({
        mutationFn: async (payload: { id: string; status: "active" | "disabled"; venueId: string | null }) => {
            const res = await fetch(`/api/admin/users/${payload.id}`, {
                method: "PATCH",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status: payload.status, venueId: payload.venueId }),
            });

            if (!res.ok) throw new Error(await readError(res, "Failed to update admin"));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "Updated", description: "Admin updated successfully." });
            setIsEditOpen(false);
            setEditingAdmin(null);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    if (!isSuperAdmin) {
        return (
            <AdminLayout>
                <div className="p-12 text-center">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-bold">Super Admin Required</h2>
                    <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
                </div>
            </AdminLayout>
        );
    }

    const admins = data?.data || [];

    return (
        <AdminLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="deco-divider w-36 mb-2"><span>ADMIN USERS</span></div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Manage Admins</h1>
                    <p className="text-muted-foreground text-sm mt-1">Create admins, assign venues, and control access.</p>
                </div>

                <div className="flex gap-2">
                    {/* Promote User */}
                    <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 border-border">
                                <Users className="w-4 h-4" /> Promote User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg bg-card border-border shadow-card">
                            <DialogHeader>
                                <div className="deco-divider mb-2 w-40"><span>PROMOTE USER</span></div>
                                <DialogTitle className="font-display text-xl text-foreground">Promote User to Admin</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="label-caps">Select User</label>
                                    <Popover open={promoteComboOpen} onOpenChange={setPromoteComboOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={promoteComboOpen}
                                                className="w-full justify-between bg-background border-border font-normal"
                                            >
                                                {isLoadingUsers
                                                    ? "Loading..."
                                                    : selectedUserId !== "none"
                                                        ? (() => {
                                                            const u = (allUsers?.data || []).find((u: any) => normalizeId(u) === selectedUserId) as any;
                                                            return u ? `${u.email}${u.name ? ` (${u.name})` : ""}` : "Choose a user";
                                                        })()
                                                        : "Choose a user"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0 bg-card border-border" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search by name or email..." className="h-9" />
                                                <CommandList>
                                                    <CommandEmpty>No users found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {(allUsers?.data || []).map((u: any) => (
                                                            <CommandItem
                                                                key={normalizeId(u)}
                                                                value={`${u.email} ${u.name || ""}`}
                                                                onSelect={() => {
                                                                    setSelectedUserId(normalizeId(u));
                                                                    setPromoteComboOpen(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", selectedUserId === normalizeId(u) ? "opacity-100" : "opacity-0")} />
                                                                {u.email}{u.name ? ` (${u.name})` : ""}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <label className="label-caps">Role</label>
                                    <Select value={promoteRole} onValueChange={setPromoteRole}>
                                        <SelectTrigger className="bg-background border-border">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Venue Admin</SelectItem>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="label-caps">Assign Venue (optional)</label>
                                    <Select value={promoteVenueId} onValueChange={setPromoteVenueId}>
                                        <SelectTrigger className="bg-background border-border">
                                            <SelectValue placeholder="Choose a venue (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No venue assigned</SelectItem>
                                            {venueOptions.map((v) => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Venue Admins must have an assignment to access the dashboard.</p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPromoteOpen(false)} className="border-border">Cancel</Button>
                                <Button onClick={() => promoteUser.mutate()} disabled={promoteUser.isPending || selectedUserId === "none"} className="bg-primary text-primary-foreground font-semibold shadow-gold-glow">
                                    {promoteUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Promote
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Add Admin */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-primary text-primary-foreground shadow-gold-glow font-semibold">
                                <Plus className="w-4 h-4" /> Add Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg bg-card border-border shadow-card">
                            <DialogHeader>
                                <div className="deco-divider mb-2 w-36"><span>NEW ADMIN</span></div>
                                <DialogTitle className="font-display text-xl text-foreground">Add Administrator</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="label-caps">Email</label>
                                    <Input type="email" placeholder="admin@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="bg-background border-border" />
                                </div>

                                <div className="space-y-2">
                                    <label className="label-caps">Password</label>
                                    <Input type="password" placeholder="At least 8 characters" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className="bg-background border-border" />
                                </div>

                                <div className="space-y-2">
                                    <label className="label-caps">Name (Optional)</label>
                                    <Input placeholder="John Doe" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="bg-background border-border" />
                                </div>

                                <div className="space-y-2">
                                    <label className="label-caps">Role</label>
                                    <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                                        <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select a role" /></SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="admin">Venue Admin</SelectItem>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="label-caps">Assign Venue</label>
                                    <Select value={newAdminVenueId} onValueChange={setNewAdminVenueId}>
                                        <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Choose a venue (optional)" /></SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="none">No venue assigned</SelectItem>
                                            {venueOptions.map((v) => (
                                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-border">Cancel</Button>
                                <Button onClick={() => createAdmin.mutate()} disabled={createAdmin.isPending || !newAdminEmail || newAdminPassword.length < 8} className="bg-primary text-primary-foreground font-semibold shadow-gold-glow">
                                    {createAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Admin
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden ticket-notch">
                <div className="p-4 border-b border-border flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by name or email..." className="pl-9 bg-background border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : admins.length === 0 ? (
                    <div className="p-16 text-center text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No admins found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="label-caps text-muted-foreground">Email</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Name</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Role</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Venue</TableHead>
                                    <TableHead className="label-caps text-muted-foreground">Status</TableHead>
                                    <TableHead className="label-caps text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map((admin: any) => {
                                    const adminId = normalizeId(admin);
                                    const venueName =
                                        admin?.venueId
                                            ? venueOptions.find((v) => v.id === admin.venueId)?.name || "Assigned"
                                            : "—";

                                    return (
                                        <TableRow key={adminId || admin.email} className="border-border hover:bg-white/[0.02] transition-colors">
                                            <TableCell className="font-medium text-foreground text-sm">{admin.email}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{admin.name || "—"}</TableCell>
                                            <TableCell>
                                                <Badge className={`text-[10px] font-bold uppercase tracking-wider ${admin.role === "super_admin"
                                                    ? "bg-primary/10 text-primary border-primary/30"
                                                    : "bg-card border-border text-muted-foreground"
                                                    }`}>
                                                    {String(admin.role).replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {venueName}
                                                {!admin?.venueId && admin.role !== "super_admin" && (
                                                    <Badge className="ml-2 text-[10px] bg-status-reserved/10 text-status-reserved border-status-reserved/30">No venue</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`text-[10px] font-bold uppercase tracking-wider ${admin.status === "active"
                                                    ? "bg-status-available/10 text-status-available border-status-available/30"
                                                    : "bg-destructive/10 text-destructive border-destructive/30"
                                                    }`}>
                                                    {admin.status}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-right space-x-2">
                                                {admin.role !== "super_admin" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hidden sm:inline-flex"
                                                        onClick={() => {
                                                            setEditingAdmin(admin);
                                                            setEditStatus((admin.status || "active") as any);
                                                            setEditVenueId(admin.venueId || "none");
                                                            setIsEditOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" /> Edit
                                                    </Button>
                                                )}

                                                {admin.role !== "super_admin" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="hidden sm:inline-flex"
                                                        disabled={adminId === user?.id || updateAdmin.isPending}
                                                        onClick={() => {
                                                            const next = admin.status === "active" ? "disabled" : "active";
                                                            updateAdmin.mutate({ id: adminId, status: next, venueId: admin.venueId || null });
                                                        }}
                                                    >
                                                        {admin.status === "active" ? (
                                                            <>
                                                                <Ban className="w-4 h-4 mr-2" /> Disable
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Enable
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Edit Admin Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg bg-card border-border shadow-card">
                    <DialogHeader>
                        <div className="deco-divider mb-2 w-32"><span>EDIT ADMIN</span></div>
                        <DialogTitle className="font-display text-xl text-foreground">Edit Admin</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <label className="label-caps">Email</label>
                            <div className="text-sm text-foreground">{editingAdmin?.email || "—"}</div>
                        </div>

                        <div className="space-y-2">
                            <label className="label-caps">Status</label>
                            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="label-caps">Assigned Venue</label>
                            <Select value={editVenueId} onValueChange={setEditVenueId}>
                                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Choose a venue" /></SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="none">No venue assigned</SelectItem>
                                    {venueOptions.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Venue Admins without a venue cannot access the dashboard.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-border">Cancel</Button>
                        <Button onClick={() => { const id = normalizeId(editingAdmin); if (!id) return; updateAdmin.mutate({ id, status: editStatus, venueId: editVenueId === "none" ? null : editVenueId }); }} disabled={!editingAdmin || updateAdmin.isPending} className="bg-primary text-primary-foreground shadow-gold-glow font-semibold">
                            {updateAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}