import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <Card className="max-w-md w-full">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Compass className="size-5" />
          </div>

          <div>
            <p className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">
              Error 404
            </p>
            <h1 className="mt-1 text-[18px] font-semibold leading-tight tracking-tight text-text-primary">
              Halaman Tidak Ditemukan
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
              Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/">Halaman Utama</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">Ke Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
