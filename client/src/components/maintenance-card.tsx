import { Clock, CheckCircle, AlertCircle, Wrench, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MaintenanceCardProps {
  request: MaintenanceRequest;
  unitNumber?: string;
  tenantName?: string;
  showActions?: boolean;
  onView?: () => void;
  onUpdateStatus?: (status: MaintenanceStatus) => void;
}

const statusConfig: Record<MaintenanceStatus, { label: string; icon: typeof Clock; className: string }> = {
  open: { label: "Open", icon: AlertCircle, className: "text-orange-500" },
  in_progress: { label: "In Progress", icon: Wrench, className: "text-blue-500" },
  resolved: { label: "Resolved", icon: CheckCircle, className: "text-green-500" },
};

const priorityConfig: Record<MaintenancePriority, { label: string; className: string; borderColor: string }> = {
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", borderColor: "border-l-green-500" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", borderColor: "border-l-yellow-500" },
  high: { label: "High", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", borderColor: "border-l-red-500" },
};

export function MaintenanceCard({
  request,
  unitNumber,
  tenantName,
  showActions = false,
  onView,
  onUpdateStatus,
}: MaintenanceCardProps) {
  const status = statusConfig[request.status];
  const priority = priorityConfig[request.priority];
  const StatusIcon = status.icon;

  return (
    <Card
      className={cn("border-l-4 overflow-visible", priority.borderColor)}
      data-testid={`card-maintenance-${request.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", status.className)} />
            <span className="font-medium">{status.label}</span>
          </div>
          <Badge className={priority.className} data-testid={`badge-priority-${request.id}`}>
            {priority.label} Priority
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold" data-testid={`text-maintenance-title-${request.id}`}>
            {request.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {unitNumber && (
            <span>Unit {unitNumber}</span>
          )}
          {tenantName && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{tenantName}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(request.createdAt!), "MMM d, yyyy")}</span>
          </div>
        </div>

        {request.vendorName && (
          <div className="flex items-center gap-1 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Assigned to:</span>
            <span className="font-medium">{request.vendorName}</span>
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {onView && (
              <Button variant="outline" size="sm" onClick={onView} data-testid={`button-view-maintenance-${request.id}`}>
                View Details
              </Button>
            )}
            {request.status === "open" && onUpdateStatus && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onUpdateStatus("in_progress")}
                data-testid={`button-start-maintenance-${request.id}`}
              >
                Start Work
              </Button>
            )}
            {request.status === "in_progress" && onUpdateStatus && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onUpdateStatus("resolved")}
                data-testid={`button-resolve-maintenance-${request.id}`}
              >
                Mark Resolved
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
