"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <Card className="max-w-md w-full">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-danger-soft text-danger">
            <AlertTriangle className="size-5" />
          </div>

          <div>
            <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-text-primary">
              Terjadi Kesalahan
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
              Terjadi kesalahan yang tidak terduga. Coba lagi atau kembali ke
              dashboard.
            </p>
          </div>

          {error.message ? (
            <div className="rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2.5 text-left">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-danger-text">
                Detail Error
              </p>
              <p className="mt-1 break-words font-mono text-[11.5px] text-danger-text">
                {error.message}
              </p>
              {error.digest ? (
                <p className="mt-1 font-mono text-[10.5px] text-danger-text/70">
                  {error.digest}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard">Ke Dashboard</Link>
          </Button>
          <Button size="sm" onClick={reset}>
            <RefreshCw className="size-3.5" />
            Coba Lagi
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
