import { Home, Bed, Bath, Maximize } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Unit, UnitStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface UnitCardProps {
  unit: Unit;
  propertyName?: string;
  tenantName?: string;
  onView?: () => void;
  onEdit?: () => void;
}

const statusConfig: Record<UnitStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  occupied: { label: "Occupied", variant: "default" },
  vacant: { label: "Vacant", variant: "secondary" },
  maintenance: { label: "Maintenance", variant: "destructive" },
};

export function UnitCard({ unit, propertyName, tenantName, onView, onEdit }: UnitCardProps) {
  const status = statusConfig[unit.status];
  const rentFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(Number(unit.rentAmount));

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-unit-${unit.id}`}>
      <div className="relative">
        <div className="flex h-24 items-center justify-center bg-muted">
          <Home className="h-10 w-10 text-muted-foreground" />
        </div>
        <Badge
          variant={status.variant}
          className="absolute right-2 top-2"
          data-testid={`badge-unit-status-${unit.id}`}
        >
          {status.label}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold" data-testid={`text-unit-number-${unit.id}`}>
              Unit {unit.unitNumber}
            </h3>
            {propertyName && (
              <p className="text-sm text-muted-foreground">{propertyName}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{unit.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{unit.bathrooms} bath</span>
            </div>
            {unit.sqft && (
              <div className="flex items-center gap-1">
                <Maximize className="h-4 w-4" />
                <span>{unit.sqft} sqft</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-2xl font-bold font-mono" data-testid={`text-unit-rent-${unit.id}`}>
                {rentFormatted}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            {tenantName && (
              <span className="text-sm text-muted-foreground">
                Tenant: {tenantName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            {onView && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onView} data-testid={`button-view-unit-${unit.id}`}>
                View
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="sm" className="flex-1" onClick={onEdit} data-testid={`button-edit-unit-${unit.id}`}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
