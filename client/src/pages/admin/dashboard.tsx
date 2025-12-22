import { Building2, Home, Users, DollarSign, Wrench, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { PropertyCard } from "@/components/property-card";
import { FinancialChart } from "@/components/financial-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, city, state, zip_code, manager_id, total_units");
      if (error) throw error;
      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zip_code,
        managerId: p.manager_id,
        totalUnits: p.total_units,
      }));
      return mapped;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, property_id, status");
      if (error) throw error;
      return (data || []).map((u: any) => ({ id: u.id, propertyId: u.property_id, status: u.status }));
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ["maintenance", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, title, status")
        .neq("status", "resolved");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, due_date, paid_at, status");
      if (error) throw error;
      return (data || []).map((p: any) => ({ amount: p.amount, dueDate: p.due_date, paidAt: p.paid_at, status: p.status }));
    },
  });

  const totalProperties = properties.length;
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;
  const vacantUnits = units.filter((u: any) => u.status === "vacant").length;
  const totalTenants = profiles.filter((p: any) => p.role === "tenant").length;
  const totalManagers = profiles.filter((p: any) => p.role === "manager").length;
  const pendingMaintenance = maintenance.length;

  // Simple monthly financials from payments by dueDate (fallback to 0s if not available)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const financialData = months.map((m, index) => {
    const monthPayments = (payments as any[]).filter((p) => {
      const d = p.paidAt || p.dueDate;
      if (!d) return false;
      const dt = new Date(d);
      return dt.getMonth() === index;
    });
    const income = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    // Expenses not tracked yet on this view; set to 0 (can fetch from expenses table later)
    return { month: m, income, expenses: 0 };
  });

  const recentMaintenance = maintenance.slice(0, 3);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your rental portfolio
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Properties"
            value={totalProperties}
            icon={Building2}
            trend={{ value: 8, isPositive: true }}
            testId="stat-total-properties"
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
            trend={{ value: 12, isPositive: true }}
            testId="stat-monthly-revenue"
          />
          <StatCard
            title="Open Maintenance"
            value={pendingMaintenance}
            icon={Wrench}
            description="Requests pending"
            testId="stat-open-maintenance"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FinancialChart
              data={financialData}
              title="Revenue & Expenses"
              description="Monthly financial overview for all properties"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Tenants</span>
                <span className="font-semibold">{totalTenants}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Managers</span>
                <span className="font-semibold">{totalManagers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                <Badge variant="secondary">
                  {totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vacant Units</span>
                <Badge variant="outline">{vacantUnits}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Properties Overview</h2>
          </div>
          <div className="grid gap-4">
            {properties.slice(0, 3).map((property: any) => (
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
