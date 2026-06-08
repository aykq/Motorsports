"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LoginError({ message }: { message: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return <p className="text-sm text-destructive text-center">{message}</p>;
}
