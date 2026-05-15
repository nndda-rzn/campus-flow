import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-border-strong bg-surface px-3 py-1 text-[14px] text-text-primary placeholder:text-text-disabled",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "hover:not(:focus):not(:disabled):border-text-muted",
          "focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(30,58,138,0.12)]",
          "disabled:bg-background-alt disabled:text-text-disabled disabled:cursor-not-allowed",
          "file:border-0 file:bg-transparent file:text-[13px] file:font-medium",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
