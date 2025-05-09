import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { SqlEditor } from '@/components/sql-builder/sql-editor';
import { Button } from '@/components/ui/button';
import { PlusCircle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DataSource, SavedQuery, InsertSavedQuery } from '@shared/schema';

export default function SqlBuilder() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedDataSource, setSelectedDataSource] = useState<number | undefined>();
  const [currentQuery, setCurrentQuery] = useState<string>('');
  
  // Fetch data sources
  const { data: dataSources, isLoading: isLoadingDataSources } = useQuery<DataSource[]>({
    queryKey: ['/api/datasources'],
  });
  
  // Fetch saved queries
  const { data: savedQueries } = useQuery<SavedQuery[]>({
    queryKey: ['/api/queries'],
  });
  
  // Set the first data source as default if none selected
  useEffect(() => {
    if (dataSources && dataSources.length > 0 && !selectedDataSource) {
      setSelectedDataSource(dataSources[0].id);
    }
  }, [dataSources, selectedDataSource]);
  
  // Handle data source change
  const handleDataSourceChange = (value: string) => {
    setSelectedDataSource(parseInt(value, 10));
  };
  
  // Save query
  const saveQuery = async (name: string, query: string) => {
    if (!selectedDataSource) {
      toast({
        title: "Error",
        description: "Please select a data source before saving the query",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const saveData: InsertSavedQuery = {
        name,
        query,
        dataSourceId: selectedDataSource,
        userId: 0, // This will be set by the server based on the authenticated user
        description: "",
        visualizationType: "table",
        visualizationConfig: {},
      };
      
      await apiRequest('POST', '/api/queries', saveData);
      
      toast({
        title: "Query saved",
        description: `Query "${name}" saved successfully`,
      });
      
      // Refresh saved queries
      queryClient.invalidateQueries({ queryKey: ['/api/queries'] });
    } catch (error) {
      toast({
        title: "Failed to save query",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Load a saved query
  const loadSavedQuery = (query: SavedQuery) => {
    setSelectedDataSource(query.dataSourceId);
    setCurrentQuery(query.query);
    
    toast({
      title: "Query loaded",
      description: `Loaded query: ${query.name}`,
    });
  };
  
  // Check if user has any data sources
  const noDataSources = !dataSources || dataSources.length === 0;

  return (
    <AppShell title="SQL Builder">
      {noDataSources ? (
        <Card className="mb-6">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <Database className="h-16 w-16 text-primary-200 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Data Sources Connected</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              You need to connect a data source before you can use the SQL Builder.
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
          {/* Data Source Selector */}
          <div className="mb-6 flex justify-between items-center">
            <div className="w-64">
              <Select 
                value={selectedDataSource?.toString()} 
                onValueChange={handleDataSourceChange}
                disabled={isLoadingDataSources}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources?.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id.toString()}>
                      {ds.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {savedQueries && savedQueries.length > 0 && (
              <div className="flex items-center">
                <span className="mr-2 text-sm text-gray-500">Saved Queries:</span>
                <Select>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Load saved query" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedQueries.map((query) => (
                      <SelectItem 
                        key={query.id} 
                        value={query.id.toString()}
                        onClick={() => loadSavedQuery(query)}
                      >
                        {query.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* SQL Editor */}
          <div className="h-[calc(100vh-220px)] min-h-[500px]">
            <SqlEditor
              dataSourceId={selectedDataSource}
              query={currentQuery}
              onSave={saveQuery}
            />
          </div>
        </>
      )}
    </AppShell>
  );
}
