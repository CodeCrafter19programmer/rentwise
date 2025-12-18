import { useState } from "react";
import { DollarSign, CreditCard, Calendar, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PaymentTable } from "@/components/payment-table";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { getLeaseByTenantId, getPaymentsByLeaseId } from "@/lib/mock-data";
import type { Payment } from "@shared/schema";
import { format } from "date-fns";

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

export default function TenantPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const lease = user ? getLeaseByTenantId(user.id) : null;
  const payments = lease ? getPaymentsByLeaseId(lease.id) : [];

  const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const paidPayments = payments.filter((p) => p.status === "paid");
  const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const nextPayment = pendingPayments[0];

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: "",
    },
  });

  const handlePayNow = (payment: Payment) => {
    setSelectedPayment(payment);
    form.setValue("amount", Number(payment.amount));
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PaymentFormData) => {
    toast({
      title: "Payment successful",
      description: `Your payment of ${formatCurrency(data.amount)} has been processed.`,
    });
    setIsDialogOpen(false);
    setSelectedPayment(null);
    form.reset();
  };

  return (
    <DashboardLayout
      title="Payments"
      breadcrumbs={[
        { label: "Tenant", href: "/tenant" },
        { label: "Payments" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            View and manage your rent payments
          </p>
        </div>

        {nextPayment && (
          <Card className={nextPayment.status === "overdue"
            ? "border-red-200 dark:border-red-900"
            : "border-primary/30"
          }>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {nextPayment.status === "overdue" ? "Overdue Payment" : "Next Payment Due"}
                  </p>
                  <p className="text-3xl font-bold font-mono" data-testid="text-next-amount">
                    {formatCurrency(nextPayment.amount)}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {format(new Date(nextPayment.dueDate), "MMMM d, yyyy")}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant={nextPayment.status === "overdue" ? "destructive" : "default"}
                  onClick={() => handlePayNow(nextPayment)}
                  data-testid="button-pay-now"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard
            title="Total Paid (YTD)"
            value={formatCurrency(totalPaid)}
            icon={DollarSign}
            testId="stat-total-paid"
          />
          <StatCard
            title="Payments Made"
            value={paidPayments.length}
            icon={CheckCircle}
            description="Successful payments"
            testId="stat-payments-made"
          />
          <StatCard
            title="Monthly Rent"
            value={lease ? formatCurrency(lease.rentAmount) : "—"}
            icon={Calendar}
            description="Due on the 1st"
            testId="stat-monthly-rent"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>View all your past and upcoming payments</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentTable
              payments={payments}
              showActions
              onPayNow={handlePayNow}
            />
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Make a Payment</DialogTitle>
              <DialogDescription>
                Enter your payment details to complete the transaction
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
                        <Input
                          type="number"
                          data-testid="input-payment-amount"
                          {...field}
                        />
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
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer (ACH)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Amount</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(form.watch("amount") || 0)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-mono font-medium">$0.00</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2 font-medium">
                    <span>Total</span>
                    <span className="font-mono">
                      {formatCurrency(form.watch("amount") || 0)}
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-confirm-payment">
                    Confirm Payment
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
