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

// Admin Pages (Assuming these are future implementations, redirecting to venues for now)

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/" component={VenuesPage} />
      <Route path="/venues" component={VenuesPage} />
      <Route path="/venues/:id" component={SeatMapPage} />
      <Route path="/reservations" component={ReservationsPage} />

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
