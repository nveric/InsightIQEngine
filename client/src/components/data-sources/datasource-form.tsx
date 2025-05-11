import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { InsertDataSource, DataSource } from '@shared/schema';

interface DataSourceFormProps {
  dataSource?: DataSource;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DataSourceForm({ dataSource, onSuccess, onCancel }: DataSourceFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<InsertDataSource>({
    defaultValues: dataSource || {
      type: 'postgresql',
      ssl: false
    }
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data: InsertDataSource) => {
    try {
      const url = dataSource ? `/api/data-sources/${dataSource.id}` : '/api/data-sources';
      const method = dataSource ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save data source');
      }

      toast({
        title: 'Success',
        description: `Data source ${dataSource ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save data source',
        variant: 'destructive'
      });
    }
  };

  const testConnection = async (data: InsertDataSource) => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/data-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      toast({
        title: 'Success',
        description: 'Connection test successful',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Connection test failed',
        variant: 'destructive'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Name is required' })}
            placeholder="My Database"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            {...register('type')}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            {...register('host', { required: 'Host is required' })}
            placeholder="localhost"
          />
          {errors.host && (
            <p className="text-sm text-red-500">{errors.host.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            {...register('port', { required: 'Port is required' })}
            placeholder="5432"
          />
          {errors.port && (
            <p className="text-sm text-red-500">{errors.port.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="database">Database</Label>
          <Input
            id="database"
            {...register('database', { required: 'Database is required' })}
            placeholder="mydatabase"
          />
          {errors.database && (
            <p className="text-sm text-red-500">{errors.database.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...register('username', { required: 'Username is required' })}
            placeholder="user"
          />
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="ssl" {...register('ssl')} />
          <Label htmlFor="ssl">Use SSL</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="button" 
          variant="secondary"
          onClick={handleSubmit(testConnection)}
          disabled={isTestingConnection}
        >
          {isTestingConnection ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button type="submit">
          {dataSource ? 'Update' : 'Create'} Data Source
        </Button>
      </div>
    </form>
  );
}