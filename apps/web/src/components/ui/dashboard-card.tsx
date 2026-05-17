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
  primary: "bg-primary text-text-inverse",
  accent: "bg-accent text-text-inverse",
  success: "bg-success text-text-inverse",
  warning: "bg-warning text-text-inverse",
  info: "bg-info text-text-inverse",
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
      className="card card-padded card-interactive group relative flex flex-col gap-5 overflow-hidden cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 ring-black/5 ${ACCENT_STYLES[accent]}`}
        >
          {icon}
        </div>
        <ArrowIcon />
      </div>

      <div>
        <h2 className="font-display text-[17px] font-semibold leading-tight tracking-tight text-text-primary transition-colors group-hover:text-accent">
          {title}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary line-clamp-2">
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
      className="shrink-0 text-text-disabled transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
