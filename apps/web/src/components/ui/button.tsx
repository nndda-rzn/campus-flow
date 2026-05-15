"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13.5px] font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-55 active:translate-y-[0.5px] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(30,58,138,0.12)] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-text-inverse border border-primary shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-primary-hover hover:border-primary-hover",
        secondary:
          "bg-surface text-text-primary border border-border-strong hover:bg-background-alt hover:border-text-muted",
        danger:
          "bg-danger text-text-inverse border border-danger shadow-[0_1px_2px_rgba(220,38,38,0.12)] hover:bg-[#b91c1c] hover:border-[#b91c1c] focus-visible:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]",
        success:
          "bg-success text-text-inverse border border-success shadow-[0_1px_2px_rgba(22,163,74,0.12)] hover:bg-[#15803d] hover:border-[#15803d]",
        ghost:
          "bg-transparent text-text-secondary border border-transparent hover:bg-background-alt hover:text-text-primary",
        outline:
          "bg-transparent text-text-primary border border-border-strong hover:bg-background-alt",
        link: "bg-transparent text-primary underline-offset-4 hover:underline border border-transparent",
      },
      size: {
        sm: "h-8 px-2.5 text-[12.5px]",
        md: "h-9 px-3.5",
        lg: "h-10 px-4 text-[14.5px]",
        icon: "h-9 w-9 p-0",
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
