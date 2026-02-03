import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, X, Loader2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => Promise<void>;
  onBulkCall: () => Promise<void>;
  isProcessing: boolean;
}

export const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkCall,
  isProcessing,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <span className="text-sm font-medium">
        {selectedCount} patient{selectedCount > 1 ? "s" : ""} selected
      </span>
      
      <div className="h-4 w-px bg-border" />
      
      <Select
        onValueChange={(value) => onBulkStatusUpdate(value)}
        disabled={isProcessing}
      >
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue placeholder="Update Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="completed">Mark Completed</SelectItem>
          <SelectItem value="opted_out">Mark Opted Out</SelectItem>
          <SelectItem value="active">Mark Active</SelectItem>
        </SelectContent>
      </Select>
      
      <Button
        size="sm"
        variant="default"
        onClick={onBulkCall}
        disabled={isProcessing}
        className="gap-1"
      >
        {isProcessing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Phone className="h-3 w-3" />
        )}
        Call Selected
      </Button>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={onClearSelection}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
