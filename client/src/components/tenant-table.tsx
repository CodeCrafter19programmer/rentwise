import { User, Mail, Phone, Home } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@shared/schema";

interface TenantTableProps {
  tenants: Profile[];
  leaseInfoByTenant?: Record<string, { propertyName?: string; unitNumber?: string } | null>;
  onView?: (tenant: Profile) => void;
  onMessage?: (tenant: Profile) => void;
}

export function TenantTable({ tenants, leaseInfoByTenant, onView, onMessage }: TenantTableProps) {

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Property / Unit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No tenants found.
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => {
              const info = leaseInfoByTenant?.[tenant.id] || null;
              const initials = tenant.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium" data-testid={`text-tenant-name-${tenant.id}`}>
                        {tenant.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{tenant.email}</span>
                      </div>
                      {tenant.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{tenant.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {info ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {info.propertyName} - Unit {info.unitNumber}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No active lease</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {info ? (
                      <Badge variant="default">Active Lease</Badge>
                    ) : (
                      <Badge variant="secondary">No Lease</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(tenant)}
                          data-testid={`button-view-tenant-${tenant.id}`}
                        >
                          View
                        </Button>
                      )}
                      {onMessage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMessage(tenant)}
                          data-testid={`button-message-tenant-${tenant.id}`}
                        >
                          Message
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
