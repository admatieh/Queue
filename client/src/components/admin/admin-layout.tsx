import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Users, Building, ShieldCheck, Loader2 } from "lucide-react";
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
                <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">You must be an administrator to view this page.</p>
                <Link href="/">
                    <Button>Return to Home</Button>
                </Link>
            </div>
        );
    }

    const isSuperAdmin = user.role === "super_admin";

    const navLinks = [
        { href: "/admin/venues", label: "Manage Venues", icon: Building },
        ...(isSuperAdmin
            ? [
                { href: "/admin/users", label: "Admin Users", icon: Users },
                { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
            ]
            : []),
    ];

    return (
        <div className="min-h-screen flex bg-muted/30">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r bg-background flex flex-col hidden md:flex min-h-screen sticky top-0">
                <div className="p-6 border-b flex items-center justify-between">
                    <Link href="/admin/venues" className="text-xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent cursor-pointer font-display">
                        QueueAdmin
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href} className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}>
                                <Icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t space-y-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || "A"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                            <p className="text-xs text-muted-foreground uppercase">{user.role}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Link href="/">
                            <Button variant="outline" size="sm" className="w-full" title="Back to App">
                                <Home className="w-4 h-4 mr-2" /> App
                            </Button>
                        </Link>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            disabled={logoutMutation.isPending}
                            onClick={() => logoutMutation.mutate()}
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 min-h-screen">
                <header className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                    {/* Mobile header can be simpler, just a home button and logout */}
                    <span className="font-bold text-lg text-primary">QueueAdmin</span>
                    <div className="flex gap-2">
                        <Link href="/">
                            <Button variant="ghost" size="icon"><Home className="w-5 h-5" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}><LogOut className="w-5 h-5" /></Button>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
