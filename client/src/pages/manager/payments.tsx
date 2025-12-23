import { useState } from "react";
import { Search, Filter, DollarSign, CreditCard } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PaymentTable } from "@/components/payment-table";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Payment } from "@shared/schema";

const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
});

type RecordPaymentData = z.infer<typeof recordPaymentSchema>;

export default function ManagerPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: properties = [] } = useQuery({
    queryKey: ["managerProperties", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id")
        .eq("manager_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const propertyIds = (properties as any[]).map((p) => p.id);

  const { data: payments = [] } = useQuery({
    queryKey: ["managerPayments", user?.id, propertyIds.join("-")],
    enabled: isSupabaseConfigured && !!user?.id && propertyIds.length > 0,
    queryFn: async () => {
      // Load all payments and filter to manager's properties via leases->units->properties.
      const { data, error } = await supabase
        .from("payments")
        .select("id, lease_id, amount, due_date, paid_at, status, payment_method");
      if (error) throw error;
      if (propertyIds.length === 0) return [];

      const { data: leases, error: lerr } = await supabase
        .from("leases")
        .select("id, unit_id");
      if (lerr) throw lerr;
      const leaseUnit: Record<string, string> = Object.fromEntries((leases || []).map((l: any) => [l.id, l.unit_id]));

      const unitIds = Array.from(new Set((data || []).map((p: any) => leaseUnit[p.lease_id]).filter(Boolean)));
      if (unitIds.length === 0) return [];

      const { data: unitsRows, error: uerr } = await supabase
        .from("units")
        .select("id, property_id")
        .in("id", unitIds);
      if (uerr) throw uerr;

      const allowedUnitIds = new Set(
        (unitsRows || []).filter((u: any) => propertyIds.includes(u.property_id)).map((u: any) => u.id)
      );

      return (data || [])
        .filter((p: any) => allowedUnitIds.has(leaseUnit[p.lease_id]))
        .map((p: any) => ({
          id: p.id,
          leaseId: p.lease_id,
          amount: p.amount,
          dueDate: p.due_date,
          paidAt: p.paid_at,
          status: p.status,
          paymentMethod: p.payment_method,
        })) as Payment[];
    },
  });

  const filteredPayments = (payments as Payment[]).filter((payment) => {
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;
    return matchesStatus;
  });

  const paidPayments = (payments as Payment[]).filter((p) => p.status === "paid");
  const pendingPayments = (payments as Payment[]).filter((p) => p.status === "pending");
  const overduePayments = (payments as Payment[]).filter((p) => p.status === "overdue");

  const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const form = useForm<RecordPaymentData>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: "",
    },
  });

  const handleRecordPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    form.setValue("amount", Number(payment.amount));
    setIsDialogOpen(true);
  };

  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: { paymentId: string; amount: number; paymentMethod: string }) => {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: payload.paymentMethod,
        })
        .eq("id", payload.paymentId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["managerPayments", user?.id] });
      toast({
        title: "Payment recorded",
        description: "Payment has been recorded successfully.",
      });
      setIsDialogOpen(false);
      setSelectedPayment(null);
      form.reset();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to record payment",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecordPaymentData) => {
    if (!selectedPayment?.id) return;
    recordPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
    });
  };

  return (
    <DashboardLayout
      title="Payments"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Payments" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Track and manage rent payments
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard
            title="Collected This Month"
            value={formatCurrency(totalCollected)}
            icon={DollarSign}
            testId="stat-collected"
          />
          <StatCard
            title="Pending"
            value={formatCurrency(totalPending)}
            icon={CreditCard}
            description={`${pendingPayments.length} payments pending`}
            testId="stat-pending"
          />
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Overdue</span>
                  <span className="text-3xl font-bold font-mono text-red-600 dark:text-red-400" data-testid="stat-overdue-value">
                    {formatCurrency(totalOverdue)}
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {overduePayments.length} payments overdue
                  </span>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-payment-status">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments found"
            description="No payments match your filter criteria."
            testId="empty-payments"
          />
        ) : (
          <PaymentTable
            payments={filteredPayments}
            showActions
            onPayNow={handleRecordPayment}
            onViewDetails={() => {}}
          />
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for this rent charge
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" data-testid="input-payment-amount" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-confirm-payment">
                    Record Payment
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
