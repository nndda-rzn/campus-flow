import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent?: "primary" | "accent" | "success" | "warning" | "info";
};

const ACCENT_STYLES: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

export function DashboardCard({
  href,
  title,
  description,
  icon,
  accent = "primary",
}: Props) {
  return (
    <Link
      href={href}
      className="card card-padded card-interactive group relative flex flex-col gap-4 overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${ACCENT_STYLES[accent]}`}
        >
          {icon}
        </div>
        <ArrowIcon />
      </div>

      <div>
        <h2 className="text-[14.5px] font-semibold leading-tight tracking-tight text-text-primary group-hover:text-primary transition-colors">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary line-clamp-2">
          {description}
        </p>
      </div>
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-text-disabled transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
