"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[14px] font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px] focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_rgba(37,99,235,0.16)] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[#2563EB] text-white border border-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-[#1D4ED8] hover:border-[#1D4ED8]",
        secondary:
          "bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F1F5F9] hover:border-[#94A3B8]",
        danger:
          "bg-[#DC2626] text-white border border-[#DC2626] shadow-[0_1px_2px_rgba(220,38,38,0.12)] hover:bg-[#B91C1C] hover:border-[#B91C1C] focus-visible:shadow-[0_0_0_4px_rgba(220,38,38,0.16)]",
        success:
          "bg-[#16A34A] text-white border border-[#16A34A] shadow-[0_1px_2px_rgba(22,163,74,0.12)] hover:bg-[#15803D] hover:border-[#15803D]",
        ghost:
          "bg-transparent text-[#475569] border border-transparent hover:bg-[#F1F5F9] hover:text-[#0F172A]",
        outline:
          "bg-transparent text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F1F5F9]",
        link: "bg-transparent text-[#2563EB] underline-offset-4 hover:underline border border-transparent",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-[15px]",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    // Radix Slot requires exactly ONE child. When using asChild, the child element
    // (e.g. <Link>) already wraps its own content, so we pass children through verbatim
    // and skip the loading spinner. Don't combine asChild + loading.
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
