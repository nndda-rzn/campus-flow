"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { getFAQCategories, getFAQs, FAQCategoryItem, FAQItem } from "@/lib/faq-api";
import { getAccessToken } from "@/lib/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function FAQPage() {
  const [categories, setCategories] = useState<FAQCategoryItem[]>([]);
  const [faqs, setFaqs] = useState<Record<string, FAQItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const token = getAccessToken();
      if (!token) return;

      try {
        const catRes = await getFAQCategories(token);
        const cats = catRes.data?.items || [];
        setCategories(cats);

        if (cats.length > 0) {
          const faqsRes = await getFAQs(token);
          const allFaqs = faqsRes.data?.items || [];
          
          const grouped = allFaqs.reduce((acc: Record<string, FAQItem[]>, faq: FAQItem) => {
            if (!acc[faq.categoryId]) acc[faq.categoryId] = [];
            acc[faq.categoryId].push(faq);
            return acc;
          }, {} as Record<string, FAQItem[]>);
          
          setFaqs(grouped);
        }
      } catch (err) {
        toast.error("Gagal memuat data", {
          description: err instanceof Error ? err.message : "Silakan coba lagi nanti",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <ProtectedPage
      title="FAQ & Panduan"
      description="Temukan jawaban untuk pertanyaan umum seputar layanan akademik dan bimbingan."
      allowedRoles={["MAHASISWA"]}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="Belum Ada FAQ"
              description="Belum ada panduan atau FAQ yang ditambahkan oleh prodi."
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={categories[0]?.id} className="w-full">
          <div className="mb-6 overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max min-w-full justify-start p-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="min-w-[150px]">
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-0 outline-none">
              <div className="grid gap-4 md:grid-cols-2">
                {faqs[cat.id]?.length > 0 ? (
                  faqs[cat.id].map((faq) => (
                    <Card key={faq.id} className="h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-[15px] leading-snug">
                          {faq.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[13.5px] leading-relaxed text-text-secondary whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2">
                    <EmptyState
                      title="Kategori Kosong"
                      description="Belum ada FAQ untuk kategori ini."
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </ProtectedPage>
  );
}
