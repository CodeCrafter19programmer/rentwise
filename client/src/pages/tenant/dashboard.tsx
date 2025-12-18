import { Calendar, DollarSign, Wrench, FileText, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { LeaseCard } from "@/components/lease-card";
import { MaintenanceCard } from "@/components/maintenance-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  getDashboardStats,
  getLeaseByTenantId,
  getMaintenanceByTenantId,
  getUnitById,
  getPropertyById,
} from "@/lib/mock-data";
import { format, differenceInDays } from "date-fns";

export default function TenantDashboard() {
  const { user } = useAuth();
  const stats = getDashboardStats("tenant", user?.id);
  const lease = user ? getLeaseByTenantId(user.id) : null;
  const maintenanceRequests = user ? getMaintenanceByTenantId(user.id) : [];
  const openMaintenance = maintenanceRequests.filter((m) => m.status !== "resolved");

  const unit = lease ? getUnitById(lease.unitId) : null;
  const property = unit ? getPropertyById(unit.propertyId) : null;

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const daysUntilPayment = stats.nextPaymentDue
    ? differenceInDays(new Date(stats.nextPaymentDue), new Date())
    : null;

  const isPaymentDueSoon = daysUntilPayment !== null && daysUntilPayment <= 7 && daysUntilPayment > 0;
  const isPaymentOverdue = daysUntilPayment !== null && daysUntilPayment < 0;

  return (
    <DashboardLayout title="Tenant Dashboard">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            {property && unit ? (
              <>Your home at {property.name}, Unit {unit.unitNumber}</>
            ) : (
              <>Manage your rental from here</>
            )}
          </p>
        </div>

        {(isPaymentDueSoon || isPaymentOverdue) && (
          <Card className={isPaymentOverdue
            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
            : "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
          }>
            <CardHeader className="pb-2">
              <CardTitle className={`flex items-center gap-2 ${
                isPaymentOverdue
                  ? "text-red-700 dark:text-red-400"
                  : "text-orange-700 dark:text-orange-400"
              }`}>
                <AlertCircle className="h-5 w-5" />
                {isPaymentOverdue ? "Payment Overdue" : "Payment Due Soon"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm ${
                isPaymentOverdue
                  ? "text-red-700 dark:text-red-400"
                  : "text-orange-700 dark:text-orange-400"
              }`}>
                {isPaymentOverdue
                  ? `Your rent payment of ${formatCurrency(stats.amountDue)} is overdue.`
                  : `Your rent payment of ${formatCurrency(stats.amountDue)} is due in ${daysUntilPayment} days.`
                }
              </p>
              <Link href="/tenant/payments">
                <Button
                  variant={isPaymentOverdue ? "destructive" : "default"}
                  size="sm"
                  className="mt-3"
                  data-testid="button-pay-now-alert"
                >
                  Pay Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Monthly Rent"
            value={formatCurrency(stats.currentRent)}
            icon={DollarSign}
            testId="stat-monthly-rent"
          />
          <StatCard
            title="Next Payment Due"
            value={stats.nextPaymentDue ? format(new Date(stats.nextPaymentDue), "MMM d") : "—"}
            icon={Calendar}
            description={stats.nextPaymentDue ? formatCurrency(stats.amountDue) : "No payment due"}
            testId="stat-next-payment"
          />
          <StatCard
            title="Lease Ends"
            value={stats.leaseEndDate ? format(new Date(stats.leaseEndDate), "MMM d, yyyy") : "—"}
            icon={FileText}
            testId="stat-lease-end"
          />
          <StatCard
            title="Open Requests"
            value={stats.openMaintenanceRequests}
            icon={Wrench}
            description="Maintenance requests"
            testId="stat-open-requests"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Lease</h2>
              <Link href="/tenant/lease">
                <Button variant="ghost" size="sm" data-testid="button-view-lease">
                  View Details
                </Button>
              </Link>
            </div>
            {lease ? (
              <LeaseCard lease={lease} showDetails onView={() => {}} />
            ) : (
              <Card>
                <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
                  No active lease found
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Payments</h2>
              <Link href="/tenant/payments">
                <Button variant="ghost" size="sm" data-testid="button-view-payments">
                  View All
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-0">
                {stats.paymentHistory.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-muted-foreground">
                    No payment history
                  </div>
                ) : (
                  <div className="divide-y">
                    {stats.paymentHistory.slice(0, 3).map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">
                            {format(new Date(payment.dueDate), "MMMM yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(payment.dueDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">
                            {formatCurrency(payment.amount)}
                          </p>
                          <Badge
                            variant={
                              payment.status === "paid"
                                ? "default"
                                : payment.status === "overdue"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Maintenance Requests</h2>
            <Link href="/tenant/maintenance">
              <Button variant="outline" size="sm" data-testid="button-new-request">
                New Request
              </Button>
            </Link>
          </div>
          {openMaintenance.length === 0 ? (
            <Card>
              <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
                No open maintenance requests
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {openMaintenance.slice(0, 2).map((request) => {
                const requestUnit = getUnitById(request.unitId);
                return (
                  <MaintenanceCard
                    key={request.id}
                    request={request}
                    unitNumber={requestUnit?.unitNumber}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
