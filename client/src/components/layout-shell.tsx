import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, LogOut, Calendar, LayoutDashboard, Ticket } from "lucide-react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const navLink = (href: string, label: string) => {
    const active = href === "/" ? location === "/" || location === "/venues" : location.startsWith(href);
    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors duration-150 relative py-1 ${active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        {label}
        {active && (
          <span className="absolute -bottom-px left-0 right-0 h-px bg-primary rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="container px-4 md:px-8 flex h-16 items-center justify-between mx-auto max-w-7xl">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 bg-primary/10 border border-primary/30 rounded flex items-center justify-center transition-all group-hover:bg-primary/20">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg font-display font-bold tracking-tight text-foreground">
                QueueBuddy
              </span>
            </Link>

            {/* Desktop nav */}
            {user && (
              <nav className="hidden md:flex items-center gap-7">
                {navLink("/venues", "Venues")}
                {navLink("/reservations", "My Reservations")}
                {isAdmin && navLink("/admin/venues", "Dashboard")}
              </nav>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full p-0 ring-1 ring-border hover:ring-primary/50 transition-all"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt={user.name || "User"}
                      />
                      <AvatarFallback className="bg-surface-raised text-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-card border-border shadow-card"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <p className="text-sm font-semibold text-foreground leading-none">{user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
                    {isAdmin && (
                      <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30 rounded px-1.5 py-0.5">
                        {user.role === "super_admin" ? "Super Admin" : "Admin"}
                      </span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild>
                    <Link href="/reservations" className="cursor-pointer flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      My Reservations
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/venues" className="cursor-pointer flex items-center gap-2 text-sm">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 text-sm"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-gold-glow"
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
