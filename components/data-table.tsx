import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  keyExtractor?: (row: T, index: number) => string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No results.",
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-12">
                <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <span className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                    <Inbox className="size-5" />
                  </span>
                  <span>{emptyMessage}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={keyExtractor ? keyExtractor(row, i) : String(i)}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
