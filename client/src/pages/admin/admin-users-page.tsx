import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Search, Users, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useAdminVenues } from "@/hooks/use-venues";

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
    const [promoteSearch, setPromoteSearch] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string>("none");
    const [promoteRole, setPromoteRole] = useState("admin");
    const [promoteVenueId, setPromoteVenueId] = useState<string>("none");

    // Edit Admin dialog
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [editStatus, setEditStatus] = useState<"active" | "disabled">("active");
    const [editVenueId, setEditVenueId] = useState<string>("none");

    // Venues list for assigning admins
    const { data: venuesData } = useAdminVenues();
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
            const res = await fetch(`/api/admin/users${qs}`, { credentials: "include" });
            if (!res.ok) throw new Error(await readError(res, "Failed to fetch admins"));
            return (await res.json()) as { data: User[]; total: number };
        },
        enabled: isSuperAdmin,
    });

    // All users list for promotion
    const { data: allUsers, isLoading: isLoadingUsers } = useQuery({
        queryKey: ["/api/admin/all-users", promoteSearch],
        queryFn: async () => {
            const qs = promoteSearch ? `?search=${encodeURIComponent(promoteSearch)}` : "";
            const res = await fetch(`/api/admin/all-users${qs}`, { credentials: "include" });
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
                credentials: "include",
                headers: { "Content-Type": "application/json" },
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
                credentials: "include",
                headers: { "Content-Type": "application/json" },
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
            setPromoteSearch("");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateAdmin = useMutation({
        mutationFn: async (payload: { id: string; status: "active" | "disabled"; venueId: string | null }) => {
            const res = await fetch(`/api/admin/users/${payload.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
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
                    <h1 className="text-3xl font-bold tracking-tight">Manage Admins</h1>
                    <p className="text-muted-foreground mt-1">
                        Create admins, promote users, assign venues, and enable/disable admin access.
                    </p>
                </div>

                <div className="flex gap-2">
                    {/* Promote User */}
                    <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Users className="w-4 h-4" /> Promote User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Promote a User to Admin</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Search Users</Label>
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={promoteSearch}
                                        onChange={(e) => setPromoteSearch(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Select User</Label>
                                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Choose a user"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— Select —</SelectItem>
                                            {(allUsers?.data || []).map((u: any) => (
                                                <SelectItem key={normalizeId(u)} value={normalizeId(u)}>
                                                    {u.email} {u.name ? `(${u.name})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={promoteRole} onValueChange={setPromoteRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Venue Admin</SelectItem>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Assign Venue (optional)</Label>
                                    <Select value={promoteVenueId} onValueChange={setPromoteVenueId}>
                                        <SelectTrigger>
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
                                    <p className="text-xs text-muted-foreground">
                                        If no venue is assigned, backend should block this admin from doing anything until assigned.
                                    </p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPromoteOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => promoteUser.mutate()} disabled={promoteUser.isPending || selectedUserId === "none"}>
                                    {promoteUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Promote
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Add Admin */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Add Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add Administrator</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        placeholder="At least 8 characters"
                                        value={newAdminPassword}
                                        onChange={(e) => setNewAdminPassword(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Name (Optional)</Label>
                                    <Input placeholder="John Doe" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Venue Admin</SelectItem>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Assign Venue (optional)</Label>
                                    <Select value={newAdminVenueId} onValueChange={setNewAdminVenueId}>
                                        <SelectTrigger>
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
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={() => createAdmin.mutate()}
                                    disabled={createAdmin.isPending || !newAdminEmail || newAdminPassword.length < 8}
                                >
                                    {createAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Admin
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-4 border-b flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-9 bg-muted/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Venue</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
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
                                        <TableRow key={adminId || admin.email}>
                                            <TableCell className="font-medium text-primary">{admin.email}</TableCell>
                                            <TableCell className="text-muted-foreground">{admin.name || "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant={admin.role === "super_admin" ? "default" : "outline"} className="capitalize">
                                                    {String(admin.role).replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {venueName}
                                                {!admin?.venueId && admin.role !== "super_admin" && (
                                                    <Badge variant="outline" className="ml-2 text-xs">No venue</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={admin.status === "active" ? "secondary" : "destructive"}>
                                                    {admin.status}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-right space-x-2">
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
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Admin</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <div className="text-sm text-muted-foreground">{editingAdmin?.email || "—"}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">active</SelectItem>
                                    <SelectItem value="disabled">disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Assigned Venue</Label>
                            <Select value={editVenueId} onValueChange={setEditVenueId}>
                                <SelectTrigger><SelectValue placeholder="Choose a venue" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No venue assigned</SelectItem>
                                    {venueOptions.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Venue Admins without a venue should be blocked from managing anything (enforce on backend).
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                const id = normalizeId(editingAdmin);
                                if (!id) return;
                                updateAdmin.mutate({
                                    id,
                                    status: editStatus,
                                    venueId: editVenueId === "none" ? null : editVenueId,
                                });
                            }}
                            disabled={!editingAdmin || updateAdmin.isPending}
                        >
                            {updateAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}