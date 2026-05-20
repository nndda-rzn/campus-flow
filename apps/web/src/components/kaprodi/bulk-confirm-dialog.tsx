"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BulkConfirmItem {
  id: string;
  requestNumber: string;
  title: string;
  serviceName: string;
}

interface BulkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approve" | "reject";
  items: BulkConfirmItem[];
  note: string;
  onNoteChange: (note: string) => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function BulkConfirmDialog({
  open,
  onOpenChange,
  action,
  items,
  note,
  onNoteChange,
  onConfirm,
  isProcessing,
}: BulkConfirmDialogProps) {
  const isApprove = action === "approve";
  const canConfirm = isApprove || note.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <>
                <CheckCircle2 className="size-5 text-success" />
                Konfirmasi Bulk Approve
              </>
            ) : (
              <>
                <AlertTriangle className="size-5 text-warning" />
                Konfirmasi Bulk Reject
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `Anda akan menyetujui ${items.length} pengajuan berikut:`
              : `Anda akan menolak ${items.length} pengajuan berikut:`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Items preview */}
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background-alt p-2">
            <ul className="space-y-1.5">
              {items.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-2 text-[13px]"
                >
                  <span className="mt-0.5 text-text-muted">•</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] text-text-muted">
                      {item.requestNumber}
                    </span>
                    <span className="mx-1.5 text-text-muted">—</span>
                    <span className="text-text-primary">{item.title}</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Note input */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-note">
              Catatan{" "}
              {isApprove ? (
                <span className="font-normal text-text-muted">(opsional)</span>
              ) : (
                <span className="font-normal text-danger">(wajib)</span>
              )}
            </Label>
            <Textarea
              id="bulk-note"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={
                isApprove
                  ? "Catatan tambahan untuk Tata Usaha..."
                  : "Jelaskan alasan penolakan..."
              }
              className="min-h-20"
              disabled={isProcessing}
            />
            {!isApprove && (
              <p className="flex items-center gap-1.5 text-[11.5px] text-warning">
                <AlertTriangle className="size-3" />
                Catatan ini akan dikirim ke semua mahasiswa terkait.
              </p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isProcessing}>
              Batal
            </Button>
          </DialogClose>
          {isApprove ? (
            <Button
              variant="success"
              onClick={onConfirm}
              loading={isProcessing}
              disabled={!canConfirm}
            >
              <CheckCircle2 className="size-3.5" />
              Setujui {items.length} Pengajuan
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={onConfirm}
              loading={isProcessing}
              disabled={!canConfirm}
            >
              <XCircle className="size-3.5" />
              Tolak {items.length} Pengajuan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
