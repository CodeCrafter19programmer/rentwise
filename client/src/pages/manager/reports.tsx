import { useState } from "react";
import { Download, Calendar, TrendingUp, DollarSign, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FinancialChart } from "@/components/financial-chart";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { format } from "date-fns";

export default function ManagerReports() {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("year");

  const { data: properties = [] } = useQuery({
    queryKey: ["managerProperties", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, manager_id")
        .eq("manager_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const propertyIds = (properties as any[]).map((p) => p.id);
  const propertyFilter = selectedProperty === "all" ? undefined : selectedProperty;

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.id, propertyFilter],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("id, property_id, category, description, amount, date")
        .in("property_id", propertyIds);
      if (propertyFilter) query = query.eq("property_id", propertyFilter);
      const { data, error } = await query.order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units", user?.id, propertyFilter],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      let query = supabase.from("units").select("id, status, property_id").in("property_id", propertyIds);
      if (propertyFilter) query = query.eq("property_id", propertyFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const occupiedUnits = (units as any[]).filter((u) => u.status === "occupied").length;
  const totalUnits = (units as any[]).length;

  const { data: payments = [] } = useQuery({
    queryKey: ["paymentsAll", user?.id, propertyFilter],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, due_date, lease_id");
      if (error) throw error;
      // filter payments to manager's properties via leases->units->property_id
      const { data: leases, error: lerr } = await supabase
        .from("leases")
        .select("id, unit_id");
      if (lerr) throw lerr;
      const leaseUnit: Record<string, string> = Object.fromEntries((leases || []).map((l: any) => [l.id, l.unit_id]));
      const unitIds = Array.from(new Set((data || []).map((p: any) => leaseUnit[p.lease_id]).filter(Boolean)));
      const { data: unitsRows, error: uerr } = await supabase
        .from("units")
        .select("id, property_id")
        .in("id", unitIds);
      if (uerr) throw uerr;
      const allowedUnitIds = new Set((unitsRows || []).filter((u: any) => propertyIds.includes(u.property_id)).map((u: any) => u.id));
      const base = (data || []).filter((p: any) => allowedUnitIds.has(leaseUnit[p.lease_id]));
      if (!propertyFilter) return base;
      return base.filter((p: any) => {
        const unit = (unitsRows || []).find((u: any) => u.id === leaseUnit[p.lease_id]);
        return unit?.property_id === propertyFilter;
      });
    },
  });

  // Aggregate financial data from payments and expenses
  const paymentsByMonth: Record<string, number> = {};
  (payments as any[]).forEach((p: any) => {
    const d = new Date(p.due_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    paymentsByMonth[key] = (paymentsByMonth[key] || 0) + Number(p.amount || 0);
  });

  const expensesByMonth: Record<string, number> = {};
  (expenses as any[]).forEach((e: any) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    expensesByMonth[key] = (expensesByMonth[key] || 0) + Number(e.amount || 0);
  });

  const financialData = Object.keys({ ...paymentsByMonth, ...expensesByMonth })
    .sort()
    .map((month) => ({
      month,
      income: paymentsByMonth[month] || 0,
      expenses: expensesByMonth[month] || 0,
    }));

  const totalIncome = financialData.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = financialData.reduce((sum, m) => sum + m.expenses, 0);
  const netProfit = totalIncome - totalExpenses;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout
      title="Reports"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Reports" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">
              Income, expenses, and performance metrics
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-48" data-testid="select-report-property">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {(properties as any[]).map((property: any) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40" data-testid="select-report-period">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" data-testid="button-export-report">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalIncome)}
            icon={DollarSign}
            trend={{ value: 8, isPositive: true }}
            testId="stat-total-revenue"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            icon={TrendingUp}
            testId="stat-total-expenses"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            icon={DollarSign}
            trend={{ value: 12, isPositive: true }}
            testId="stat-net-profit"
          />
          <StatCard
            title="Occupancy Rate"
            value={totalUnits > 0 ? `${Math.round((occupiedUnits / totalUnits) * 100)}%` : "—"}
            icon={TrendingUp}
            testId="stat-occupancy"
          />
        </div>

        <FinancialChart
          data={financialData}
          title="Income vs Expenses"
          description="Monthly comparison for your properties"
        />

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expense transactions for your properties</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredExpenses as any[]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (filteredExpenses as any[]).slice(0, 10).map((expense: any) => {
                    const property = (properties as any[]).find((p: any) => p.id === expense.property_id);
                    return (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(expense.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {property?.name || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(Number(expense.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
