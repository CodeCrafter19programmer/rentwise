import { Building2, Home, Users, DollarSign, Wrench, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { PropertyCard } from "@/components/property-card";
import { FinancialChart } from "@/components/financial-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { getDashboardStats, mockProperties, mockMaintenanceRequests, getMonthlyFinancials } from "@/lib/mock-data";

export default function AdminDashboard() {
  const { user } = useAuth();
  const stats = getDashboardStats("admin");
  const financialData = getMonthlyFinancials("all");
  const recentMaintenance = mockMaintenanceRequests.filter((m) => m.status !== "resolved").slice(0, 3);

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
            value={stats.totalProperties}
            icon={Building2}
            trend={{ value: 8, isPositive: true }}
            testId="stat-total-properties"
          />
          <StatCard
            title="Total Units"
            value={stats.totalUnits}
            icon={Home}
            description={`${stats.occupiedUnits} occupied, ${stats.vacantUnits} vacant`}
            testId="stat-total-units"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthlyRevenue)}
            icon={DollarSign}
            trend={{ value: 12, isPositive: true }}
            testId="stat-monthly-revenue"
          />
          <StatCard
            title="Open Maintenance"
            value={stats.pendingMaintenance}
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
                <span className="font-semibold">{stats.totalTenants}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Managers</span>
                <span className="font-semibold">{stats.totalManagers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                <Badge variant="secondary">
                  {Math.round((stats.occupiedUnits / stats.totalUnits) * 100)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vacant Units</span>
                <Badge variant="outline">{stats.vacantUnits}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Properties Overview</h2>
          </div>
          <div className="grid gap-4">
            {mockProperties.slice(0, 3).map((property) => (
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
