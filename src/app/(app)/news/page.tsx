import { getAllCachedNews } from "@/lib/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { NewsListSection } from "./NewsListSection";
import { NewsFreshnessBadge } from "./NewsFreshnessBadge";
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
  const displayedIds = news.map((n) => n.id);
  const displayedKey = displayedIds.join(",");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-5">
      <PageHeader title={t("title")} action={isAdmin && <NewsSyncButton />} />
      <NewsFreshnessBadge key={displayedKey} displayedIds={displayedIds} />

      {news.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-16">
          {t("noNews")}
        </p>
      )}

      <NewsListSection news={news} />
    </div>
  );
}
