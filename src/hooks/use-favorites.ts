"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchFavorites(): Promise<string[]> {
  const res = await fetch("/api/favorites");
  if (!res.ok) throw new Error("Failed to fetch favorites");
  return res.json();
}

async function addFavorite(seriesSlug: string): Promise<void> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesSlug }),
  });
  if (!res.ok) throw new Error("Failed to add favorite");
}

async function removeFavorite(seriesSlug: string): Promise<void> {
  const res = await fetch("/api/favorites", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesSlug }),
  });
  if (!res.ok) throw new Error("Failed to remove favorite");
}

export function useFavorites(initialFavorites?: string[]) {
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
    // Server'dan gelen initial veri varsa anında kullan, staleTime içinde refetch etme
    ...(initialFavorites !== undefined && {
      initialData: initialFavorites,
      initialDataUpdatedAt: Date.now(),
    }),
  });

  const addMutation = useMutation({
    mutationFn: addFavorite,
    onMutate: async (seriesSlug) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const prev = queryClient.getQueryData<string[]>(["favorites"]) ?? [];
      queryClient.setQueryData<string[]>(["favorites"], [...new Set([...prev, seriesSlug])]);
      return { prev };
    },
    onError: (_err, _slug, ctx) => {
      if (ctx !== undefined) queryClient.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onMutate: async (seriesSlug) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const prev = queryClient.getQueryData<string[]>(["favorites"]) ?? [];
      queryClient.setQueryData<string[]>(
        ["favorites"],
        prev.filter((s) => s !== seriesSlug)
      );
      return { prev };
    },
    onError: (_err, _slug, ctx) => {
      if (ctx !== undefined) queryClient.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  return {
    favorites,
    isFavorite: (slug: string) => favorites.includes(slug),
    toggle: (slug: string) =>
      favorites.includes(slug) ? removeMutation.mutate(slug) : addMutation.mutate(slug),
    add: addMutation.mutate,
    remove: removeMutation.mutate,
  };
}
