import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  DataSource, 
} from '@shared/schema';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  RefreshCw,
  Database,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface DataSourceTableProps {
  onEditDataSource: (dataSource: DataSource) => void;
  onOpenBuilder: (dataSourceId: number) => void;
}

export function DataSourceTable({ 
  onEditDataSource,
  onOpenBuilder
}: DataSourceTableProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataSourceToDelete, setDataSourceToDelete] = useState<DataSource | null>(null);

  const { data: dataSources, isLoading, refetch } = useQuery<DataSource[]>({
    queryKey: ['/api/datasources'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/datasources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/datasources'] });
      toast({
        title: 'Data source deleted',
        description: 'The data source has been successfully deleted',
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete data source',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (dataSource: DataSource) => {
    setDataSourceToDelete(dataSource);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (dataSourceToDelete) {
      deleteMutation.mutate(dataSourceToDelete.id);
    }
  };

  const refreshStatus = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('POST', `/api/datasources/${id}/test`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/datasources'] });
      toast({
        title: 'Connection tested',
        description: 'The data source connection has been tested successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection test failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      cell: (dataSource: DataSource) => (
        <div className="flex items-center">
          <Database className="mr-2 h-4 w-4 text-gray-500" />
          <span className="font-medium">{dataSource.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (dataSource: DataSource) => (
        <span className="capitalize">{dataSource.type}</span>
      ),
    },
    {
      key: 'host',
      header: 'Host',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (dataSource: DataSource) => (
        <Badge 
          variant={dataSource.status === 'active' ? 'outline' : 'destructive'} 
          className={dataSource.status === 'active' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-red-100 text-red-800 border-red-200'
          }
        >
          {dataSource.status}
        </Badge>
      ),
    },
    {
      key: 'lastSynced',
      header: 'Last Synced',
      cell: (dataSource: DataSource) => (
        <span>
          {dataSource.lastSynced 
            ? format(parseISO(dataSource.lastSynced.toString()), 'MMM d, yyyy HH:mm')
            : 'Never'
          }
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (dataSource: DataSource) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpenBuilder(dataSource.id)}>
                <Play className="mr-2 h-4 w-4" />
                Query Builder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => refreshStatus.mutate(dataSource.id)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditDataSource(dataSource)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600" 
                onClick={() => handleDelete(dataSource)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={dataSources || []}
        isLoading={isLoading}
        onRefresh={() => refetch()}
        showExport={true}
        enableSearch={true}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the data source "{dataSourceToDelete?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
