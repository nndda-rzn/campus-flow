"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  GraduationCap,
  Search,
  User,
  Users,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth-storage";
import { globalSearch, type SearchResultItem } from "@/lib/search-api";
import { cn } from "@/lib/cn";

const TYPE_ICON: Record<string, React.ReactNode> = {
  academic_request: <FileText className="size-4" />,
  user: <User className="size-4" />,
  student: <GraduationCap className="size-4" />,
  lecturer: <Users className="size-4" />,
};

const TYPE_LABEL: Record<string, string> = {
  academic_request: "Pengajuan",
  user: "Pengguna",
  student: "Mahasiswa",
  lecturer: "Dosen",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cmd+K / Ctrl+K to open.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await globalSearch(token, q);
      setResults(res.data?.items ?? []);
      setSelectedIdx(0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  }

  function handleSelect(item: SearchResultItem) {
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-[12.5px] text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
        aria-label="Pencarian global (Ctrl+K)"
      >
        <Search className="size-3.5" />
        <span>Cari...</span>
        <kbd className="ml-2 rounded border border-border bg-background-alt px-1.5 py-0.5 font-mono text-[10px] text-text-disabled">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border border-border bg-surface shadow-modal">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari pengajuan, mahasiswa, dosen, pengguna..."
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-disabled outline-none"
            autoComplete="off"
          />
          <kbd className="rounded border border-border bg-background-alt px-1.5 py-0.5 font-mono text-[10px] text-text-disabled">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading && (
            <p className="px-3 py-4 text-center text-[12.5px] text-text-muted">
              Mencari...
            </p>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <p className="px-3 py-4 text-center text-[12.5px] text-text-muted">
              Tidak ada hasil untuk &ldquo;{query}&rdquo;
            </p>
          )}

          {!isLoading && results.length > 0 && (
            <ul>
              {results.map((item, idx) => (
                <li key={`${item.type}-${item.id}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      idx === selectedIdx
                        ? "bg-accent-soft text-accent"
                        : "text-text-secondary hover:bg-background-alt",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background-alt text-text-muted">
                      {TYPE_ICON[item.type] ?? <Search className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">
                        {item.title}
                      </p>
                      <p className="truncate text-[11.5px] text-text-muted">
                        {item.sub}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-background-alt px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && query.length < 2 && (
            <p className="px-3 py-4 text-center text-[12.5px] text-text-muted">
              Ketik minimal 2 karakter untuk mulai mencari.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
