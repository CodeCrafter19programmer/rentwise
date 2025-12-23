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
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { format, differenceInDays } from "date-fns";

export default function TenantDashboard() {
  const { user } = useAuth();

  const { data: lease } = useQuery({
    queryKey: ["tenantLease", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, unit_id, tenant_id, start_date, end_date, rent_amount, is_active")
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
        .select("id, unit_number, property_id")
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
        .select("id, name")
        .eq("id", unit!.property_id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", lease?.id],
    enabled: isSupabaseConfigured && !!lease?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, due_date, paid_at, status")
        .eq("lease_id", lease!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ["maintenance", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, unit_id, tenant_id, title, description, status")
        .eq("tenant_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const openMaintenance = (maintenanceRequests as any[]).filter((m) => m.status !== "resolved");

  // Compute tenant-facing stats
  const currentRent = lease?.rentAmount || 0;
  const nextPending = (payments as any[]).find((p) => p.status === "pending" || p.status === "overdue");
  const nextPaymentDue = nextPending?.due_date || null;
  const amountDue = nextPending?.amount || 0;
  const leaseEndDate = lease?.endDate || null;
  const paymentHistory = (payments as any[]).map((p) => ({ id: p.id, amount: p.amount, dueDate: p.due_date, status: p.status }));

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const daysUntilPayment = nextPaymentDue
    ? differenceInDays(new Date(nextPaymentDue), new Date())
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
              <>Your home at {property.name}, Unit {unit.unit_number}</>
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
            value={formatCurrency(currentRent)}
            icon={DollarSign}
            testId="stat-monthly-rent"
          />
          <StatCard
            title="Next Payment Due"
            value={nextPaymentDue ? format(new Date(nextPaymentDue), "MMM d") : "—"}
            icon={Calendar}
            description={nextPaymentDue ? formatCurrency(amountDue) : "No payment due"}
            testId="stat-next-payment"
          />
          <StatCard
            title="Lease Ends"
            value={leaseEndDate ? format(new Date(leaseEndDate), "MMM d, yyyy") : "—"}
            icon={FileText}
            testId="stat-lease-end"
          />
          <StatCard
            title="Open Requests"
            value={openMaintenance.length}
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
                {paymentHistory.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-muted-foreground">
                    No payment history
                  </div>
                ) : (
                  <div className="divide-y">
                    {paymentHistory.slice(0, 3).map((payment: any) => (
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
