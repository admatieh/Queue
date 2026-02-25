import { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface AuditLog {
    _id: string;
    actorUserId: { _id: string; email: string; name?: string };
    action: string;
    targetId?: string;
    targetType: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    createdAt: string;
}

export default function AdminAuditLogsPage() {
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const isSuperAdmin = user?.role === "super_admin";

    const { data, isLoading } = useQuery({
        queryKey: ["/api/admin/audit-logs", search],
        queryFn: async () => {
            const qs = search ? `?search=${encodeURIComponent(search)}` : "";
            const res = await fetch(`/api/admin/audit-logs${qs}`);
            if (!res.ok) throw new Error("Failed to fetch audit logs");
            return (await res.json()) as { data: AuditLog[], total: number };
        },
        enabled: isSuperAdmin,
    });

    if (!isSuperAdmin) {
        return (
            <AdminLayout>
                <div className="p-12 text-center">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-bold">Super Admin Required</h2>
                    <p className="text-muted-foreground mt-2">You do not have permission to view system audit logs.</p>
                </div>
            </AdminLayout>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionColor = (action: string) => {
        if (action.includes("create")) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
        if (action.includes("delete") || action.includes("disable")) return "bg-rose-500/10 text-rose-700 border-rose-500/20";
        if (action.includes("update")) return "bg-amber-500/10 text-amber-700 border-amber-500/20";
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    };

    return (
        <AdminLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground mt-1">Review system activities and administrative actions.</p>
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-4 border-b flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by action, resource type..."
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
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No audit logs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Admin ID</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Resource</TableHead>
                                    <TableHead>IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((log) => (
                                    <TableRow key={log._id}>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {formatDate(log.createdAt)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {log.actorUserId?.email || (log.actorUserId?._id || "").substring(0, 8) + "..."}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium capitalize">{log.targetType}</span>
                                                {log.targetId && (
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                                                        {log.targetId}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs font-mono">
                                            {log.ipAddress || "—"}
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
