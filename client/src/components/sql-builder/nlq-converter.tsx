import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';
import { NLQService, NLQRequest, NLQResponse } from './nlq-service';
import { useToast } from '@/hooks/use-toast';

interface NLQConverterProps {
  schema: any;
  dataSourceType: string;
  onQueryGenerated: (sql: string) => void;
}

export function NLQConverter({ schema, dataSourceType, onQueryGenerated }: NLQConverterProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<NLQResponse | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!question.trim()) return;

    try {
      setIsLoading(true);
      const request: NLQRequest = {
        question,
        schema,
        dataSourceType
      };

      const response = await NLQService.generateQuery(request);
      setLastResponse(response);

      if (response.confidence > 0.7) {
        const isValid = await NLQService.validateQuery(response.sql);
        if (isValid) {
          onQueryGenerated(response.sql);
        } else {
          toast({
            title: "Warning",
            description: "Generated query might not be accurate",
            variant: "warning"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate SQL query",
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

        {lastResponse && (
          <div className="mt-4 text-sm">
            <p className="font-medium">Explanation:</p>
            <p className="text-muted-foreground">{lastResponse.explanation}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Confidence: {Math.round(lastResponse.confidence * 100)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}