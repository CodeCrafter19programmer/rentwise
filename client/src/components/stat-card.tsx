import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
  testId?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  testId,
}: StatCardProps) {
  return (
    <Card className={cn("", className)} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{title}</span>
            <span className="text-3xl font-bold font-mono tracking-tight" data-testid={`${testId}-value`}>
              {value}
            </span>
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                <span
                  className={cn(
                    "font-medium",
                    trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
            {description && (
              <span className="text-sm text-muted-foreground">{description}</span>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
