import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Percent, ShoppingCart } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: "money" | "users" | "percent" | "cart";
  iconColor?: "primary" | "green" | "yellow" | "indigo";
}

export function KpiCard({ 
  title, 
  value, 
  change,
  icon = "money",
  iconColor = "primary" 
}: KpiCardProps) {
  // Icon and color selection
  const getIcon = () => {
    switch (icon) {
      case "money":
        return <DollarSign className="h-6 w-6" />;
      case "users":
        return <Users className="h-6 w-6" />;
      case "percent":
        return <Percent className="h-6 w-6" />;
      case "cart":
        return <ShoppingCart className="h-6 w-6" />;
      default:
        return <DollarSign className="h-6 w-6" />;
    }
  };

  const getIconBgColor = () => {
    switch (iconColor) {
      case "primary":
        return "bg-primary-100";
      case "green":
        return "bg-green-100";
      case "yellow":
        return "bg-yellow-100";
      case "indigo":
        return "bg-indigo-100";
      default:
        return "bg-primary-100";
    }
  };

  const getIconTextColor = () => {
    switch (iconColor) {
      case "primary":
        return "text-primary-600";
      case "green":
        return "text-green-600";
      case "yellow":
        return "text-yellow-600";
      case "indigo":
        return "text-indigo-600";
      default:
        return "text-primary-600";
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${getIconBgColor()} rounded-md p-3`}>
              <div className={getIconTextColor()}>
                {getIcon()}
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
                {change && (
                  <div className={`flex items-center text-sm ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {change.isPositive ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(change.value)}% vs last period
                  </div>
                )}
              </dd>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
