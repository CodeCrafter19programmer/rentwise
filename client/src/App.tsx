import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
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
  const { user, isAuthenticated, authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // If we have a user with the right role, show the component immediately
  // Don't wait for authLoading to finish if we already have valid cached user
  const userHasAccess = user && (!allowedRoles || allowedRoles.includes(user.role));
  const shouldShowContent = isAuthenticated && userHasAccess;
  
  // Only redirect if auth is done loading AND conditions are met
  const shouldRedirectToLogin = !authLoading && !isAuthenticated;
  const shouldRedirectToRoleDashboard = !authLoading && isAuthenticated && user && allowedRoles && !allowedRoles.includes(user.role);

  useEffect(() => {
    if (shouldRedirectToLogin) {
      setLocation("/login");
    } else if (shouldRedirectToRoleDashboard && user) {
      setLocation(`/${user.role}`);
    }
  }, [shouldRedirectToLogin, shouldRedirectToRoleDashboard, user, setLocation]);

  // Show content immediately if user has access (even if still loading in background)
  if (shouldShowContent) {
    return <Component />;
  }

  // Only show loading if we're actually loading AND don't have a valid user yet
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Not loading, no access - will be redirected by useEffect
  return <LoadingScreen />;
}

function Router() {
  const { isAuthenticated, user, authLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      <Route path="/">
        {authLoading ? (
          <LoadingScreen />
        ) : isAuthenticated && user ? (
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
  const [location] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ErrorBoundary resetKey={location}>
              <Router />
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
