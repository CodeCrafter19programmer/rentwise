import { useState } from "react";
import { Plus, Search, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { LeaseCard } from "@/components/lease-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
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
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

const leaseFormSchema = z.object({
  unitId: z.string().min(1, "Unit is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  rentAmount: z.coerce.number().min(1, "Rent amount is required"),
  securityDeposit: z.coerce.number().min(0, "Security deposit must be 0 or more"),
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

export default function ManagerLeases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Properties managed by current user
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "manager", user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("manager_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const propertyIds = (properties as any[]).map((p) => p.id);

  // Vacant units under those properties
  const { data: vacantUnits = [] } = useQuery({
    queryKey: ["units", "vacant", { propertyIds }],
    enabled: isSupabaseConfigured && propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, property_id, status")
        .in("property_id", propertyIds)
        .eq("status", "vacant");
      if (error) throw error;
      return data || [];
    },
  });

  // All units to scope leases
  const { data: allUnits = [] } = useQuery({
    queryKey: ["units", { propertyIds }],
    enabled: isSupabaseConfigured && propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, property_id")
        .in("property_id", propertyIds);
      if (error) throw error;
      return data || [];
    },
  });

  const unitIds = (allUnits as any[]).map((u) => u.id);

  // Tenants list (for form and filtering)
  const { data: tenants = [] } = useQuery({
    queryKey: ["profiles", "tenants"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("role", "tenant");
      if (error) throw error;
      return data || [];
    },
  });

  // Leases for those units
  const { data: leases = [] } = useQuery({
    queryKey: ["leases", { unitIds }],
    enabled: isSupabaseConfigured && unitIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, unit_id, tenant_id, start_date, end_date, rent_amount, security_deposit, is_active")
        .in("unit_id", unitIds);
      if (error) throw error;
      return (data || []).map((l: any) => ({
        id: l.id,
        unitId: l.unit_id,
        tenantId: l.tenant_id,
        startDate: l.start_date,
        endDate: l.end_date,
        rentAmount: l.rent_amount,
        securityDeposit: l.security_deposit,
        isActive: l.is_active,
      }));
    },
  });

  const tenantMap = new Map((tenants as any[]).map((t) => [t.id, t]));
  const propertiesMap = new Map((properties as any[]).map((p) => [p.id, p]));

  const filteredLeases = (leases as any[]).filter((lease) => {
    const tenant = tenantMap.get(lease.tenantId);
    const matchesSearch = (tenant?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && lease.isActive) ||
      (filterStatus === "expired" && !lease.isActive);
    return matchesSearch && matchesStatus;
  });

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      unitId: "",
      tenantId: "",
      startDate: "",
      endDate: "",
      rentAmount: 0,
      securityDeposit: 0,
    },
  });

  const onSubmit = (data: LeaseFormData) => {
    toast({
      title: "Lease created",
      description: "The lease agreement has been created successfully.",
    });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <DashboardLayout
      title="Leases"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Leases" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leases</h1>
            <p className="text-muted-foreground">
              Manage lease agreements for your properties
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-lease">
                <Plus className="mr-2 h-4 w-4" />
                Create Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Lease</DialogTitle>
                <DialogDescription>
                  Set up a new lease agreement
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lease-unit">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(vacantUnits as any[]).map((unit: any) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {(propertiesMap.get(unit.property_id)?.name as string) || "Property"} - Unit {unit.unit_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tenantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lease-tenant">
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenants.map((tenant: any) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-lease-start" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-lease-end" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" data-testid="input-lease-rent" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="securityDeposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" data-testid="input-lease-deposit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-submit-lease">
                      Create Lease
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by tenant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-leases"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-lease-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leases</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLeases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No leases found"
            description="No leases match your search criteria."
            actionLabel="Create Lease"
            onAction={() => setIsDialogOpen(true)}
            testId="empty-leases"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLeases.map((lease) => (
              <LeaseCard
                key={lease.id}
                lease={lease}
                onView={() => {}}
                onRenew={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
