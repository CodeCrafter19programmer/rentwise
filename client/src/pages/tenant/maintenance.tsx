import { useState } from "react";
import { Plus, Wrench, Clock, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MaintenanceCard } from "@/components/maintenance-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getMaintenanceByTenantId, getUnitById, getLeaseByTenantId } from "@/lib/mock-data";

const maintenanceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Please provide more details (at least 10 characters)"),
  priority: z.enum(["low", "medium", "high"]),
});

type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;

export default function TenantMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const requests = user ? getMaintenanceByTenantId(user.id) : [];
  const lease = user ? getLeaseByTenantId(user.id) : null;
  const unit = lease ? getUnitById(lease.unitId) : null;

  const openRequests = requests.filter((r) => r.status === "open");
  const inProgressRequests = requests.filter((r) => r.status === "in_progress");
  const resolvedRequests = requests.filter((r) => r.status === "resolved");

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const onSubmit = (data: MaintenanceFormData) => {
    toast({
      title: "Request submitted",
      description: "Your maintenance request has been submitted. We'll get back to you soon.",
    });
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <DashboardLayout
      title="Maintenance"
      breadcrumbs={[
        { label: "Tenant", href: "/tenant" },
        { label: "Maintenance" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Maintenance Requests</h1>
            <p className="text-muted-foreground">
              {unit ? `Unit ${unit.unitNumber}` : "Submit and track maintenance requests"}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-request">
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Maintenance Request</DialogTitle>
                <DialogDescription>
                  Describe the issue you're experiencing and we'll get it resolved
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Leaking faucet in kitchen"
                            data-testid="input-maintenance-title"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please describe the issue in detail. Include location, when it started, and any other relevant information."
                            className="min-h-[120px]"
                            data-testid="input-maintenance-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-maintenance-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              Low - Can wait a few days
                            </SelectItem>
                            <SelectItem value="medium">
                              Medium - Needs attention soon
                            </SelectItem>
                            <SelectItem value="high">
                              High - Urgent issue
                            </SelectItem>
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
                    <Button type="submit" data-testid="button-submit-maintenance">
                      Submit Request
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
            icon={Clock}
            testId="stat-in-progress"
          />
          <StatCard
            title="Resolved"
            value={resolvedRequests.length}
            icon={CheckCircle}
            description="All time"
            testId="stat-resolved"
          />
        </div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList>
            <TabsTrigger value="open" data-testid="tab-open">
              Open ({openRequests.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              In Progress ({inProgressRequests.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">
              Resolved ({resolvedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-6">
            {openRequests.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No open requests"
                description="You don't have any open maintenance requests."
                actionLabel="New Request"
                onAction={() => setIsDialogOpen(true)}
                testId="empty-open"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openRequests.map((request) => (
                  <MaintenanceCard
                    key={request.id}
                    request={request}
                    unitNumber={unit?.unitNumber}
                    onView={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="mt-6">
            {inProgressRequests.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No requests in progress"
                description="No maintenance work is currently in progress."
                testId="empty-in-progress"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inProgressRequests.map((request) => (
                  <MaintenanceCard
                    key={request.id}
                    request={request}
                    unitNumber={unit?.unitNumber}
                    onView={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            {resolvedRequests.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No resolved requests"
                description="You don't have any resolved maintenance requests yet."
                testId="empty-resolved"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resolvedRequests.map((request) => (
                  <MaintenanceCard
                    key={request.id}
                    request={request}
                    unitNumber={unit?.unitNumber}
                    onView={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
