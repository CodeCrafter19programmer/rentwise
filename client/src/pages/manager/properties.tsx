import { useState } from "react";
import { Search, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PropertyCard } from "@/components/property-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { getPropertiesByManagerId } from "@/lib/mock-data";

export default function ManagerProperties() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const properties = user ? getPropertiesByManagerId(user.id) : [];

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Properties"
      breadcrumbs={[
        { label: "Manager", href: "/manager" },
        { label: "Properties" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Properties</h1>
          <p className="text-muted-foreground">
            Properties assigned to you
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-properties"
          />
        </div>

        {filteredProperties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties found"
            description="No properties match your search criteria or you don't have any assigned properties."
            testId="empty-properties"
          />
        ) : (
          <div className="grid gap-4">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onView={() => {}}
                onEdit={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
