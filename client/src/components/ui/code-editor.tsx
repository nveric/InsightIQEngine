import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Check } from "lucide-react";

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

  // In a real implementation, we would use CodeMirror or Monaco Editor
  // This is a simplified version for the prototype
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const copyToClipboard = () => {
    if (!value) return;
    
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Add keyboard shortcuts for running query
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If Ctrl+Enter or Cmd+Enter is pressed and runQuery is provided
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && runQuery) {
        e.preventDefault();
        runQuery();
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
  }, [runQuery]);

  return (
    <div className="relative">
      <div className="relative bg-gray-800 rounded-md">
        <div className="flex justify-between items-center p-2 border-b border-gray-700">
          <span className="text-xs font-mono text-gray-400 uppercase">{language}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost" 
              size="sm"
              onClick={copyToClipboard}
              className="text-gray-400 hover:text-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            {runQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={runQuery}
                className="text-gray-400 hover:text-white"
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
        />
      </div>
    </div>
  );
}

import { useState } from "react";
