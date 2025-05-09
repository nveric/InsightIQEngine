import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeEditor } from '@/components/ui/code-editor';
import { BrainCircuit, Sparkles, Loader2 } from 'lucide-react';

interface NlqConverterProps {
  dataSourceId?: number;
  onSqlGenerated?: (sql: string) => void;
}

export function NlqConverter({
  dataSourceId,
  onSqlGenerated
}: NlqConverterProps) {
  const [question, setQuestion] = useState('');
  const [sql, setSql] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
  };

  const convertToSql = async () => {
    if (!dataSourceId) {
      setError('Please select a data source');
      return;
    }

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSql('');

    try {
      const response = await fetch(`/api/datasources/${dataSourceId}/nlq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const data = await response.json();
      setSql(data.sql);
      
      if (onSqlGenerated) {
        onSqlGenerated(data.sql);
      }
    } catch (err) {
      console.error('Error converting to SQL:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQuestions = [
    "Show me total sales by product category for the last month",
    "Which customers spent the most in 2023?",
    "List the top 5 cities by order count",
    "What is the average order value by day of week?",
    "Compare revenue growth between this year and last year by quarter"
  ];

  const handleExampleClick = (example: string) => {
    setQuestion(example);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-medium flex items-center text-gray-700">
          <BrainCircuit className="mr-2 h-4 w-4" />
          Natural Language to SQL
        </h3>
      </div>
      
      <div className="p-4 flex flex-col space-y-4 flex-1">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
            Ask a question in plain English
          </label>
          <Textarea
            id="question"
            placeholder="e.g., Show me total sales by region for the last quarter"
            value={question}
            onChange={handleQuestionChange}
            className="min-h-[100px]"
          />
        </div>
        
        <Button 
          onClick={convertToSql} 
          disabled={isLoading || !dataSourceId || !question.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating SQL...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate SQL
            </>
          )}
        </Button>
        
        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}
        
        {sql && (
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generated SQL
            </label>
            <div className="flex-1">
              <CodeEditor 
                value={sql} 
                onChange={setSql} 
                language="sql" 
                height="100%" 
                isReadOnly={true}
              />
            </div>
          </div>
        )}
        
        {!sql && !isLoading && (
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-2">Example questions:</div>
            <ScrollArea className="h-[calc(100%-2rem)]">
              <ul className="space-y-2">
                {exampleQuestions.map((example, index) => (
                  <li key={index}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleExampleClick(example)}
                    >
                      <span className="mr-2">💡</span>
                      {example}
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
