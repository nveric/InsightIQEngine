import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Database, Table } from 'lucide-react';

interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface TableSchema {
  name: string;
  columns: Column[];
}

interface SchemaBrowserProps {
  dataSourceId?: number;
  isLoading?: boolean;
  onTableClick?: (tableName: string) => void;
  onColumnClick?: (tableName: string, columnName: string) => void;
}

export function SchemaBrowser({
  dataSourceId,
  isLoading = false,
  onTableClick,
  onColumnClick
}: SchemaBrowserProps) {
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataSourceId) return;

    setLoading(true);
    setError(null);

    // Fetch the schema for the selected data source
    fetch(`/api/datasources/${dataSourceId}/schema`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching schema: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setSchema(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching schema:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [dataSourceId]);

  // Filter schema based on search term
  const filteredSchema = searchTerm.trim()
    ? schema.filter(table => 
        table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.columns.some(column => 
          column.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : schema;

  if (loading || isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b">
          <h3 className="text-sm font-medium flex items-center text-gray-700">
            <Database className="mr-2 h-4 w-4" />
            Schema Browser
          </h3>
        </div>
        <div className="p-4 flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b">
          <h3 className="text-sm font-medium flex items-center text-gray-700">
            <Database className="mr-2 h-4 w-4" />
            Schema Browser
          </h3>
        </div>
        <div className="p-4 text-sm text-red-500">
          {error}
        </div>
      </div>
    );
  }

  if (!dataSourceId) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b">
          <h3 className="text-sm font-medium flex items-center text-gray-700">
            <Database className="mr-2 h-4 w-4" />
            Schema Browser
          </h3>
        </div>
        <div className="p-4 text-sm text-gray-500">
          Please select a data source to view its schema.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-medium flex items-center text-gray-700">
          <Database className="mr-2 h-4 w-4" />
          Schema Browser
        </h3>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tables or columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-2">
        {filteredSchema.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">
            {searchTerm ? "No matching tables or columns found." : "No tables available."}
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filteredSchema.map((table) => (
              <AccordionItem key={table.name} value={table.name}>
                <AccordionTrigger
                  className="text-sm py-2 hover:bg-gray-50 rounded px-2"
                  onClick={(e) => {
                    // Prevent accordion from toggling if we're clicking for selection
                    if (onTableClick) {
                      e.stopPropagation();
                      onTableClick(table.name);
                    }
                  }}
                >
                  <span className="flex items-center">
                    <Table className="mr-2 h-4 w-4 text-gray-600" />
                    {table.name}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1 pl-6">
                    {table.columns.map((column) => (
                      <li 
                        key={column.name}
                        className="flex items-center text-xs py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => onColumnClick && onColumnClick(table.name, column.name)}
                      >
                        <span className={`mr-1 ${column.isPrimaryKey ? 'text-amber-500' : column.isForeignKey ? 'text-indigo-500' : 'text-gray-500'}`}>
                          {column.isPrimaryKey ? '🔑' : column.isForeignKey ? '🔗' : ''}
                        </span>
                        <span className="font-medium">{column.name}</span>
                        <span className="ml-1 text-gray-400 text-xs">({column.type})</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );
}
