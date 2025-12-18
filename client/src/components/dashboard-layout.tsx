import { type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function DashboardLayout({ children, title, breadcrumbs = [] }: DashboardLayoutProps) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Separator orientation="vertical" className="h-6" />
              {breadcrumbs.length > 0 ? (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((item, index) => (
                      <BreadcrumbItem key={index}>
                        {index > 0 && <BreadcrumbSeparator />}
                        {item.href ? (
                          <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              ) : (
                <h1 className="text-lg font-semibold" data-testid="text-page-title">{title}</h1>
              )}
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
