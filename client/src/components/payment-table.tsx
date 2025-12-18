import { format } from "date-fns";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Payment, PaymentStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PaymentTableProps {
  payments: Payment[];
  showActions?: boolean;
  onPayNow?: (payment: Payment) => void;
  onViewDetails?: (payment: Payment) => void;
}

const statusConfig: Record<PaymentStatus, { label: string; icon: typeof CheckCircle; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", icon: CheckCircle, variant: "default" },
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  overdue: { label: "Overdue", icon: AlertCircle, variant: "destructive" },
  partial: { label: "Partial", icon: XCircle, variant: "outline" },
};

export function PaymentTable({ payments, showActions = false, onPayNow, onViewDetails }: PaymentTableProps) {
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid Date</TableHead>
            <TableHead>Method</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="h-24 text-center">
                No payments found.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => {
              const status = statusConfig[payment.status];
              const StatusIcon = status.icon;

              return (
                <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                  <TableCell className="font-medium">
                    {format(new Date(payment.dueDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-mono font-medium" data-testid={`text-payment-amount-${payment.id}`}>
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} data-testid={`badge-payment-status-${payment.id}`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.paidAt ? format(new Date(payment.paidAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.paymentMethod || "—"}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(payment.status === "pending" || payment.status === "overdue") && onPayNow && (
                          <Button
                            size="sm"
                            onClick={() => onPayNow(payment)}
                            data-testid={`button-pay-now-${payment.id}`}
                          >
                            Pay Now
                          </Button>
                        )}
                        {onViewDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(payment)}
                            data-testid={`button-view-payment-${payment.id}`}
                          >
                            Details
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
