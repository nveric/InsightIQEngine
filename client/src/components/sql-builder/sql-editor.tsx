import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor } from '@/components/ui/code-editor';
import { SchemaBrowser } from '@/components/sql-builder/schema-browser';
import { NlqConverter } from '@/components/sql-builder/nlq-converter';
import { DataTable } from '@/components/ui/data-table';
import { 
  Play, 
  Save, 
  AlertCircle, 
  BarChart,
  Terminal
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ChartCard } from '@/components/dashboard/chart-card';

interface SqlEditorProps {
  dataSourceId?: number;
  query?: string;
  onSave?: (name: string, query: string) => void;
}

export function SqlEditor({ 
  dataSourceId,
  query: initialQuery = '',
  onSave
}: SqlEditorProps) {
  const [query, setQuery] = useState(initialQuery);
  const [queryResults, setQueryResults] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState('table');

  const insertText = (text: string) => {
    setQuery(prev => {
      const newQuery = prev ? `${prev} ${text}` : text;
      return newQuery;
    });
  };

  const handleTableClick = (tableName: string) => {
    insertText(tableName);
  };

  const handleColumnClick = (tableName: string, columnName: string) => {
    insertText(`${tableName}.${columnName}`);
  };

  const handleNlqGenerated = (generatedSql: string) => {
    setQuery(generatedSql);
  };

  const runQuery = async () => {
    if (!dataSourceId) {
      setError('Please select a data source');
      return;
    }

    if (!query.trim()) {
      setError('Query cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);
    setQueryResults(null);

    try {
      const response = await fetch(`/api/datasources/${dataSourceId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const data = await response.json();
      setQueryResults(data);
      setResultsTab('table'); // Default to table view for new results
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getChartType = () => {
    if (!queryResults || !queryResults.rows || queryResults.rows.length === 0) {
      return 'bar';
    }

    // Simple heuristic to choose chart type based on result shape
    const columnCount = queryResults.columns.length;
    const rowCount = queryResults.rows.length;

    if (columnCount === 2) {
      // Two columns (name/value pair) - could be a pie chart
      return 'pie';
    } else if (rowCount > 10 && columnCount >= 3) {
      // Multiple rows with at least one dimension and one measure - line chart
      return 'line';
    } else {
      // Default to bar chart
      return 'bar';
    }
  };

  // Massage data for charts
  const getChartData = () => {
    if (!queryResults || !queryResults.rows || queryResults.rows.length === 0) {
      return [];
    }

    // Direct mapping for charts (using column names)
    return queryResults.rows.map((row: any) => {
      return queryResults.columns.reduce((obj: any, colName: string, idx: number) => {
        obj[colName] = row[idx];
        return obj;
      }, {});
    });
  };

  // Generate table columns from result
  const getTableColumns = () => {
    if (!queryResults?.columns) return [];
    
    return queryResults.columns.map((column: string) => ({
      key: column,
      header: column
    }));
  };

  // Generate table data from result
  const getTableData = () => {
    if (!queryResults?.rows) return [];
    
    return queryResults.rows.map((row: any[]) => {
      const rowObj: Record<string, any> = {};
      queryResults.columns.forEach((column: string, idx: number) => {
        rowObj[column] = row[idx];
      });
      return rowObj;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none">
            <CardHeader className="px-4 py-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center">
                <Terminal className="mr-2 h-4 w-4" />
                SQL Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="p-4 flex-1">
                <CodeEditor
                  value={query}
                  onChange={setQuery}
                  language="sql"
                  height="100%"
                  runQuery={runQuery}
                />
              </div>
              <div className="px-4 py-2 border-t flex justify-between items-center bg-gray-50">
                <div>
                  {error && (
                    <div className="flex items-center text-sm text-red-500">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {onSave && (
                    <Button variant="outline" size="sm" onClick={() => onSave('New Query', query)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  )}
                  <Button size="sm" onClick={runQuery} disabled={isLoading}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Query
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Results */}
          {queryResults && (
            <Card className="mt-4 border shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium">
                  Results ({queryResults.rowCount} rows)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="table" value={resultsTab} onValueChange={setResultsTab}>
                  <div className="px-4 py-2 border-b bg-gray-50">
                    <TabsList>
                      <TabsTrigger value="table">Table</TabsTrigger>
                      <TabsTrigger value="chart">Chart</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="table" className="p-4 min-h-[300px]">
                    <DataTable
                      columns={getTableColumns()}
                      data={getTableData()}
                      enableSearch={true}
                      showExport={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="chart" className="p-4 min-h-[300px]">
                    <ChartCard
                      title="Query Results Visualization"
                      chartType={getChartType()}
                      data={getChartData()}
                      xAxisKey={queryResults.columns[0]}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Separator */}
        <div className="mx-4">
          <Separator orientation="vertical" />
        </div>
        
        {/* Right sidebar - Schema Browser and NL2SQL */}
        <div className="w-64 flex flex-col">
          <Tabs defaultValue="schema" className="flex-1 flex flex-col">
            <TabsList className="mb-2">
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="nlq">Natural Language</TabsTrigger>
            </TabsList>
            
            <TabsContent value="schema" className="flex-1 flex flex-col border rounded-md overflow-hidden mt-0">
              <SchemaBrowser 
                dataSourceId={dataSourceId}
                onTableClick={handleTableClick}
                onColumnClick={handleColumnClick}
              />
            </TabsContent>
            
            <TabsContent value="nlq" className="flex-1 flex flex-col border rounded-md overflow-hidden mt-0">
              <NlqConverter 
                dataSourceId={dataSourceId}
                onSqlGenerated={handleNlqGenerated}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
