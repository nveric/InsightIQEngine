import { useState, useEffect } from 'react';
import { Database, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { TableSchema } from '@shared/schema';

interface SchemaBrowserProps {
  dataSourceId?: number;
  onTableClick?: (tableName: string) => void;
  onColumnClick?: (tableName: string, columnName: string) => void;
}

export function SchemaBrowser({ dataSourceId, onTableClick, onColumnClick }: SchemaBrowserProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const { data: schema, isLoading, error } = useQuery({
    queryKey: ['schema', dataSourceId],
    queryFn: async () => {
      if (!dataSourceId) return null;
      const res = await apiRequest('GET', `/api/datasources/${dataSourceId}/schema`);
      return res.json() as Promise<TableSchema[]>;
    },
    enabled: !!dataSourceId
  });

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  if (isLoading) {
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
          Failed to load schema
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
      <div className="overflow-y-auto flex-1 p-2">
        {schema?.map((table) => (
          <div key={table.name} className="mb-2">
            <button
              onClick={() => {
                toggleTable(table.name);
                onTableClick?.(table.name);
              }}
              className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center text-sm"
            >
              {expandedTables.has(table.name) ? (
                <ChevronDown className="h-4 w-4 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              {table.name}
            </button>
            
            {expandedTables.has(table.name) && (
              <div className="ml-6 mt-1">
                {table.columns.map((column) => (
                  <button
                    key={column.name}
                    onClick={() => onColumnClick?.(table.name, column.name)}
                    className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm flex items-center"
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${column.isPrimaryKey ? 'bg-yellow-400' : column.isForeignKey ? 'bg-blue-400' : 'bg-gray-400'}`} />
                    <span>{column.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{column.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="overflow-auto flex-1">
        {schema?.map((table) => (
          <div key={table.name} className="border-b last:border-b-0">
            <button
              className="w-full px-4 py-2 flex items-center hover:bg-gray-50 text-left"
              onClick={() => {
                toggleTable(table.name);
                onTableClick?.(table.name);
              }}
            >
              {expandedTables.has(table.name) ? (
                <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
              )}
              <span className="font-medium text-sm">{table.name}</span>
            </button>

            {expandedTables.has(table.name) && (
              <div className="bg-gray-50 px-4 py-2">
                {table.columns.map((column) => (
                  <button
                    key={column.name}
                    className="w-full px-4 py-1 text-left hover:bg-gray-100 rounded text-sm flex items-center"
                    onClick={() => onColumnClick?.(table.name, column.name)}
                  >
                    <span className="flex-1">{column.name}</span>
                    <span className="text-xs text-gray-500">{column.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}