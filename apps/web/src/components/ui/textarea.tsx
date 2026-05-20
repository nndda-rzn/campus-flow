import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-[#0F172A] placeholder:text-[#94A3B8] resize-y",
          "transition-[border-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)]",
          "focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]",
          "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
