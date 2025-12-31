import { useState } from "react";
import { Plus, Search, Mail, Phone, Building2, UserCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const managerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

type ManagerFormData = z.infer<typeof managerFormSchema>;

export default function AdminManagers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: managers = [] } = useQuery({
    queryKey: ["profiles", "managers"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, phone")
        .eq("role", "manager");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["adminProperties"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, manager_id");
      if (error) throw error;
      return data || [];
    },
  });

  const propertiesByManager = (properties as any[]).reduce((acc: Record<string, any[]>, p: any) => {
    const mid = p.manager_id;
    if (!mid) return acc;
    acc[mid] = acc[mid] || [];
    acc[mid].push({ id: p.id, name: p.name });
    return acc;
  }, {} as Record<string, any[]>);

  const filteredManagers = (managers as any[]).filter((manager: any) =>
    (manager.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (manager.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createManagerMutation = useMutation({
    mutationFn: async (data: ManagerFormData) => {
      try {
        console.log('[MANAGER] Getting auth token...');
        
        // Try all possible localStorage keys that Supabase uses
        let token: string | undefined;
        const possibleKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        
        console.log('[MANAGER] Found localStorage keys:', possibleKeys);
        
        for (const key of possibleKeys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              // Try different possible structures
              token = parsed?.access_token || 
                     parsed?.currentSession?.access_token ||
                     parsed?.session?.access_token;
              if (token) {
                console.log('[MANAGER] Found token in key:', key);
                break;
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }

        if (!token) {
          console.log('[MANAGER] No token in localStorage, getting fresh session...');
          // Get fresh session with timeout protection
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Session fetch timeout')), 3000)
          );
          
          const sessionPromise = supabase.auth.getSession();
          
          try {
            const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]) as any;
            token = sessionData?.session?.access_token;
            console.log('[MANAGER] Got token from getSession');
          } catch (timeoutError) {
            console.error('[MANAGER] getSession timed out');
            throw new Error("Session timeout - please refresh the page and try again");
          }
        }

        if (!token) {
          throw new Error("Not authenticated - please log out and log back in");
        }

        console.log('[MANAGER] Token retrieved, calling API...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch("/api/admin/managers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('[MANAGER] API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MANAGER] API error response:', errorText);
          let errorMessage = "Failed to create manager";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('[MANAGER] Manager created successfully:', result);
        return result;
      } catch (error: any) {
        console.error('[MANAGER] Error creating manager:', error);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "managers"] });
      toast({
        title: "Manager added successfully",
        description: `${variables.name} has been added. Temporary password: ${data.tempPassword}`,
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add manager",
        description: error.message || "An error occurred while adding the manager.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ManagerFormData>({
    resolver: zodResolver(managerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = (data: ManagerFormData) => {
    createManagerMutation.mutate(data);
  };

  return (
    <DashboardLayout
      title="Managers"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Managers" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Property Managers</h1>
            <p className="text-muted-foreground">
              Manage your property management team
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-manager">
                <Plus className="mr-2 h-4 w-4" />
                Add Manager
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Manager</DialogTitle>
                <DialogDescription>
                  Enter the details for the new property manager
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
                          <Input placeholder="John Doe" data-testid="input-manager-name" {...field} />
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
                          <Input type="email" placeholder="john@example.com" data-testid="input-manager-email" {...field} />
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
                          <Input placeholder="(555) 123-4567" data-testid="input-manager-phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-submit-manager" disabled={createManagerMutation.isPending}>
                      {createManagerMutation.isPending ? "Adding..." : "Add Manager"}
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
            placeholder="Search managers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-managers"
          />
        </div>

        {filteredManagers.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No managers found"
            description="No property managers match your search criteria."
            actionLabel="Add Manager"
            onAction={() => setIsDialogOpen(true)}
            testId="empty-managers"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredManagers.map((manager) => {
              const properties = (propertiesByManager as any)[manager.id] || [];
              const initials = manager.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase();

              return (
                <Card key={manager.id} data-testid={`card-manager-${manager.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <CardTitle className="text-lg" data-testid={`text-manager-name-${manager.id}`}>
                          {manager.name}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          Property Manager
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{manager.email}</span>
                      </div>
                      {manager.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{manager.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {properties.length} {properties.length === 1 ? "Property" : "Properties"}
                        </span>
                      </div>
                      {properties.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {properties.slice(0, 2).map((prop: any) => (
                            <Badge key={prop.id} variant="outline" className="text-xs">
                              {prop.name}
                            </Badge>
                          ))}
                          {properties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{properties.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-manager-${manager.id}`}>
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1" data-testid={`button-message-manager-${manager.id}`}>
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
