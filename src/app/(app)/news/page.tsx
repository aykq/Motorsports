import { getAllCachedNews } from "@/lib/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { NewsListSection } from "./NewsListSection";
import { NewsSyncButton } from "./NewsSyncButton";

export const metadata: Metadata = { title: "Haberler" };

export default async function NewsPage() {
  const t = await getTranslations("newsPage");
  const [news, adminId] = await Promise.all([
    getAllCachedNews(50),
    requireAdmin(),
  ]);
  const isAdmin = !!adminId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">{t("title")}</h1>
        {isAdmin && <NewsSyncButton />}
      </div>

      {news.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-16">
          {t("noNews")}
        </p>
      )}

      <NewsListSection news={news} />
    </div>
  );
}
