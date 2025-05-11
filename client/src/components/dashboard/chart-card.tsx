import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ExternalLink,
  Maximize2,
  BarChart3,
  LineChart,
  PieChart,
  List
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef } from "react";
import { 
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

type ChartType = "line" | "bar" | "pie" | "table" | "area" | "scatter" | "radar" | "funnel";

interface ChartConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  animation?: boolean;
  labelPosition?: 'top' | 'center' | 'bottom';
  theme?: 'default' | 'dark' | 'light';
}

interface ChartCardProps {
  title: string;
  description?: string;
  chartType: ChartType;
  data: any[];
  dataKey?: string;
  xAxisKey?: string;
  valueKey?: string;
  nameKey?: string;
  columns?: {
    key: string;
    header: string;
  }[];
  colors?: string[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ChartCard({
  title,
  description,
  chartType,
  data,
  dataKey,
  xAxisKey = "name",
  valueKey = "value",
  nameKey = "name",
  columns,
  colors = ["#1A73E8", "#64B5F6", "#0D47A1", "#E3F2FD", "#42A5F5"],
  isLoading = false,
  onRefresh,
}: ChartCardProps) {
  const [config, setConfig] = useState<ChartConfig>({
    showLegend: true,
    showGrid: true,
    smooth: false,
    animation: true,
    labelPosition: 'center',
    theme: 'default'
  });
  const [chartMode, setChartMode] = useState<ChartType>(chartType);
  const chartRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
        <CardHeader className="px-4 py-5 flex justify-between items-center">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </CardHeader>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          {description || "Loading chart data..."}
        </div>
        <CardContent className="p-4 h-60 flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-400">
            <BarChart3 className="h-16 w-16 animate-pulse" />
            <p className="mt-2">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <BarChart3 className="h-16 w-16" />
          <p className="mt-2">No data available</p>
        </div>
      );
    }

    switch (chartMode) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey={xAxisKey}
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Legend />
              {dataKey ? (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={colors[0]}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              ) : (
                // If no specific dataKey is provided, render all numeric fields as lines
                Object.keys(data[0])
                  .filter(key => key !== xAxisKey && typeof data[0][key] === 'number')
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colors[index % colors.length]}
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  ))
              )}
            </RechartsLineChart>
          </ResponsiveContainer>
        );
        
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey={xAxisKey}
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Legend />
              {dataKey ? (
                <Bar dataKey={dataKey} fill={colors[0]} />
              ) : (
                // If no specific dataKey is provided, render all numeric fields as bars
                Object.keys(data[0])
                  .filter(key => key !== xAxisKey && typeof data[0][key] === 'number')
                  .map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={colors[index % colors.length]}
                    />
                  ))
              )}
            </RechartsBarChart>
          </ResponsiveContainer>
        );
        
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={valueKey}
                nameKey={nameKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
        
      case "table":
        return (
          <div className="overflow-auto max-h-60">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns ? (
                    columns.map((col, i) => (
                      <th
                        key={i}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col.header}
                      </th>
                    ))
                  ) : (
                    // If no columns are provided, use object keys as headers
                    Object.keys(data[0]).map((key) => (
                      <th
                        key={key}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns ? (
                      columns.map((col, colIndex) => (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {row[col.key]}
                        </td>
                      ))
                    ) : (
                      // If no columns are provided, render all values
                      Object.values(row).map((val, valIndex) => (
                        <td
                          key={`${rowIndex}-${valIndex}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
      <CardHeader className="px-4 py-5 flex justify-between items-center">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex space-x-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Chart Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setChartMode("line")}>
                <LineChart className="mr-2 h-4 w-4" />
                Line Chart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChartMode("bar")}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Bar Chart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChartMode("pie")}>
                <PieChart className="mr-2 h-4 w-4" />
                Pie Chart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChartMode("table")}>
                <List className="mr-2 h-4 w-4" />
                Table View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onRefresh && (
                <DropdownMenuItem onClick={onRefresh}>
                  Refresh Data
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        {description || "Chart visualization"}
      </div>
      <CardContent className="p-4 h-60" ref={chartRef}>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
