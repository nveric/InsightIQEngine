import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { AIInsights } from '@/components/dashboard/ai-insights';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CodeEditor } from '@/components/ui/code-editor';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Play, Search, PlusCircle } from 'lucide-react';

// Sample data generators for the dashboard
// In a real implementation, this would be fetched from the API
const generateSampleChartData = (type: string) => {
  const now = new Date();
  
  if (type === 'revenue') {
    return Array(6).fill(0).map((_, i) => {
      const date = new Date();
      date.setMonth(now.getMonth() - 5 + i);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        revenue: Math.floor(Math.random() * 50000) + 20000,
        target: Math.floor(Math.random() * 50000) + 30000,
      };
    });
  }
  
  if (type === 'acquisition') {
    return [
      { name: 'Organic Search', value: Math.floor(Math.random() * 500) + 200 },
      { name: 'Direct', value: Math.floor(Math.random() * 300) + 150 },
      { name: 'Referral', value: Math.floor(Math.random() * 200) + 100 },
      { name: 'Social Media', value: Math.floor(Math.random() * 150) + 50 },
      { name: 'Email', value: Math.floor(Math.random() * 100) + 50 },
    ];
  }
  
  if (type === 'products') {
    return Array(10).fill(0).map((_, i) => ({
      product: `Product ${i + 1}`,
      revenue: Math.floor(Math.random() * 10000) + 1000,
      units: Math.floor(Math.random() * 200) + 20,
    }));
  }
  
  if (type === 'regions') {
    return [
      { region: 'North America', revenue: Math.floor(Math.random() * 50000) + 20000 },
      { region: 'Europe', revenue: Math.floor(Math.random() * 40000) + 15000 },
      { region: 'Asia', revenue: Math.floor(Math.random() * 30000) + 10000 },
      { region: 'South America', revenue: Math.floor(Math.random() * 20000) + 5000 },
      { region: 'Africa', revenue: Math.floor(Math.random() * 10000) + 2000 },
      { region: 'Oceania', revenue: Math.floor(Math.random() * 10000) + 3000 },
    ];
  }
  
  return [];
};

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('last7days');
  const [searchQuery, setSearchQuery] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Data sources query (to check if user has any)
  const { data: dataSources } = useQuery({
    queryKey: ['/api/datasources'],
  });
  
  // Sample data generation (simulating API calls)
  const [chartData, setChartData] = useState({
    revenue: generateSampleChartData('revenue'),
    acquisition: generateSampleChartData('acquisition'),
    products: generateSampleChartData('products'),
    regions: generateSampleChartData('regions'),
  });
  
  // Refresh chart data
  const refreshChartData = (type: string) => {
    setChartData(prev => ({
      ...prev,
      [type]: generateSampleChartData(type),
    }));
  };
  
  // Simulate AI insights loading
  const [insights, setInsights] = useState<string[]>([]);
  
  const refreshInsights = () => {
    setLoadingInsights(true);
    // Simulate API call delay
    setTimeout(() => {
      setInsights([
        "Your sales growth has been accelerating at 4.7% per week over the last month, primarily driven by the West region. This is significantly higher than the previous quarter's average of 2.3% weekly growth.",
        "5 of your top-selling products are projected to run out of stock within the next 14 days based on current sales velocity. Consider restocking \"Premium Headphones\", \"Wireless Earbuds\", and 3 other items.",
        "Customers who purchase your \"Smart Home Starter Kit\" are 78% more likely to make a repeat purchase within 30 days. Consider creating a targeted follow-up campaign for recent purchasers."
      ]);
      setLoadingInsights(false);
    }, 1500);
  };
  
  // Load insights on mount
  useEffect(() => {
    refreshInsights();
  }, []);
  
  // Generate SQL from natural language query
  const generateSql = async () => {
    if (!nlQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question in natural language",
        variant: "destructive"
      });
      return;
    }
    
    if (!dataSources || dataSources.length === 0) {
      toast({
        title: "No data sources",
        description: "Please add a data source before generating SQL",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await apiRequest('POST', `/api/datasources/${dataSources[0].id}/nlq`, {
        question: nlQuery
      });
      const data = await response.json();
      setSqlQuery(data.sql);
    } catch (error) {
      toast({
        title: "Error generating SQL",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Run SQL query
  const runQuery = () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "Error",
        description: "Please generate or enter an SQL query first",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Opening SQL Builder",
      description: "Your query will be available in the SQL Builder",
    });
    
    // In a real implementation, we would save the query to state/local storage
    // and redirect to the SQL Builder with this query pre-loaded
  };
  
  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    // In a real implementation, this would trigger API calls to refresh data
    Object.keys(chartData).forEach(key => {
      refreshChartData(key as keyof typeof chartData);
    });
  };
  
  // Check if user has any data sources
  const noDataSources = !dataSources || dataSources.length === 0;

  return (
    <AppShell title="Dashboard">
      {/* Dashboard Header with Controls */}
      <div className="bg-white p-4 shadow-sm rounded-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Business Performance Overview</h2>
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative inline-block text-left">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 days</SelectItem>
                  <SelectItem value="last30days">Last 30 days</SelectItem>
                  <SelectItem value="last90days">Last 90 days</SelectItem>
                  <SelectItem value="thisyear">This year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="default">
              <Search className="mr-2 h-4 w-4 text-gray-500" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {noDataSources ? (
        <Card className="mb-6">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <Database className="h-16 w-16 text-primary-200 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Data Sources Connected</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Connect a data source to start analyzing your data and building insights.
            </p>
            <Link href="/data-sources">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Data Source
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <KpiCard 
              title="Total Revenue" 
              value="$87,492" 
              change={{ value: 14.6, isPositive: true }}
              icon="money"
              iconColor="primary"
            />
            
            <KpiCard 
              title="New Customers" 
              value="2,367" 
              change={{ value: 7.2, isPositive: true }}
              icon="users"
              iconColor="green"
            />
            
            <KpiCard 
              title="Conversion Rate" 
              value="4.28%" 
              change={{ value: 1.1, isPositive: false }}
              icon="percent"
              iconColor="yellow"
            />
            
            <KpiCard 
              title="Avg. Order Value" 
              value="$132.58" 
              change={{ value: 3.5, isPositive: true }}
              icon="cart"
              iconColor="indigo"
            />
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <ChartCard
              title="Revenue Trends"
              description="Monthly revenue comparison (USD)"
              chartType="line"
              data={chartData.revenue}
              dataKey="revenue"
              xAxisKey="month"
              onRefresh={() => refreshChartData('revenue')}
            />
            
            <ChartCard
              title="Customer Acquisition"
              description="New customers by acquisition channel"
              chartType="pie"
              data={chartData.acquisition}
              valueKey="value"
              nameKey="name"
              onRefresh={() => refreshChartData('acquisition')}
            />
            
            <ChartCard
              title="Product Performance"
              description="Top 10 products by revenue"
              chartType="bar"
              data={chartData.products}
              dataKey="revenue"
              xAxisKey="product"
              onRefresh={() => refreshChartData('products')}
            />
            
            <ChartCard
              title="Geographic Distribution"
              description="Revenue by geographic region"
              chartType="bar"
              data={chartData.regions}
              dataKey="revenue"
              xAxisKey="region"
              onRefresh={() => refreshChartData('regions')}
            />
          </div>

          {/* AI Insights Section */}
          <AIInsights 
            insights={insights}
            isLoading={loadingInsights}
            onRefreshInsights={refreshInsights}
          />
        </>
      )}

      {/* Query Builder Preview */}
      <Card className="shadow-sm rounded-lg overflow-hidden mb-6">
        <CardHeader className="px-4 py-5 flex justify-between items-center border-b border-gray-200">
          <CardTitle className="text-lg font-medium">SQL Query Builder</CardTitle>
          <Link href="/sql-builder">
            <Button variant="link">Open full editor</Button>
          </Link>
        </CardHeader>
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Ask a question in plain English..."
                className="pl-10"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
              />
            </div>
            <Button onClick={generateSql}>
              Generate SQL
            </Button>
          </div>
        </div>
        <div className="p-4">
          <CodeEditor
            value={sqlQuery || "-- Your SQL query will appear here after you ask a question above\n-- For example: \"Show me total sales by product category for the last month\""}
            onChange={setSqlQuery}
            language="sql"
            height="150px"
          />
          <div className="mt-4 flex justify-end space-x-3">
            <Link href="/sql-builder">
              <Button variant="outline">
                Edit query
              </Button>
            </Link>
            <Button onClick={runQuery}>
              <Play className="mr-2 h-4 w-4" />
              Run query
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
