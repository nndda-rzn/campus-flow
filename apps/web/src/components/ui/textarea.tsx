import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-[14px] leading-relaxed text-text-primary placeholder:text-text-disabled resize-y",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(30,58,138,0.12)]",
          "disabled:bg-background-alt disabled:text-text-disabled disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
