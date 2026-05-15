import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium leading-tight tracking-[0.01em] whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-[#f1f5f9] text-[#334155] border-[#e2e8f0]",
        info: "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
        accent: "bg-[#cffafe] text-[#155e75] border-[#a5f3fc]",
        success: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
        danger: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
        warning: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
        completed: "bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]",
        assigned: "bg-[#e0e7ff] text-[#3730a3] border-[#c7d2fe]",
        outline: "bg-transparent text-text-secondary border-border-strong",
      },
      withDot: {
        true: "before:content-[''] before:size-1.5 before:rounded-full before:bg-current",
      },
    },
    defaultVariants: {
      variant: "neutral",
      withDot: true,
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, withDot, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, withDot }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
