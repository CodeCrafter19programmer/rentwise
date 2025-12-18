import { useState } from "react";
import { Download, Calendar, TrendingUp, DollarSign, Building2, Home } from "lucide-react";
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
import { mockProperties, mockExpenses, getMonthlyFinancials, getDashboardStats } from "@/lib/mock-data";
import { format } from "date-fns";

export default function AdminReports() {
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("year");

  const stats = getDashboardStats("admin");
  const financialData = getMonthlyFinancials("all");

  const filteredExpenses = selectedProperty === "all"
    ? mockExpenses
    : mockExpenses.filter((e) => e.propertyId === selectedProperty);

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

  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    const category = expense.category;
    acc[category] = (acc[category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout
      title="System Reports"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Reports" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive financial and operational reports
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
                {mockProperties.map((property) => (
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
            trend={{ value: 12, isPositive: true }}
            testId="stat-total-revenue"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            icon={TrendingUp}
            trend={{ value: 5, isPositive: false }}
            testId="stat-total-expenses"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            icon={DollarSign}
            trend={{ value: 18, isPositive: true }}
            testId="stat-net-profit"
          />
          <StatCard
            title="Occupancy Rate"
            value={`${Math.round((stats.occupiedUnits / stats.totalUnits) * 100)}%`}
            icon={Home}
            description={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
            testId="stat-occupancy"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FinancialChart
              data={financialData}
              title="Income vs Expenses"
              description="Monthly comparison of revenue and expenses"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Breakdown of expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(expensesByCategory).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-sm">{category}</span>
                  </div>
                  <span className="font-mono font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span className="font-mono">
                    {formatCurrency(Object.values(expensesByCategory).reduce((a, b) => a + b, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expense transactions</CardDescription>
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
                {filteredExpenses.slice(0, 10).map((expense) => {
                  const property = mockProperties.find((p) => p.id === expense.propertyId);
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
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
