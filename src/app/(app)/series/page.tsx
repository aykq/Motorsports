import { SERIES_LIST } from "@/lib/series-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seriler" };

export default function SeriesListPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Seriler</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Takip etmek istediğin seriyi seç
        </p>
      </div>

      <div className="grid gap-3">
        {SERIES_LIST.map((series) =>
          series.available ? (
            <Link key={series.slug} href={`/${series.slug}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ backgroundColor: series.color }}
                  >
                    {series.shortName.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{series.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Aktif
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={series.slug} className="opacity-50 cursor-not-allowed">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ backgroundColor: series.color }}
                >
                  {series.shortName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{series.name}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  Yakında
                </Badge>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
