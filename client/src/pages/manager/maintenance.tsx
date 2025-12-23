import { useState } from "react";
import { Search, Filter, Wrench } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MaintenanceCard } from "@/components/maintenance-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { MaintenanceStatus } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function ManagerMaintenance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();

  // Load properties managed by current user
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "manager", user?.id],
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

  const propertyIds = properties.map((p: any) => p.id);

  // Units under those properties
  const { data: units = [] } = useQuery({
    queryKey: ["units", { propertyIds }],
    enabled: isSupabaseConfigured && propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, property_id")
        .in("property_id", propertyIds);
      if (error) throw error;
      return data || [];
    },
  });

  const unitIdSet = new Set((units as any[]).map((u) => u.id));

  // Maintenance requests for those units
  const { data: requests = [] } = useQuery({
    queryKey: ["maintenance", { unitIds: Array.from(unitIdSet) }],
    enabled: isSupabaseConfigured && unitIdSet.size > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, unit_id, tenant_id, title, description, priority, status")
        .in("unit_id", Array.from(unitIdSet));
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch tenant profiles for display
  const tenantIds = Array.from(new Set((requests as any[]).map((r) => r.tenant_id).filter(Boolean)));
  const { data: tenants = [] } = useQuery({
    queryKey: ["profiles", { tenantIds }],
    enabled: isSupabaseConfigured && tenantIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", tenantIds);
      if (error) throw error;
      return data || [];
    },
  });

  const unitMap = new Map((units as any[]).map((u) => [u.id, u]));
  const tenantMap = new Map((tenants as any[]).map((t) => [t.id, t]));

  const filteredRequests = (requests as any[]).filter((request) => {
    const unit = unitMap.get(request.unit_id);
    const tenant = tenantMap.get(request.tenant_id);
    const matchesSearch =
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit?.unit_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    const matchesPriority = filterPriority === "all" || request.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openRequests = (requests as any[]).filter((r) => r.status === "open");
  const inProgressRequests = (requests as any[]).filter((r) => r.status === "in_progress");
  const resolvedRequests = (requests as any[]).filter((r) => r.status === "resolved");

  const handleUpdateStatus = (requestId: string, newStatus: MaintenanceStatus) => {
    toast({
      title: "Status updated",
      description: `Maintenance request has been marked as ${newStatus.replace("_", " ")}.`,
    });
  };

  return (
    <DashboardLayout
      title="Maintenance"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Maintenance" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Requests</h1>
          <p className="text-muted-foreground">
            Track and manage maintenance requests
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard
            title="Open Requests"
            value={openRequests.length}
            icon={Wrench}
            testId="stat-open"
          />
          <StatCard
            title="In Progress"
            value={inProgressRequests.length}
            icon={Wrench}
            testId="stat-in-progress"
          />
          <StatCard
            title="Resolved This Month"
            value={resolvedRequests.length}
            icon={Wrench}
            testId="stat-resolved"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-maintenance"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-maintenance-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-priority">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredRequests.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No maintenance requests"
            description="No maintenance requests match your search criteria."
            testId="empty-maintenance"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((request: any) => {
              const unit = unitMap.get(request.unit_id);
              const tenant = tenantMap.get(request.tenant_id);
              return (
                <MaintenanceCard
                  key={request.id}
                  request={{
                    id: request.id,
                    unitId: request.unit_id,
                    tenantId: request.tenant_id,
                    title: request.title,
                    description: request.description,
                    priority: request.priority,
                    status: request.status,
                  } as any}
                  unitNumber={unit?.unit_number}
                  tenantName={tenant?.name}
                  showActions
                  onView={() => {}}
                  onUpdateStatus={(status) => handleUpdateStatus(request.id, status)}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
