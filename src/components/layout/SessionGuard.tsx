"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

export function SessionGuard() {
  const { data } = useQuery({
    queryKey: ["me-status"],
    queryFn: async () => {
      const res = await fetch("/api/me/status");
      if (res.status === 401) return { status: "unauthenticated" };
      return res.json() as Promise<{ status: string }>;
    },
    refetchInterval: 5000,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (data?.status === "unauthenticated" || data?.status === "blocked") {
      signOut({ callbackUrl: "/login" });
    }
  }, [data]);

  return null;
}
