import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Users, Building2, ShieldCheck, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logoutMutation, isLoading } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
                <div className="w-16 h-16 bg-card border border-border rounded-lg flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6 text-sm">Administrator credentials required.</p>
                <Link href="/"><Button className="bg-primary text-primary-foreground">Return to Home</Button></Link>
            </div>
        );
    }

    const isSuperAdmin = user.role === "super_admin";

    const navLinks = [
        { href: "/admin/venues", label: "Venues", icon: Building2 },
        ...(isSuperAdmin
            ? [
                { href: "/admin/users", label: "Admin Users", icon: Users },
                { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
            ]
            : []),
    ];

    const initials = user.name
        ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : user.email?.slice(0, 2).toUpperCase() || "A";

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar */}
            <aside className="hidden md:flex w-60 flex-col border-r border-border bg-[hsl(220_18%_7%)] sticky top-0 h-screen">
                {/* Logo */}
                <div className="p-5 border-b border-border flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-display font-bold text-foreground tracking-tight">QueueAdmin</span>
                </div>

                {/* Role badge */}
                <div className="px-5 py-3 border-b border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30 rounded px-2 py-0.5">
                        {isSuperAdmin ? "Super Admin" : "Admin"}
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const active = location.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all duration-150",
                                    active
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {label}
                                {active && <span className="ml-auto w-1 h-4 bg-primary rounded-full" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-foreground truncate">{user.name || user.email}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Link href="/">
                            <Button variant="outline" size="sm" className="w-full border-border text-muted-foreground hover:text-foreground text-xs">
                                <Home className="w-3.5 h-3.5 mr-1.5" /> App
                            </Button>
                        </Link>
                        <Button
                            variant="ghost" size="sm"
                            className="w-full text-destructive hover:bg-destructive/10 text-xs"
                            onClick={() => logoutMutation.mutate()}
                            disabled={logoutMutation.isPending}
                        >
                            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0 flex flex-col">
                {/* Mobile header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10">
                    <span className="font-display font-bold text-primary">QueueAdmin</span>
                    <div className="flex gap-2">
                        <Link href="/"><Button variant="ghost" size="icon"><Home className="w-5 h-5" /></Button></Link>
                        <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}><LogOut className="w-5 h-5" /></Button>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
