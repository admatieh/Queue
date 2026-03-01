import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import VenuesPage from "@/pages/venues-page";
import SeatMapPage from "@/pages/seat-map-page";
import ReservationsPage from "@/pages/reservations-page";
import { NotificationListener } from "@/components/NotificationListener";
import AdminVenuesPage from "@/pages/admin/admin-venues-page";
import AdminVenueEditPage from "@/pages/admin/admin-venue-edit-page";
import AdminSeatsPage from "@/pages/admin/admin-seats-page";
import AdminUsersPage from "@/pages/admin/admin-users-page";
import AdminAuditLogsPage from "@/pages/admin/admin-audit-logs-page";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/" component={VenuesPage} />
      <Route path="/venues" component={VenuesPage} />
      <Route path="/venues/:id" component={SeatMapPage} />
      <Route path="/reservations" component={ReservationsPage} />

      {/* Admin Routes */}
      <Route path="/admin/venues" component={AdminVenuesPage} />
      <Route path="/admin/venues/:id" component={AdminVenueEditPage} />
      <Route path="/admin/venues/:id/seats" component={AdminSeatsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/audit-logs" component={AdminAuditLogsPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <Toaster  />

        {/* 🔔 ADD IT HERE */}
        <NotificationListener />

        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
