import { useState } from "react";
import { Plus, Search, Filter, Home } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UnitCard } from "@/components/unit-card";
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
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { UnitStatus } from "@shared/schema";

const unitFormSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  bedrooms: z.coerce.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().min(0, "Bathrooms must be 0 or more"),
  sqft: z.coerce.number().min(0, "Square footage must be 0 or more"),
  rentAmount: z.coerce.number().min(0, "Rent must be 0 or more"),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

export default function ManagerUnits() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: properties = [] } = useQuery({
    queryKey: ["managerProperties", user?.id],
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

  const { data: units = [] } = useQuery({
    queryKey: ["managerUnits", user?.id, propertyIds.join("-")],
    enabled: isSupabaseConfigured && !!user?.id && propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, property_id, unit_number, bedrooms, bathrooms, sqft, status, rent_amount")
        .in("property_id", propertyIds);
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        propertyId: u.property_id,
        unitNumber: u.unit_number,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        sqft: u.sqft,
        status: u.status,
        rentAmount: String(u.rent_amount ?? "0"),
      }));
    },
  });

  const unitIds = (units as any[]).map((u) => u.id);

  const { data: leases = [] } = useQuery({
    queryKey: ["activeLeasesByManagerUnits", user?.id, unitIds.join("-")],
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

  const tenantIds = Array.from(new Set((leases as any[]).map((l: any) => l.tenant_id).filter(Boolean)));

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenantsByManagerUnits", user?.id, tenantIds.join("-")],
    enabled: isSupabaseConfigured && !!user?.id && tenantIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", tenantIds);
      if (error) throw error;
      return data || [];
    },
  });

  const propertyById: Record<string, any> = Object.fromEntries((properties as any[]).map((p: any) => [p.id, p]));
  const leaseByUnitId: Record<string, any> = Object.fromEntries((leases as any[]).map((l: any) => [l.unit_id, l]));
  const tenantById: Record<string, any> = Object.fromEntries((tenants as any[]).map((t: any) => [t.id, t]));

  const filteredUnits = (units as any[]).filter((unit: any) => {
    const property = propertyById[unit.propertyId];
    const matchesSearch =
      (unit.unitNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (property?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || unit.status === filterStatus;
    const matchesProperty = filterProperty === "all" || unit.propertyId === filterProperty;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      propertyId: "",
      unitNumber: "",
      bedrooms: 1,
      bathrooms: 1,
      sqft: 0,
      rentAmount: 0,
    },
  });

  const onSubmit = (data: UnitFormData) => {
    toast({
      title: "Unit created",
      description: `Unit ${data.unitNumber} has been added successfully.`,
    });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <DashboardLayout
      title="Units"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Units" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Units</h1>
            <p className="text-muted-foreground">
              Manage all units across your properties
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-unit">
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>
                  Enter the details for the new unit
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit-property">
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(properties as any[]).map((property: any) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="unitNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 101" data-testid="input-unit-number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" data-testid="input-unit-rent" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input type="number" data-testid="input-unit-bedrooms" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" data-testid="input-unit-bathrooms" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sqft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sq. Ft.</FormLabel>
                          <FormControl>
                            <Input type="number" data-testid="input-unit-sqft" {...field} />
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
                    <Button type="submit" data-testid="button-submit-unit">
                      Create Unit
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
              placeholder="Search units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-units"
            />
          </div>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-property">
              <SelectValue placeholder="Property" />
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
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-status">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredUnits.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No units found"
            description="No units match your search criteria. Try adjusting your filters or add a new unit."
            actionLabel="Add Unit"
            onAction={() => setIsDialogOpen(true)}
            testId="empty-units"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredUnits.map((unit) => {
              const property = propertyById[unit.propertyId];
              const lease = leaseByUnitId[unit.id];
              const tenantName = lease ? tenantById[lease.tenant_id]?.name : undefined;
              return (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  propertyName={property?.name}
                  tenantName={tenantName}
                  onView={() => {}}
                  onEdit={() => {}}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
