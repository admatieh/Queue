import { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Search, Users, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export default function AdminUsersPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [newAdminName, setNewAdminName] = useState("");
    const [newAdminRole, setNewAdminRole] = useState("admin");
    const isSuperAdmin = user?.role === "super_admin";

    const { data, isLoading } = useQuery({
        queryKey: ["/api/admin/users", search],
        queryFn: async () => {
            const qs = search ? `?search=${encodeURIComponent(search)}` : "";
            const res = await fetch(`/api/admin/users${qs}`);
            if (!res.ok) throw new Error("Failed to fetch users");
            return (await res.json()) as { data: User[], total: number };
        },
        enabled: isSuperAdmin,
    });

    const createAdmin = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword, name: newAdminName, role: newAdminRole })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create admin');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "Admin Created", description: "Successfully added new administrator." });
            setIsAddOpen(false);
            setNewAdminEmail("");
            setNewAdminPassword("");
            setNewAdminName("");
            setNewAdminRole("admin");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    const deleteAdmin = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete user");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "User Disabled", description: "Admin access removed successfully." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
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

    return (
        <AdminLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Admins</h1>
                    <p className="text-muted-foreground mt-1">Add or remove system administrators and venue managers.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Add Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Administrator</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" placeholder="admin@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" placeholder="At least 8 characters" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} />
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={() => createAdmin.mutate()} disabled={createAdmin.isPending || !newAdminEmail || newAdminPassword.length < 8}>
                                {createAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Admin
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                ) : !data?.data || data.data.length === 0 ? (
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
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((admin) => (
                                    <TableRow key={(admin as any)._id || admin.id || admin.email}>
                                        <TableCell className="font-medium text-primary">{admin.email}</TableCell>
                                        <TableCell className="text-muted-foreground">{admin.name || "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={admin.role === "super_admin" ? "default" : "outline"} className="capitalize">
                                                {admin.role.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={admin.status === "active" ? "secondary" : "destructive"}>
                                                {admin.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" disabled>
                                                <Edit className="w-4 h-4 mr-2" /> Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                disabled={admin.id === user.id || admin.status === "disabled" || deleteAdmin.isPending}
                                                onClick={() => {
                                                    if (confirm(`Disable access for ${admin.email}?`)) {
                                                        deleteAdmin.mutate((admin as any)._id || admin.id)
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
