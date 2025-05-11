
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SavedQuery } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { History, Share2, Tag } from 'lucide-react';

interface SavedQueriesManagerProps {
  onLoadQuery: (query: SavedQuery) => void;
}

export function SavedQueriesManager({ onLoadQuery }: SavedQueriesManagerProps) {
  const { toast } = useToast();
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  const loadVersion = async (version: number) => {
    try {
      const response = await apiRequest(
        'GET',
        `/api/queries/${selectedQuery?.id}/versions/${version}`
      );
      const versionData = await response.json();
      onLoadQuery(versionData);
      setIsVersionHistoryOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load query version',
        variant: 'destructive',
      });
    }
  };

  const shareQuery = async (isPublic: boolean) => {
    try {
      await apiRequest('PATCH', `/api/queries/${selectedQuery?.id}`, {
        isPublic,
      });
      toast({
        title: 'Success',
        description: `Query is now ${isPublic ? 'public' : 'private'}`,
      });
      setIsShareDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update query sharing settings',
        variant: 'destructive',
      });
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    
    try {
      await apiRequest('POST', `/api/queries/${selectedQuery?.id}/tags`, {
        name: newTag,
      });
      setNewTag('');
      // Refresh query data
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {selectedQuery && (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVersionHistoryOpen(true)}
            >
              <History className="h-4 w-4 mr-2" />
              Version History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-32"
            />
            <Button variant="outline" size="sm" onClick={addTag}>
              <Tag className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </div>

          <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Version History</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {selectedQuery.versions?.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>Version {version.version}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadVersion(version.version)}
                    >
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Query</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={selectedQuery.isPublic ? 'public' : 'private'}
                    onValueChange={(value) => shareQuery(value === 'public')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
