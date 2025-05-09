import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Check, Code, AlertCircle } from "lucide-react";
import { format } from "sql-formatter";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  runQuery?: () => void;
  isReadOnly?: boolean;
};

export function CodeEditor({
  value,
  onChange,
  language = "sql",
  height = "200px",
  runQuery,
  isReadOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  // In a real implementation, we would use CodeMirror or Monaco Editor
  // This is a simplified version for the prototype
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (formatError) setFormatError(null);
  };

  const copyToClipboard = () => {
    if (!value) return;
    
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatCode = () => {
    if (!value || language !== 'sql') return;
    
    try {
      const formattedSql = format(value, { language: 'postgresql' });
      onChange(formattedSql);
      setFormatError(null);
    } catch (error) {
      console.error('SQL formatting error:', error);
      setFormatError('Could not format SQL due to syntax errors');
      setTimeout(() => setFormatError(null), 3000);
    }
  };

  // Add keyboard shortcuts for running query and formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If Ctrl+Enter or Cmd+Enter is pressed and runQuery is provided
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && runQuery) {
        e.preventDefault();
        runQuery();
      }
      
      // If Shift+Alt+F is pressed for formatting
      if (e.shiftKey && e.altKey && e.key === "F") {
        e.preventDefault();
        formatCode();
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (editor) {
        editor.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [runQuery, value]);

  return (
    <div className="relative">
      <div className="relative bg-gray-800 rounded-md">
        <div className="flex justify-between items-center p-2 border-b border-gray-700">
          <div className="flex items-center">
            <span className="text-xs font-mono text-gray-400 uppercase">{language}</span>
            {formatError && (
              <div className="ml-4 text-xs text-red-400 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {formatError}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {language === 'sql' && (
              <Button
                variant="ghost" 
                size="sm"
                onClick={formatCode}
                className="text-gray-400 hover:text-white"
                title="Format SQL (Shift+Alt+F)"
              >
                <Code className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost" 
              size="sm"
              onClick={copyToClipboard}
              className="text-gray-400 hover:text-white"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            {runQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={runQuery}
                className="text-gray-400 hover:text-white"
                title="Run query (Ctrl+Enter)"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <textarea
          ref={editorRef}
          value={value}
          onChange={handleChange}
          className="w-full bg-gray-800 text-white p-4 font-mono text-sm resize-none outline-none"
          style={{ height }}
          readOnly={isReadOnly}
          placeholder={language === 'sql' ? "-- Write your SQL query here" : ""}
        />
      </div>
    </div>
  );
}
