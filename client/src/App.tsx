import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminProperties from "@/pages/admin/properties";
import AdminManagers from "@/pages/admin/managers";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";

import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerProperties from "@/pages/manager/properties";
import ManagerUnits from "@/pages/manager/units";
import ManagerTenants from "@/pages/manager/tenants";
import ManagerLeases from "@/pages/manager/leases";
import ManagerPayments from "@/pages/manager/payments";
import ManagerMaintenance from "@/pages/manager/maintenance";
import ManagerReports from "@/pages/manager/reports";
import ManagerMessages from "@/pages/manager/messages";

import TenantDashboard from "@/pages/tenant/dashboard";
import TenantLease from "@/pages/tenant/lease";
import TenantPayments from "@/pages/tenant/payments";
import TenantMaintenance from "@/pages/tenant/maintenance";
import TenantMessages from "@/pages/tenant/messages";

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background" data-testid="loading-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ 
  component: Component, 
  allowedRoles 
}: { 
  component: React.ComponentType; 
  allowedRoles?: string[];
}) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const hasAccess = isAuthenticated && user && (!allowedRoles || allowedRoles.includes(user.role));
  const shouldRedirectToLogin = !isAuthenticated;
  const shouldRedirectToRoleDashboard = isAuthenticated && user && allowedRoles && !allowedRoles.includes(user.role);

  useEffect(() => {
    if (shouldRedirectToLogin) {
      setLocation("/login");
    } else if (shouldRedirectToRoleDashboard && user) {
      setLocation(`/${user.role}`);
    }
  }, [shouldRedirectToLogin, shouldRedirectToRoleDashboard, user, setLocation]);

  if (!hasAccess) {
    return <LoadingScreen />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      <Route path="/">
        {isAuthenticated && user ? (
          <Redirect to={`/${user.role}`} />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} />
      </Route>
      <Route path="/admin/properties">
        <ProtectedRoute component={AdminProperties} allowedRoles={["admin"]} />
      </Route>
      <Route path="/admin/managers">
        <ProtectedRoute component={AdminManagers} allowedRoles={["admin"]} />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReports} allowedRoles={["admin"]} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} allowedRoles={["admin"]} />
      </Route>

      <Route path="/manager">
        <ProtectedRoute component={ManagerDashboard} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/properties">
        <ProtectedRoute component={ManagerProperties} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/units">
        <ProtectedRoute component={ManagerUnits} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/tenants">
        <ProtectedRoute component={ManagerTenants} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/leases">
        <ProtectedRoute component={ManagerLeases} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/payments">
        <ProtectedRoute component={ManagerPayments} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/maintenance">
        <ProtectedRoute component={ManagerMaintenance} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/reports">
        <ProtectedRoute component={ManagerReports} allowedRoles={["manager"]} />
      </Route>
      <Route path="/manager/messages">
        <ProtectedRoute component={ManagerMessages} allowedRoles={["manager"]} />
      </Route>

      <Route path="/tenant">
        <ProtectedRoute component={TenantDashboard} allowedRoles={["tenant"]} />
      </Route>
      <Route path="/tenant/lease">
        <ProtectedRoute component={TenantLease} allowedRoles={["tenant"]} />
      </Route>
      <Route path="/tenant/payments">
        <ProtectedRoute component={TenantPayments} allowedRoles={["tenant"]} />
      </Route>
      <Route path="/tenant/maintenance">
        <ProtectedRoute component={TenantMaintenance} allowedRoles={["tenant"]} />
      </Route>
      <Route path="/tenant/messages">
        <ProtectedRoute component={TenantMessages} allowedRoles={["tenant"]} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
