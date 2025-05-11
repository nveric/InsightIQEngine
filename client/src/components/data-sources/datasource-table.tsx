import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { DataSource } from '@shared/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Database, MoreHorizontal, Edit, Trash2, Terminal } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DataSourceTableProps {
  onEditDataSource: (dataSource: DataSource) => void;
  onOpenBuilder: (dataSourceId: number) => void;
}

export function DataSourceTable({ onEditDataSource, onOpenBuilder }: DataSourceTableProps) {
  const { data: dataSources, isLoading } = useQuery({
    queryKey: ['/api/datasources'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/datasources');
      return res.json();
    }
  });

  const deleteDataSource = async (id: number) => {
    await apiRequest('DELETE', `/api/datasources/${id}`);
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['/api/datasources'] });
  };

  if (isLoading) {
    return <div>Loading data sources...</div>;
  }

  if (!dataSources?.length) {
    return (
      <div className="text-center py-10">
        <Database className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data sources</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding a new data source.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Synced</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataSources.map((dataSource) => (
          <TableRow key={dataSource.id}>
            <TableCell>
              <div className="flex items-center">
                <Database className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-medium">{dataSource.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="capitalize">{dataSource.type}</span>
            </TableCell>
            <TableCell>{dataSource.host}</TableCell>
            <TableCell>
              <Badge 
                variant={dataSource.status === 'active' ? 'outline' : 'destructive'} 
                className={dataSource.status === 'active' 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                {dataSource.status}
              </Badge>
            </TableCell>
            <TableCell>
              {dataSource.lastSynced 
                ? format(parseISO(dataSource.lastSynced.toString()), 'MMM d, yyyy HH:mm')
                : 'Never'
              }
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenBuilder(dataSource.id)}>
                    <Terminal className="mr-2 h-4 w-4" />
                    Open in SQL Builder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditDataSource(dataSource)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => deleteDataSource(dataSource.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Synced</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataSources?.map((dataSource: DataSource) => (
          <TableRow key={dataSource.id}>
            <TableCell>
              <div className="flex items-center">
                <Database className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-medium">{dataSource.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="capitalize">{dataSource.type}</span>
            </TableCell>
            <TableCell>{dataSource.host}</TableCell>
            <TableCell>
              <Badge 
                variant={dataSource.status === 'active' ? 'outline' : 'destructive'} 
                className={dataSource.status === 'active' 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                {dataSource.status}
              </Badge>
            </TableCell>
            <TableCell>
              {dataSource.lastSynced 
                ? format(parseISO(dataSource.lastSynced.toString()), 'MMM d, yyyy HH:mm')
                : 'Never'
              }
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenBuilder(dataSource.id)}>
                    <Terminal className="mr-2 h-4 w-4" />
                    Open in SQL Builder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditDataSource(dataSource)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => deleteDataSource(dataSource.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}