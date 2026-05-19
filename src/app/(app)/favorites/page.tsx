import type { Metadata } from "next";

export const metadata: Metadata = { title: "Favoriler" };

export default function FavoritesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Favoriler</h1>
        <p className="text-sm text-muted-foreground mt-1">Favori serilerini buradan takip et</p>
      </div>
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Favori özelliği yakında geliyor.</p>
        <p className="text-xs mt-1">Aşama 4&apos;te eklenecek.</p>
      </div>
    </div>
  );
}
