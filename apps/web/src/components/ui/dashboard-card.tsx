import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent?: "primary" | "accent" | "success" | "warning" | "info";
};

const ACCENT_BG: Record<NonNullable<Props["accent"]>, string> = {
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
      className="card card-padded group flex items-start gap-4 transition-all hover:border-border-strong hover:shadow-dropdown"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${ACCENT_BG[accent]}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h2 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary">
          {description}
        </p>
      </div>
      <ArrowIcon />
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-1 shrink-0 text-text-disabled transition-all group-hover:translate-x-1 group-hover:text-primary"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
