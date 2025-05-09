import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DownloadIcon, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DataTableProps<T> {
  columns: {
    key: string;
    header: string;
    cell?: (item: T) => React.ReactNode;
  }[];
  data: T[];
  isLoading?: boolean;
  onRefresh?: () => void;
  showExport?: boolean;
  enableSearch?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  onRefresh,
  showExport = false,
  enableSearch = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState<T[]>(data);

  useEffect(() => {
    if (!enableSearch || !searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = data.filter((item) => {
      return columns.some((column) => {
        const value = (item as any)[column.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      });
    });

    setFilteredData(filtered);
  }, [searchQuery, data, columns, enableSearch]);

  const exportData = () => {
    const headers = columns.map((col) => col.header).join(",");
    const rows = filteredData.map((item) => {
      return columns.map((column) => {
        const value = (item as any)[column.key];
        // Handle commas in values by wrapping in quotes
        return typeof value === "string" && value.includes(",") 
          ? `"${value}"`
          : value;
      }).join(",");
    }).join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {(enableSearch || onRefresh || showExport) && (
        <div className="flex justify-between items-center">
          {enableSearch && (
            <div className="relative w-72">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          <div className="flex space-x-2 ml-auto">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={filteredData.length === 0}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column.key}`}>
                      {column.cell
                        ? column.cell(row)
                        : (row as any)[column.key] !== undefined
                        ? String((row as any)[column.key])
                        : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
