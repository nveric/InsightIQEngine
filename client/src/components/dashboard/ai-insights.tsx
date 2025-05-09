import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle, AlertTriangle, Eye } from "lucide-react";

interface AIInsightsProps {
  insights?: string[];
  isLoading?: boolean;
  onRefreshInsights?: () => void;
}

export function AIInsights({
  insights = [],
  isLoading = false,
  onRefreshInsights
}: AIInsightsProps) {
  // Default insights if none are provided
  const [displayInsights, setDisplayInsights] = useState<string[]>([]);

  useEffect(() => {
    if (insights && insights.length > 0) {
      setDisplayInsights(insights);
    } else {
      setDisplayInsights([
        "Your sales growth has been accelerating at 4.7% per week over the last month, primarily driven by the West region. This is significantly higher than the previous quarter's average of 2.3% weekly growth.",
        "5 of your top-selling products are projected to run out of stock within the next 14 days based on current sales velocity. Consider restocking \"Premium Headphones\", \"Wireless Earbuds\", and 3 other items.",
        "Customers who purchase your \"Smart Home Starter Kit\" are 78% more likely to make a repeat purchase within 30 days. Consider creating a targeted follow-up campaign for recent purchasers."
      ]);
    }
  }, [insights]);

  // Icons for different insight types
  const getInsightIcon = (index: number) => {
    const icons = [
      <CheckCircle key="check" className="h-5 w-5 text-green-500" />,
      <AlertTriangle key="alert" className="h-5 w-5 text-yellow-500" />,
      <Eye key="eye" className="h-5 w-5 text-blue-500" />
    ];
    return icons[index % icons.length];
  };

  const getInsightTitle = (index: number) => {
    const titles = [
      "Sales Growth Pattern",
      "Inventory Alert",
      "Customer Behavior Insight",
      "Market Trend Analysis",
      "Operational Efficiency"
    ];
    return titles[index % titles.length];
  };

  const getActionButton = (index: number) => {
    const actions = [
      { label: "Run deeper analysis", color: "text-primary-600 hover:text-primary-500" },
      { label: "View affected products", color: "text-primary-600 hover:text-primary-500" },
      { label: "Create campaign", color: "text-primary-600 hover:text-primary-500" },
      { label: "View full report", color: "text-primary-600 hover:text-primary-500" },
      { label: "Optimize operations", color: "text-primary-600 hover:text-primary-500" }
    ];
    return actions[index % actions.length];
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="px-4 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium flex items-center">
              <Info className="h-5 w-5 text-primary-500 mr-2" />
              AI-Generated Insights
            </CardTitle>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              Loading
            </Badge>
          </div>
          <CardDescription>
            Our AI is analyzing your data to generate insights...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-8 flex justify-center items-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-gray-200 mb-4"></div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
      <CardHeader className="px-4 py-5 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <Info className="h-5 w-5 text-primary-500 mr-2" />
            AI-Generated Insights
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            New
          </Badge>
        </div>
        <CardDescription>
          Based on your data, our AI has identified these key insights:
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          {displayInsights.map((insight, index) => (
            <div key={index} className="px-4 py-5 sm:px-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  {getInsightIcon(index)}
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">{getInsightTitle(index)}</h4>
                  <p className="mt-2 text-sm text-gray-500">{insight}</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className={`mt-3 p-0 ${getActionButton(index).color}`}
                  >
                    {getActionButton(index).label}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
