"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import type { UserProfile, UserRole } from "@/types/auth";
import { clearAuthSession } from "@/lib/auth-storage";
import { CommandPalette } from "@/components/layout/command-palette";

// ─── Navigation Definition ───────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

function getNavigation(role: UserRole): NavGroup[] {
  switch (role) {
    case "MAHASISWA":
      return [
        {
          items: [
            { label: "Dashboard", href: "/student", icon: <IconHome /> },
            {
              label: "Layanan Akademik",
              href: "/student/academic-requests",
              icon: <IconDocument />,
            },
            {
              label: "Dosen Pembimbing",
              href: "/student/supervisor-requests",
              icon: <IconUsers />,
            },
            {
              label: "Logbook Bimbingan",
              href: "/student/guidance-logs",
              icon: <IconBook />,
            },
            {
              label: "Progress Skripsi",
              href: "/student/thesis-progress",
              icon: <IconTarget />,
            },
            {
              label: "Konsultasi",
              href: "/student/consultation",
              icon: <IconClipboard />,
            },
            {
              label: "Kalender Akademik",
              href: "/student/calendar",
              icon: <IconCalendar />,
            },
            {
              label: "Direktori Dosen",
              href: "/student/lecturers",
              icon: <IconUsers />,
            },
            {
              label: "FAQ & Panduan",
              href: "/student/faq",
              icon: <IconHelpCircle />,
            },
            {
              label: "Notifikasi",
              href: "/notifications",
              icon: <IconBell />,
            },
          ],
        },
      ];

    case "ADMIN_PRODI":
      return [
        {
          title: "Workspace",
          items: [
            { label: "Dashboard", href: "/admin", icon: <IconHome /> },
            {
              label: "Layanan Akademik",
              href: "/admin/academic-requests",
              icon: <IconDocument />,
            },
            {
              label: "Pembimbing",
              href: "/admin/supervisor-requests",
              icon: <IconUsers />,
            },
          ],
        },
        {
          title: "Data Master",
          items: [
            {
              label: "Mahasiswa",
              href: "/admin/students",
              icon: <IconGraduationCap />,
            },
            {
              label: "Dosen",
              href: "/admin/lecturers",
              icon: <IconUsers />,
            },
          ],
        },
        {
          title: "Lainnya",
          items: [
            { label: "Pengumuman", href: "/admin/announcements", icon: <IconMegaphone /> },
            { label: "Reporting", href: "/reports", icon: <IconChart /> },
            {
              label: "Notifikasi",
              href: "/notifications",
              icon: <IconBell />,
            },
          ],
        },
      ];

    case "KAPRODI":
      return [
        {
          title: "Workspace",
          items: [
            { label: "Dashboard", href: "/head", icon: <IconHome /> },
            {
              label: "Layanan Akademik",
              href: "/head/academic-requests",
              icon: <IconDocument />,
            },
            {
              label: "Pembimbing",
              href: "/head/supervisor-requests",
              icon: <IconUsers />,
            },
            {
              label: "Kuota Dosen",
              href: "/head/lecturer-quotas",
              icon: <IconChart />,
            },
          ],
        },
        {
          title: "Lainnya",
          items: [
            { label: "Reporting", href: "/reports", icon: <IconChart /> },
            {
              label: "Notifikasi",
              href: "/notifications",
              icon: <IconBell />,
            },
          ],
        },
      ];

    case "DOSEN":
      return [
        {
          items: [
            { label: "Dashboard", href: "/lecturer", icon: <IconHome /> },
            {
              label: "Bimbingan",
              href: "/lecturer/supervisor-requests",
              icon: <IconUsers />,
            },
            {
              label: "Logbook Bimbingan",
              href: "/lecturer/guidance-logs",
              icon: <IconBook />,
            },
            {
              label: "Mahasiswa Bimbingan",
              href: "/lecturer/supervised-students",
              icon: <IconGraduationCap />,
            },
            {
              label: "Jadwal Bimbingan",
              href: "/lecturer/consultation",
              icon: <IconCalendar />,
            },
            {
              label: "Booking Masuk",
              href: "/lecturer/consultation/bookings",
              icon: <IconClipboard />,
            },
            {
              label: "Review Skripsi",
              href: "/lecturer/final-documents",
              icon: <IconDocument />,
            },
            {
              label: "Pengumuman",
              href: "/lecturer/announcements",
              icon: <IconMegaphone />,
            },
            {
              label: "Notifikasi",
              href: "/notifications",
              icon: <IconBell />,
            },
          ],
        },
      ];

    case "TATA_USAHA":
      return [
        {
          title: "Workspace",
          items: [
            { label: "Dashboard", href: "/staff", icon: <IconHome /> },
            {
              label: "Pengajuan Akademik",
              href: "/staff/academic-requests",
              icon: <IconDocument />,
            },
            {
              label: "Dokumen Final",
              href: "/staff/final-documents",
              icon: <IconDocument />,
            },
          ],
        },
        {
          title: "Lainnya",
          items: [
            { label: "Reporting", href: "/reports", icon: <IconChart /> },
            {
              label: "Notifikasi",
              href: "/notifications",
              icon: <IconBell />,
            },
          ],
        },
      ];

    case "SUPER_ADMIN":
      return [
        {
          title: "Workspace",
          items: [
            { label: "Dashboard", href: "/admin", icon: <IconHome /> },
            {
              label: "Layanan Akademik",
              href: "/admin/academic-requests",
              icon: <IconDocument />,
            },
            {
              label: "Pembimbing",
              href: "/admin/supervisor-requests",
              icon: <IconUsers />,
            },
          ],
        },
        {
          title: "Administrasi",
          items: [
            {
              label: "Pengguna",
              href: "/admin/users",
              icon: <IconShield />,
            },
            {
              label: "Mahasiswa",
              href: "/admin/students",
              icon: <IconGraduationCap />,
            },
            {
              label: "Dosen",
              href: "/admin/lecturers",
              icon: <IconUsers />,
            },
            {
              label: "Program Studi",
              href: "/admin/departments",
              icon: <IconBuilding />,
            },
            {
              label: "Audit Log",
              href: "/admin/audit-logs",
              icon: <IconChart />,
            },
            {
              label: "Tahun Akademik",
              href: "/admin/academic-years",
              icon: <IconCalendar />,
            },
            {
              label: "Kalender Akademik",
              href: "/admin/calendar",
              icon: <IconCalendar />,
            },
            {
              label: "FAQ & Panduan",
              href: "/admin/faqs",
              icon: <IconHelpCircle />,
            },
            {
              label: "Milestone Skripsi",
              href: "/admin/thesis-milestones",
              icon: <IconTarget />,
            },
          ],
        },
        {
          title: "Lainnya",
          items: [
            { label: "Pengumuman", href: "/admin/announcements", icon: <IconMegaphone /> },
            { label: "Reporting", href: "/reports", icon: <IconChart /> },
            {
              label: "Notifikasi",
              href: "/notifications",
              icon: <IconBell />,
            },
          ],
        },
      ];

    default:
      return [];
  }
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_PRODI: "Admin Prodi",
  MAHASISWA: "Mahasiswa",
  DOSEN: "Dosen",
  KAPRODI: "Kaprodi",
  TATA_USAHA: "Tata Usaha",
};

