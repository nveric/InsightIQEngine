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
  Terminal,
  History,
  FileCode,
  ArrowRight,
  FileQuestion,
  FileDown,
  Share2
} from 'lucide-react';
import { SavedQueriesManager } from './saved-queries-manager';
import { Separator } from '@/components/ui/separator';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'sql-formatter';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interface for query history items
interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
}

// Interface for query templates
interface QueryTemplate {
  name: string;
  description: string;
  sql: string;
  icon: React.ReactNode;
}

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

  // Query history state
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>(() => {
    const savedHistory = localStorage.getItem('sqlQueryHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // Query save dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');

  // Save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sqlQueryHistory', JSON.stringify(queryHistory));
  }, [queryHistory]);

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

  const loadFromHistory = (historyItem: QueryHistoryItem) => {
    setQuery(historyItem.query);
  };

  const clearHistory = () => {
    setQueryHistory([]);
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || response.statusText);
      }

      setQueryResults(data);
      setResultsTab('table'); // Default to table view for new results

      // Add to query history
      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        success: true,
        rowCount: data.rowCount
      };

      setQueryHistory(prev => [historyItem, ...prev.slice(0, 19)]); // Keep last 20 queries

    } catch (err) {
      console.error('Error executing query:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);

      // Add failed query to history
      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        success: false
      };

      setQueryHistory(prev => [historyItem, ...prev.slice(0, 19)]);

    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuery = () => {
    if (onSave && queryName.trim()) {
      onSave(queryName, query);
      setQueryName('');
      setQueryDescription('');
      setIsSaveDialogOpen(false);
    }
  };

  // Query templates for common SQL operations
  const queryTemplates: QueryTemplate[] = [
    {
      name: 'Select All',
      description: 'Retrieve all records from a table',
      sql: 'SELECT * FROM table_name LIMIT 100;',
      icon: <FileCode className="h-4 w-4" />
    },
    {
      name: 'Count Records',
      description: 'Count the number of records in a table',
      sql: 'SELECT COUNT(*) AS record_count FROM table_name;',
      icon: <FileQuestion className="h-4 w-4" />
    },
    {
      name: 'Filter Data',
      description: 'Select records that match specific criteria',
      sql: 'SELECT * FROM table_name WHERE column_name = value LIMIT 100;',
      icon: <FileDown className="h-4 w-4" />
    },
    {
      name: 'Group By',
      description: 'Group records and calculate aggregates',
      sql: 'SELECT column1, COUNT(*) AS count, SUM(column2) AS total\nFROM table_name\nGROUP BY column1\nORDER BY count DESC;',
      icon: <FileCode className="h-4 w-4" />
    },
    {
      name: 'Join Tables',
      description: 'Combine data from multiple tables',
      sql: 'SELECT t1.column1, t2.column2\nFROM table1 t1\nJOIN table2 t2 ON t1.id = t2.table1_id\nLIMIT 100;',
      icon: <FileCode className="h-4 w-4" />
    }
  ];

  const applyTemplate = (template: QueryTemplate) => {
    setQuery(template.sql);
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

  // Format the SQL query for display in history
  const formatQueryPreview = (sql: string) => {
    return sql.length > 60 ? sql.substring(0, 57) + '...' : sql;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none">
            <CardHeader className="px-4 py-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center">
                  <Terminal className="mr-2 h-4 w-4" />
                  SQL Editor
                </div>

                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <History className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Query History</DialogTitle>
                            </DialogHeader>

                            <div className="h-[400px]">
                              <ScrollArea className="h-full pr-4">
                                {queryHistory.length === 0 ? (
                                  <div className="p-4 text-center text-gray-500">
                                    No query history yet
                                  </div>
                                ) : (
                                  <div className="space-y-2 pr-4">
                                    {queryHistory.map(item => (
                                      <div 
                                        key={item.id} 
                                        className={`p-3 rounded-md text-sm border ${item.success ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}
                                      >
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="font-mono text-xs text-gray-600">
                                            {item.timestamp.toLocaleString()}
                                          </div>
                                          <div className={`text-xs ${item.success ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.success ? `Success (${item.rowCount} rows)` : 'Failed'}
                                          </div>
                                        </div>
                                        <div className="font-mono text-xs mb-2 bg-gray-50 p-2 rounded border break-all">
                                          {formatQueryPreview(item.query)}
                                        </div>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="mt-1 w-full text-xs"
                                          onClick={() => {
                                            loadFromHistory(item);
                                            const closeButton = document.querySelector('[data-state="open"] button[data-state="closed"]');
                                            if (closeButton && closeButton instanceof HTMLButtonElement) {
                                              closeButton.click();
                                            }
                                          }}
                                        >
                                          Load Query
                                          <ArrowRight className="ml-2 h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </ScrollArea>
                            </div>

                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={clearHistory}
                                disabled={queryHistory.length === 0}
                              >
                                Clear History
                              </Button>
                              <DialogClose asChild>
                                <Button variant="secondary" size="sm">Close</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Query History</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <FileCode className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Query Templates</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-2 mt-2">
                              {queryTemplates.map((template, index) => (
                                <div 
                                  key={index}
                                  className="p-3 rounded-md border hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    applyTemplate(template);
                                    const closeButton = document.querySelector('[data-state="open"] button[data-state="closed"]');
                                    if (closeButton && closeButton instanceof HTMLButtonElement) {
                                      closeButton.click();
                                    }
                                  }}
                                >
                                  <div className="flex items-center">
                                    {template.icon}
                                    <span className="ml-2 font-medium">{template.name}</span>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                </div>
                              ))}
                            </div>

                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="secondary" size="sm">Close</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Query Templates</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Save className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Saved Queries</DialogTitle>
                            </DialogHeader>
                            <SavedQueriesManager dataSourceId={dataSourceId} query={query} setQuery={setQuery}/>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="secondary" size="sm">Close</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Saved Queries</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Save Query</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="query-name">Query Name</Label>
                            <Input 
                              id="query-name" 
                              value={queryName} 
                              onChange={(e) => setQueryName(e.target.value)}
                              placeholder="Enter a name for this query"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="query-description">Description (Optional)</Label>
                            <Textarea 
                              id="query-description" 
                              value={queryDescription} 
                              onChange={(e) => setQueryDescription(e.target.value)}
                              placeholder="Add a description for this query"
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsSaveDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSaveQuery}
                            disabled={!queryName.trim()}
                          >
                            Save Query
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button 
                    size="sm" 
                    onClick={runQuery} 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Query
                      </>
                    )}
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