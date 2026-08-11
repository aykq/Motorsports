import { getAllCachedNews } from "@/lib/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { NewsListSection } from "./NewsListSection";
import { NewsAutoRefresh } from "./NewsAutoRefresh";
import { NewsSyncButton } from "@/components/news/NewsSyncButton";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Haberler" };

export default async function NewsPage() {
  const t = await getTranslations("newsPage");
  const [news, adminId] = await Promise.all([
    getAllCachedNews(50),
    requireAdmin(),
  ]);
  const isAdmin = !!adminId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-5">
      <NewsAutoRefresh />
      <PageHeader title={t("title")} action={isAdmin && <NewsSyncButton />} />

      {news.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-16">
          {t("noNews")}
        </p>
      )}

      <NewsListSection news={news} />
    </div>
  );
}
