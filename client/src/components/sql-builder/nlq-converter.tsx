
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';
import { NLQService } from './nlq-service';
import { useToast } from '@/hooks/use-toast';

interface NLQConverterProps {
  schema: any;
  dataSourceType: string;
  onQueryGenerated: (sql: string) => void;
}

export const NlqConverter = ({ schema, dataSourceType, onQueryGenerated }: NLQConverterProps) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!question.trim()) return;

    try {
      setIsLoading(true);
      const response = await NLQService.generateQuery({
        question,
        schema,
        dataSourceType
      });

      onQueryGenerated(response.sql);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate SQL query",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-lg font-semibold">Natural Language Query</CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="Ask a question about your data..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
