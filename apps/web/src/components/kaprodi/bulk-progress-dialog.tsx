"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export interface BulkProgressItem {
  id: string;
  requestNumber: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

interface BulkProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approve" | "reject";
  items: BulkProgressItem[];
  onClose: () => void;
}

export function BulkProgressDialog({
  open,
  onOpenChange,
  action,
  items,
  onClose,
}: BulkProgressDialogProps) {
  const completed = items.filter(
    (i) => i.status === "success" || i.status === "error",
  ).length;
  const succeeded = items.filter((i) => i.status === "success").length;
  const failed = items.filter((i) => i.status === "error").length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;
  const isComplete = completed === items.length;

  const statusIcon = (status: BulkProgressItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="size-4 text-success" />;
      case "error":
        return <XCircle className="size-4 text-danger" />;
      case "processing":
        return <Loader2 className="size-4 animate-spin text-primary" />;
      default:
        return <Circle className="size-4 text-text-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isComplete
              ? action === "approve"
                ? "Bulk Approve Selesai"
                : "Bulk Reject Selesai"
              : action === "approve"
                ? "Memproses Approve..."
                : "Memproses Reject..."}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-text-muted">
                {completed}/{items.length} selesai
              </span>
              {isComplete && (
                <span className="text-text-secondary">
                  <span className="text-success">{succeeded} berhasil</span>
                  {failed > 0 && (
                    <>
                      {" "}
                      <span className="text-danger">{failed} gagal</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <Progress
              value={progress}
              className="h-2.5"
              indicatorClassName={cn(
                isComplete && failed === 0 && "bg-success",
                isComplete && failed > 0 && "bg-warning",
              )}
            />
          </div>

          {/* Items list */}
          <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-background-alt p-2">
            <ul className="space-y-1">
              {items.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-[12.5px]"
                >
                  {statusIcon(item.status)}
                  <span className="font-mono text-text-muted">
                    {item.requestNumber}
                  </span>
                  {item.error && (
                    <span className="ml-auto text-[11px] text-danger">
                      {item.error}
                    </span>
                  )}
                </motion.li>
              ))}
            </ul>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant={isComplete ? "primary" : "secondary"}
            onClick={onClose}
            disabled={!isComplete}
          >
            {isComplete ? "Selesai" : "Memproses..."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
