import { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/queryClient";

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

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
            const res = await fetch(`/api/admin/audit-logs${qs}`, { headers: authHeaders() });
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
        if (action.includes("create")) return "bg-status-available/10 text-status-available border-status-available/30";
        if (action.includes("delete") || action.includes("disable")) return "bg-destructive/10 text-destructive border-destructive/30";
        if (action.includes("update") || action.includes("assign")) return "bg-primary/10 text-primary border-primary/30";
        return "bg-status-reserved/10 text-status-reserved border-status-reserved/30";
    };

    return (
        <AdminLayout>
            <div className="mb-8">
                <div className="deco-divider w-36 mb-2"><span>AUDIT LOGS</span></div>
                <h1 className="text-3xl font-display font-bold text-foreground">Audit Logs</h1>
                <p className="text-muted-foreground text-sm mt-1">Review all administrative actions across the platform.</p>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden ticket-notch">
                <div className="p-4 border-b border-border flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by action, type…" className="pl-9 bg-background border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <span className="text-xs label-caps text-muted-foreground">{data?.total ?? 0} entries</span>
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((log) => (
                                    <TableRow key={log._id} className="border-border hover:bg-white/[0.02] transition-colors">
                                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                                            {formatDate(log.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-foreground text-xs font-mono">
                                            {log.actorUserId?.email || (log.actorUserId?._id || "").substring(0, 8) + "..."}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground capitalize">{log.targetType}</span>
                                                {log.targetId && (
                                                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]">
                                                        {log.targetId}
                                                    </span>
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
        </AdminLayout>
    );
}
