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
          "flex h-[42px] w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3.5 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8]",
          "transition-[border-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)]",
          "hover:not(:focus):not(:disabled):border-[#CBD5E1]",
          "focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]",
          "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
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
