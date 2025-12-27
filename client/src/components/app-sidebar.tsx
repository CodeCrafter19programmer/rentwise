import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  MessageSquare,
  BarChart3,
  Settings,
  Home,
  LogOut,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@shared/schema";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
}

const adminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Properties", url: "/admin/properties", icon: Building2 },
  { title: "Managers", url: "/admin/managers", icon: Users },
  { title: "System Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const managerNavItems: NavItem[] = [
  { title: "Dashboard", url: "/manager", icon: LayoutDashboard },
  { title: "Properties", url: "/manager/properties", icon: Building2 },
  { title: "Units", url: "/manager/units", icon: Home },
  { title: "Tenants", url: "/manager/tenants", icon: Users },
  { title: "Leases", url: "/manager/leases", icon: FileText },
  { title: "Payments", url: "/manager/payments", icon: CreditCard },
  { title: "Maintenance", url: "/manager/maintenance", icon: Wrench },
  { title: "Reports", url: "/manager/reports", icon: BarChart3 },
  { title: "Messages", url: "/manager/messages", icon: MessageSquare },
];

const tenantNavItems: NavItem[] = [
  { title: "Dashboard", url: "/tenant", icon: LayoutDashboard },
  { title: "My Lease", url: "/tenant/lease", icon: FileText },
  { title: "Payments", url: "/tenant/payments", icon: CreditCard },
  { title: "Maintenance", url: "/tenant/maintenance", icon: Wrench },
  { title: "Messages", url: "/tenant/messages", icon: MessageSquare },
];

const getNavItems = (role: UserRole): NavItem[] => {
  switch (role) {
    case "admin":
      return adminNavItems;
    case "manager":
      return managerNavItems;
    case "tenant":
      return tenantNavItems;
    default:
      return [];
  }
};

const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Property Manager";
    case "tenant":
      return "Tenant";
    default:
      return "";
  }
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user) return null;

  const navItems = getNavItems(user.role);
  const roleLabel = getRoleLabel(user.role);
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold" data-testid="text-app-name">RentWise</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium" data-testid="text-user-name">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</span>
          </div>
        </div>
        <SidebarMenu className="mt-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="nav-profile">
              <Link href={`/${user.role}/profile`}>
                <UserCircle className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
