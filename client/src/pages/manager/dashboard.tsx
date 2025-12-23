import { Building2, Home, DollarSign, Wrench, Users, TrendingUp, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { PropertyCard } from "@/components/property-card";
import { MaintenanceCard } from "@/components/maintenance-card";
import { FinancialChart } from "@/components/financial-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Link } from "wouter";

export default function ManagerDashboard() {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "manager", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, city, state, zip_code, manager_id, total_units")
        .eq("manager_id", user!.id);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zip_code,
        managerId: p.manager_id,
        totalUnits: p.total_units,
      }));
    },
  });

  const propertyIds = properties.map((p: any) => p.id);

  const { data: units = [] } = useQuery({
    queryKey: ["units", { propertyIds }],
    enabled: isSupabaseConfigured && propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, property_id, status, unit_number")
        .in("property_id", propertyIds);
      if (error) throw error;
      return (data || []).map((u: any) => ({ id: u.id, propertyId: u.property_id, status: u.status, unitNumber: u.unit_number }));
    },
  });

  const unitIds = units.map((u: any) => u.id);

  const { data: leases = [] } = useQuery({
    queryKey: ["leases", { unitIds }],
    enabled: isSupabaseConfigured && unitIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, unit_id, tenant_id, start_date, end_date, rent_amount, is_active")
        .in("unit_id", unitIds);
      if (error) throw error;
      return (data || []).map((l: any) => ({
        id: l.id,
        unitId: l.unit_id,
        tenantId: l.tenant_id,
        startDate: l.start_date,
        endDate: l.end_date,
        rentAmount: l.rent_amount,
        isActive: l.is_active,
      }));
    },
  });

  const leaseIds = leases.map((l: any) => l.id);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", { leaseIds }],
    enabled: isSupabaseConfigured && leaseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, lease_id, amount, due_date, paid_at, status")
        .in("lease_id", leaseIds);
      if (error) throw error;
      return (data || []).map((p: any) => ({ id: p.id, leaseId: p.lease_id, amount: p.amount, dueDate: p.due_date, paidAt: p.paid_at, status: p.status }));
    },
  });

  const { data: maintenanceAll = [] } = useQuery({
    queryKey: ["maintenance", { unitIds }],
    enabled: isSupabaseConfigured && unitIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, unit_id, tenant_id, title, description, priority, status")
        .in("unit_id", unitIds)
        .neq("status", "resolved");
      if (error) throw error;
      return data || [];
    },
  });

  const openMaintenance = (maintenanceAll as any[]).slice(0, 3);
  const overduePayments = (payments as any[]).filter((p) => p.status === "overdue");

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;
  const vacantUnits = units.filter((u: any) => u.status === "vacant").length;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const financialData = months.map((m, index) => {
    const monthPayments = (payments as any[]).filter((p) => {
      const d = p.paidAt || p.dueDate;
      if (!d) return false;
      const dt = new Date(d);
      return dt.getMonth() === index;
    });
    const income = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { month: m, income, expenses: 0 };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout title="Manager Dashboard">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your properties today
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="My Properties"
            value={properties.length}
            icon={Building2}
            testId="stat-my-properties"
          />
          <StatCard
            title="Total Units"
            value={totalUnits}
            icon={Home}
            description={`${occupiedUnits} occupied, ${vacantUnits} vacant`}
            testId="stat-total-units"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(financialData.reduce((sum, r) => sum + r.income, 0))}
            icon={DollarSign}
            trend={{ value: 8, isPositive: true }}
            testId="stat-monthly-revenue"
          />
          <StatCard
            title="Collection Rate"
            value={payments.length ? `${Math.round(((payments.filter((p: any) => p.status === "paid").length) / payments.length) * 100)}%` : "0%"}
            icon={TrendingUp}
            description={`${payments.filter((p: any) => p.status === "pending").length} payments pending`}
            testId="stat-collection-rate"
          />
        </div>

        {overduePayments.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="h-5 w-5" />
                Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                You have {overduePayments.length} overdue payment{overduePayments.length > 1 ? "s" : ""} that need attention.
              </p>
              <Link href="/manager/payments">
                <Button variant="outline" size="sm" className="mt-3" data-testid="button-view-overdue">
                  View Overdue Payments
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FinancialChart
              data={financialData}
              title="Monthly Revenue"
              description="Income and expenses for your properties"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-base">Open Maintenance</CardTitle>
              <Badge variant="secondary">{maintenanceAll.length} Open</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {openMaintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open maintenance requests</p>
              ) : (
                openMaintenance.map((request: any) => (
                  <div key={request.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{request.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Unit — • —
                      </p>
                    </div>
                    <Badge variant={request.priority === "high" ? "destructive" : "secondary"}>
                      {request.priority}
                    </Badge>
                  </div>
                ))
              )}
              <Link href="/manager/maintenance">
                <Button variant="ghost" size="sm" className="w-full" data-testid="button-view-all-maintenance">
                  View All Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Properties</h2>
            <Link href="/manager/properties">
              <Button variant="outline" size="sm" data-testid="button-view-all-properties">
                View All
              </Button>
            </Link>
          </div>
          <div className="grid gap-4">
            {properties.slice(0, 2).map((property: any) => (
              <PropertyCard
                key={property.id}
                property={property}
                onView={() => {}}
                onEdit={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
