"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Global toast container — render once in app layout.
 * Use `toast.success(...)`, `toast.error(...)`, etc. from `sonner` to dispatch.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      duration={4500}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-surface text-text-primary shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_6px_rgba(15,23,42,0.04)] rounded-lg",
          title: "text-[13.5px] font-semibold tracking-tight",
          description: "text-[12.5px] text-text-muted",
          closeButton:
            "border border-border bg-surface text-text-muted hover:bg-background-alt",
          success: "!bg-[#dcfce7] !text-[#166534] !border-[#bbf7d0]",
          error: "!bg-[#fee2e2] !text-[#991b1b] !border-[#fecaca]",
          warning: "!bg-[#fef3c7] !text-[#92400e] !border-[#fde68a]",
          info: "!bg-[#cffafe] !text-[#155e75] !border-[#a5f3fc]",
        },
      }}
    />
  );
}
