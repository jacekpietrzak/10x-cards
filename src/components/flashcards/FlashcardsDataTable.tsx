import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { FlashcardDto, PaginationDto } from "@/lib/types";

interface FlashcardsDataTableProps {
  data: FlashcardDto[];
  pagination: PaginationDto;
  isLoading: boolean;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (flashcardId: number) => void;
  onPageChange: (page: number, limit: number) => void;
  isOperationInProgress?: boolean;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getSourceBadgeVariant(
  source: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (source) {
    case "ai-full":
      return "default";
    case "ai-edited":
      return "secondary";
    case "manual":
      return "outline";
    default:
      return "outline";
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case "ai-full":
      return "AI";
    case "ai-edited":
      return "AI edytowane";
    case "manual":
      return "Ręczne";
    default:
      return source;
  }
}

function DataTablePagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationDto;
  onPageChange: (page: number, limit: number) => void;
}) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const canGoPrevious = pagination.page > 1;
  const canGoNext = pagination.page < totalPages;

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Wyświetlanie {(pagination.page - 1) * pagination.limit + 1} do{" "}
        {Math.min(pagination.page * pagination.limit, pagination.total)} z{" "}
        {pagination.total} wyników
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            Strona {pagination.page} z {totalPages}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 transition-colors hover:bg-muted hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => onPageChange(pagination.page - 1, pagination.limit)}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 transition-colors hover:bg-muted hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => onPageChange(pagination.page + 1, pagination.limit)}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DataTableRowActions({
  flashcard,
  onEdit,
  onDelete,
  isOperationInProgress = false,
}: {
  flashcard: FlashcardDto;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (flashcardId: number) => void;
  isOperationInProgress?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 cursor-pointer transition-colors hover:bg-muted hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
          disabled={isOperationInProgress}
        >
          <span className="sr-only">Otwórz menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        <DropdownMenuItem
          onClick={() => onEdit(flashcard)}
          disabled={isOperationInProgress}
          className="cursor-pointer transition-colors hover:bg-muted focus:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edytuj
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(flashcard.id)}
          className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 transition-colors disabled:pointer-events-none disabled:opacity-50"
          disabled={isOperationInProgress}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Usuń
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FlashcardsDataTable({
  data,
  pagination,
  isLoading,
  onEdit,
  onDelete,
  onPageChange,
  isOperationInProgress = false,
}: FlashcardsDataTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Przód</TableHead>
                <TableHead>Tył</TableHead>
                <TableHead>Źródło</TableHead>
                <TableHead>Data utworzenia</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow
                  key={i}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Przód</TableHead>
                <TableHead>Tył</TableHead>
                <TableHead>Źródło</TableHead>
                <TableHead>Data utworzenia</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-muted-foreground">
                      Nie znaleziono fiszek.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dodaj swoją pierwszą fiszkę!
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Przód</TableHead>
              <TableHead>Tył</TableHead>
              <TableHead>Źródło</TableHead>
              <TableHead>Data utworzenia</TableHead>
              <TableHead className="w-[100px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((flashcard) => (
              <TableRow
                key={flashcard.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell
                  className="font-medium truncate max-w-md"
                  title={flashcard.front}
                >
                  {flashcard.front}
                </TableCell>
                <TableCell className="max-w-[300px]">
                  <div className="truncate" title={flashcard.back}>
                    {flashcard.back}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getSourceBadgeVariant(flashcard.source)}>
                    {getSourceLabel(flashcard.source)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(flashcard.created_at)}
                </TableCell>
                <TableCell>
                  <DataTableRowActions
                    flashcard={flashcard}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isOperationInProgress={isOperationInProgress}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination.total > pagination.limit && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
