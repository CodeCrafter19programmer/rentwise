import { FileText, Calendar, DollarSign, User, Home } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Lease } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface LeaseCardProps {
  lease: Lease;
  showDetails?: boolean;
  onView?: () => void;
  onRenew?: () => void;
}

export function LeaseCard({ lease, showDetails = true, onView, onRenew }: LeaseCardProps) {
  const { data: unit } = useQuery({
    queryKey: ["unit", lease.unitId],
    enabled: isSupabaseConfigured && !!lease.unitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, property_id, bedrooms, bathrooms, sqft")
        .eq("id", lease.unitId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: property } = useQuery({
    queryKey: ["property", unit?.property_id],
    enabled: isSupabaseConfigured && !!unit?.property_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("id", unit!.property_id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ["profile", lease.tenantId],
    enabled: isSupabaseConfigured && !!lease.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", lease.tenantId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const startDate = new Date(lease.startDate);
  const endDate = new Date(lease.endDate);
  const today = new Date();
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  const progressPercent = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);

  const isExpiringSoon = daysRemaining <= 60 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  return (
    <Card className="overflow-visible" data-testid={`card-lease-${lease.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Lease Agreement</CardTitle>
          </div>
          {lease.isActive ? (
            isExpired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : isExpiringSoon ? (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                Expiring Soon
              </Badge>
            ) : (
              <Badge variant="default">Active</Badge>
            )
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDetails && (
          <div className="grid gap-3 sm:grid-cols-2">
            {tenant && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tenant:</span>
                <span className="font-medium" data-testid={`text-lease-tenant-${lease.id}`}>
                  {tenant.name}
                </span>
              </div>
            )}
            {property && unit && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Unit:</span>
                <span className="font-medium">
                  {property.name} - Unit {unit.unit_number}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Term:</span>
              <span className="font-medium">
                {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Monthly Rent:</span>
              <span className="font-medium font-mono" data-testid={`text-lease-rent-${lease.id}`}>
                {formatCurrency(lease.rentAmount)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lease Progress</span>
            <span className="font-medium">
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Lease ended"}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {(onView || onRenew) && (
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {onView && (
              <Button variant="outline" size="sm" onClick={onView} data-testid={`button-view-lease-${lease.id}`}>
                View Full Lease
              </Button>
            )}
            {onRenew && isExpiringSoon && (
              <Button size="sm" onClick={onRenew} data-testid={`button-renew-lease-${lease.id}`}>
                Renew Lease
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
