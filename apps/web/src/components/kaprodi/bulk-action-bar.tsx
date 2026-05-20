"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BulkActionBarProps {
  selectedCount: number;
  note: string;
  onNoteChange: (note: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  isProcessing: boolean;
}

export function BulkActionBar({
  selectedCount,
  note,
  onNoteChange,
  onApprove,
  onReject,
  onClear,
  isProcessing,
}: BulkActionBarProps) {
  const canReject = note.trim().length > 0;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none"
        >
          <div className="mx-auto max-w-4xl pointer-events-auto">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              {/* Left: Selection info & note input */}
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <motion.div
                    key={selectedCount}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  >
                    {selectedCount}
                  </motion.div>
                  <span className="text-sm font-medium text-text-primary">
                    pengajuan dipilih
                  </span>
                </div>
                <Input
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder="Catatan (wajib untuk tolak)..."
                  className="h-9 flex-1 sm:max-w-xs"
                  disabled={isProcessing}
                />
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClear}
                  disabled={isProcessing}
                  aria-label="Batal pilih"
                >
                  <X className="size-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onReject}
                  disabled={isProcessing || !canReject}
                  loading={isProcessing}
                  title={
                    !canReject
                      ? "Catatan wajib diisi untuk penolakan"
                      : undefined
                  }
                >
                  <XCircle className="size-3.5" />
                  Tolak {selectedCount}
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={onApprove}
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  <CheckCircle2 className="size-3.5" />
                  Setujui {selectedCount}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
