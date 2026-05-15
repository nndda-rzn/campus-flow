import * as React from "react";
import { cn } from "@/lib/cn";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3.5 flex size-11 items-center justify-center rounded-md border border-border bg-background-alt text-text-muted">
          {icon}
        </div>
      ) : null}
      <p className="text-[14.5px] font-semibold text-text-primary">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
