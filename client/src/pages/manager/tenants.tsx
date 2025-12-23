import { useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TenantTable } from "@/components/tenant-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

export default function ManagerTenants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: tenants = [] } = useQuery({
    queryKey: ["profiles", "tenants"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, phone")
        .eq("role", "tenant");
      if (error) throw error;
      return data || [];
    },
  });

  // Manager's properties, units, and active leases to build lease info mapping
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

  const { data: units = [] } = useQuery({
    queryKey: ["unitsByManager", user?.id],
    enabled: isSupabaseConfigured && !!user?.id && propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, property_id, unit_number")
        .in("property_id", propertyIds);
      if (error) throw error;
      return data || [];
    },
  });

  const unitIds = (units as any[]).map((u) => u.id);

  const { data: leases = [] } = useQuery({
    queryKey: ["activeLeasesByManager", user?.id],
    enabled: isSupabaseConfigured && !!user?.id && unitIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, unit_id, tenant_id, is_active")
        .in("unit_id", unitIds)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const propertyById: Record<string, any> = Object.fromEntries((properties as any[]).map((p) => [p.id, p]));
  const unitById: Record<string, any> = Object.fromEntries((units as any[]).map((u) => [u.id, u]));
  const leaseInfoByTenant = Object.fromEntries(
    (leases as any[]).map((l: any) => {
      const u = unitById[l.unit_id];
      const p = u ? propertyById[u.property_id] : null;
      return [l.tenant_id, { propertyName: p?.name, unitNumber: u?.unit_number }];
    })
  );

  const filteredTenants = (tenants as any[]).filter((tenant) =>
    (tenant.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tenant.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = (data: TenantFormData) => {
    toast({
      title: "Tenant added",
      description: `${data.name} has been added as a tenant.`,
    });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <DashboardLayout
      title="Tenants"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Tenants" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tenants</h1>
            <p className="text-muted-foreground">
              Manage your tenants and their information
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-tenant">
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
                <DialogDescription>
                  Enter the details for the new tenant
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" data-testid="input-tenant-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" data-testid="input-tenant-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" data-testid="input-tenant-phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-submit-tenant">
                      Add Tenant
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-tenants"
          />
        </div>

        {filteredTenants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No tenants found"
            description="No tenants match your search criteria."
            actionLabel="Add Tenant"
            onAction={() => setIsDialogOpen(true)}
            testId="empty-tenants"
          />
        ) : (
          <TenantTable
            tenants={filteredTenants}
            leaseInfoByTenant={leaseInfoByTenant}
            onView={() => {}}
            onMessage={() => {}}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
