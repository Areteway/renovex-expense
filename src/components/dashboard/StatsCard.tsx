import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "default" | "red" | "green" | "orange" | "blue";
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  default: "bg-gray-100 text-gray-600",
  red: "bg-red-100 text-red-600",
  green: "bg-green-100 text-green-600",
  orange: "bg-orange-100 text-orange-600",
  blue: "bg-blue-100 text-blue-600",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "default",
  trend,
}: StatsCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs mt-1 font-medium",
                  trend.positive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.positive ? "▲" : "▼"} {trend.value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ml-3",
              colorMap[color]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
