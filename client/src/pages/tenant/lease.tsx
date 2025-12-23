import { FileText, Download, Calendar, DollarSign, Home, User } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";

export default function TenantLease() {
  const { user } = useAuth();
  const { data: lease } = useQuery({
    queryKey: ["tenantLease", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, unit_id, tenant_id, start_date, end_date, rent_amount, security_deposit, is_active")
        .eq("tenant_id", user!.id)
        .eq("is_active", true)
        .limit(1);
      if (error) throw error;
      const row = (data || [])[0];
      if (!row) return null;
      return {
        id: row.id,
        unitId: row.unit_id,
        tenantId: row.tenant_id,
        startDate: row.start_date,
        endDate: row.end_date,
        rentAmount: row.rent_amount,
        securityDeposit: row.security_deposit,
        isActive: row.is_active,
      } as any;
    },
  });

  const { data: unit } = useQuery({
    queryKey: ["unit", lease?.unitId],
    enabled: isSupabaseConfigured && !!lease?.unitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, bedrooms, bathrooms, sqft, property_id")
        .eq("id", lease!.unitId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: property } = useQuery({
    queryKey: ["property", unit?.property_id],
    enabled: isSupabaseConfigured && !!unit?.property_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, city, state, zip_code, manager_id")
        .eq("id", unit!.property_id)
        .single();
      if (error) throw error;
      const p = data as any;
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zip_code,
        managerId: p.manager_id,
      };
    },
  });

  const { data: manager } = useQuery({
    queryKey: ["manager", property?.managerId],
    enabled: isSupabaseConfigured && !!property?.managerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .eq("id", property!.managerId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  if (!lease || !unit || !property) {
    return (
      <DashboardLayout
        title="My Lease"
        breadcrumbs={[
          { label: "Tenant", href: "/tenant" },
          { label: "My Lease" },
        ]}
      >
        <Card>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            No active lease found
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const startDate = new Date(lease.startDate);
  const endDate = new Date(lease.endDate);
  const today = new Date();
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  const progressPercent = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);

  const isExpiringSoon = daysRemaining <= 60 && daysRemaining > 0;

  return (
    <DashboardLayout
      title="My Lease"
      breadcrumbs={[
        { label: "Tenant", href: "/tenant" },
        { label: "My Lease" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lease Agreement</h1>
            <p className="text-muted-foreground">
              View your current lease details
            </p>
          </div>
          <Button variant="outline" data-testid="button-download-lease">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lease Details
                    </CardTitle>
                    <CardDescription>
                      Residential Lease Agreement
                    </CardDescription>
                  </div>
                  {lease.isActive && (
                    isExpiringSoon ? (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                        Expiring Soon
                      </Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Property</p>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium" data-testid="text-property-name">
                        {property.name}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {property.address}, {property.city}, {property.state} {property.zipCode}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium" data-testid="text-unit-number">
                      Unit {unit.unit_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {unit.bedrooms} bed, {unit.bathrooms} bath • {unit.sqft} sqft
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Lease Start</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium" data-testid="text-lease-start">
                        {format(startDate, "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Lease End</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium" data-testid="text-lease-end">
                        {format(endDate, "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lease Progress</span>
                    <span className="font-medium">
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Lease ended"}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>

                <Separator />

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-2xl font-bold font-mono" data-testid="text-monthly-rent">
                        {formatCurrency(lease.rentAmount)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Due on the 1st of each month</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Security Deposit</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <p className="text-2xl font-bold font-mono" data-testid="text-security-deposit">
                        {formatCurrency(lease.securityDeposit || 0)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Held on file</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isExpiringSoon && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-orange-700 dark:text-orange-400">
                    Lease Renewal Available
                  </h3>
                  <p className="mt-2 text-sm text-orange-700 dark:text-orange-400">
                    Your lease expires in {daysRemaining} days. Contact your property manager to discuss renewal options.
                  </p>
                  <Button className="mt-4" data-testid="button-request-renewal">
                    Request Renewal
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Property Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {manager ? (
                  <>
                    <div>
                      <p className="font-medium" data-testid="text-manager-name">{manager.name}</p>
                      <p className="text-sm text-muted-foreground">{manager.email}</p>
                      {manager.phone && (
                        <p className="text-sm text-muted-foreground">{manager.phone}</p>
                      )}
                    </div>
                    <Button variant="outline" className="w-full" data-testid="button-contact-manager">
                      Send Message
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No manager assigned</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" data-testid="button-report-issue">
                  Report Maintenance Issue
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-make-payment">
                  Make a Payment
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-documents">
                  View Documents
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
