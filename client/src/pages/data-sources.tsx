import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DataSourceTable } from '@/components/data-sources/datasource-table';
import { DataSourceForm } from '@/components/data-sources/datasource-form';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocation } from 'wouter';
import { Plus, Database } from 'lucide-react';
import { DataSource } from '@shared/schema';

export default function DataSources() {
  const [_, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | undefined>();
  
  const openNewDataSourceForm = () => {
    setEditingDataSource(undefined);
    setShowForm(true);
  };
  
  const openEditDataSourceForm = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    setShowForm(true);
  };
  
  const closeForm = () => {
    setShowForm(false);
    setEditingDataSource(undefined);
  };
  
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDataSource(undefined);
  };
  
  const navigateToSqlBuilder = (dataSourceId: number) => {
    // Navigate to SQL builder with the selected data source
    setLocation(`/sql-builder?dataSource=${dataSourceId}`);
  };

  return (
    <AppShell title="Data Sources">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-gray-700 text-sm font-medium">Manage connections to your databases</h2>
        </div>
        <Button onClick={openNewDataSourceForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Data Source
        </Button>
      </div>
      
      <DataSourceTable 
        onEditDataSource={openEditDataSourceForm}
        onOpenBuilder={navigateToSqlBuilder}
      />
      
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              {editingDataSource ? 'Edit Data Source' : 'New Data Source'}
            </DialogTitle>
            <DialogDescription>
              {editingDataSource 
                ? 'Update your connection settings for this data source.' 
                : 'Connect to your database to start analyzing your data.'}
            </DialogDescription>
          </DialogHeader>
          
          <DataSourceForm 
            dataSource={editingDataSource}
            onSuccess={handleFormSuccess}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