// ─── AppShell ────────────────────────────────────────────────────────────────

type Props = {
  user: UserProfile;
  unreadCount: number;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AppShell({
  user,
  unreadCount,
  title,
  description,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const navigation = getNavigation(user.role);

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-text-inverse shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]"
            aria-hidden
          >
            <span className="font-display text-[15px] font-semibold tracking-tight">
              CF
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15.5px] font-semibold leading-none tracking-tight text-text-primary">
              CampusFlow
            </p>
            <p className="mt-1 text-[10.5px] uppercase tracking-[0.14em] leading-none text-text-muted">
              Academic Service Suite
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          {navigation.map((group, idx) => (
            <div key={idx} className={idx > 0 ? "mt-6" : ""}>
              {group.title ? (
                <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled">
                  {group.title}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" &&
                      pathname?.startsWith(item.href + "/"));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors ${
                          isActive
                            ? "bg-accent-soft text-accent font-semibold"
                            : "text-text-secondary hover:bg-background-alt hover:text-text-primary"
                        }`}
                      >
                        {isActive ? (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent"
                          />
                        ) : null}
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
                            isActive
                              ? "text-accent"
                              : "text-text-muted group-hover:text-text-secondary"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.href === "/notifications" && unreadCount > 0 ? (
                          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold leading-none text-text-inverse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-border p-2.5">
          <Link
            href="/profile"
            className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-background-alt"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-text-inverse">
              {getInitials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-text-primary">
                {user.fullName}
              </p>
              <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.08em] leading-tight text-text-muted">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
              }}
              title="Logout"
              aria-label="Logout"
              className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-danger"
            >
              <IconLogout />
            </button>
          </Link>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-5 backdrop-blur-sm lg:px-7">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-text-inverse text-[11px] font-bold">
              CF
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight text-text-primary">
              CampusFlow
            </span>
          </div>

          <div className="hidden lg:flex lg:items-center lg:gap-2 text-[12.5px]">
            <span className="text-text-muted">{ROLE_LABELS[user.role]}</span>
            <span className="text-text-disabled">/</span>
            <span className="font-medium text-text-primary">{title}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <CommandPalette />
            <Link
              href="/notifications"
              aria-label="Notifikasi"
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background-alt hover:text-text-primary"
            >
              <IconBell />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-surface" />
              ) : null}
            </Link>
          </div>
        </header>

        {/* Page header (desktop + mobile) */}
        <div className="border-b border-border bg-surface px-5 py-6 lg:px-8 lg:py-7">
          <h1 className="heading-page">{title}</h1>
          {description ? (
            <p className="mt-2 text-[14px] text-text-muted leading-relaxed max-w-3xl">
              {description}
            </p>
          ) : null}
        </div>

        {/* Page content */}
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Icons (inline SVG, 16px) ────────────────────────────────────────────────

function IconHome() {
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
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconDocument() {
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
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconUsers() {
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
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBell() {
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
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconChart() {
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
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconGraduationCap() {
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
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconShield() {
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
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconBuilding() {
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
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  );
}

function IconMegaphone() {
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
    >
      <path d="M3 11v3a4 4 0 0 0 4 4l4 4 4-12-4-4H7a4 4 0 0 0-4 4z" />
      <path d="M11 8v8" />
      <path d="M19 8v8" />
    </svg>
  );
}

function IconCalendar() {
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
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBook() {
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
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function IconTarget() {
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
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconHelpCircle() {
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
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconClipboard() {
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
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
