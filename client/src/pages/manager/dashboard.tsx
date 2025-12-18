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
import {
  getDashboardStats,
  getPropertiesByManagerId,
  mockMaintenanceRequests,
  getMonthlyFinancials,
  mockPayments,
  getProfileById,
  getUnitById,
} from "@/lib/mock-data";
import { Link } from "wouter";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const stats = getDashboardStats("manager", user?.id);
  const properties = user ? getPropertiesByManagerId(user.id) : [];
  const financialData = getMonthlyFinancials("manager");
  
  const openMaintenance = mockMaintenanceRequests
    .filter((m) => m.status !== "resolved")
    .slice(0, 3);

  const overduePayments = mockPayments.filter((p) => p.status === "overdue");

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
            value={stats.totalProperties}
            icon={Building2}
            testId="stat-my-properties"
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
            trend={{ value: 8, isPositive: true }}
            testId="stat-monthly-revenue"
          />
          <StatCard
            title="Collection Rate"
            value={`${stats.collectionRate}%`}
            icon={TrendingUp}
            description={`${stats.pendingPayments} payments pending`}
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
              <Badge variant="secondary">{stats.openMaintenance} Open</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {openMaintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open maintenance requests</p>
              ) : (
                openMaintenance.map((request) => {
                  const unit = getUnitById(request.unitId);
                  const tenant = getProfileById(request.tenantId);
                  return (
                    <div key={request.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Unit {unit?.unitNumber} • {tenant?.name}
                        </p>
                      </div>
                      <Badge
                        variant={request.priority === "high" ? "destructive" : "secondary"}
                      >
                        {request.priority}
                      </Badge>
                    </div>
                  );
                })
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
            {properties.slice(0, 2).map((property) => (
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
