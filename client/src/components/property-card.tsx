import { Building2, MapPin, Users, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from "@shared/schema";
import { mockUnits, getProfileById } from "@/lib/mock-data";

interface PropertyCardProps {
  property: Property;
  onView?: () => void;
  onEdit?: () => void;
}

export function PropertyCard({ property, onView, onEdit }: PropertyCardProps) {
  const units = mockUnits.filter((u) => u.propertyId === property.id);
  const occupiedUnits = units.filter((u) => u.status === "occupied").length;
  const vacantUnits = units.filter((u) => u.status === "vacant").length;
  const manager = property.managerId ? getProfileById(property.managerId) : null;

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-property-${property.id}`}>
      <div className="flex flex-col sm:flex-row">
        <div className="flex h-32 w-full items-center justify-center bg-muted sm:w-48">
          <Building2 className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardContent className="flex flex-1 flex-col justify-between p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="text-lg font-semibold" data-testid={`text-property-name-${property.id}`}>
                {property.name}
              </h3>
              <Badge variant="secondary" className="shrink-0">
                {units.length} Units
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
            </div>
            {manager && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Manager: {manager.name}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">{occupiedUnits} Occupied</span>
              </div>
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">{vacantUnits} Vacant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onView && (
                <Button variant="outline" size="sm" onClick={onView} data-testid={`button-view-property-${property.id}`}>
                  View Details
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit} data-testid={`button-edit-property-${property.id}`}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
