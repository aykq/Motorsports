"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  src?: string;
  alt: string;
  fallbackColor: string;
  fallbackText: string;
  className?: string;
  fallbackClassName?: string;
}

export function TeamLogo({
  src,
  alt,
  fallbackColor,
  fallbackText,
  className,
  fallbackClassName,
}: TeamLogoProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={cn("flex items-center justify-center text-white font-bold", fallbackClassName)}
        style={{ backgroundColor: fallbackColor }}
        title={alt}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-contain", className)}
      onError={() => setError(true)}
    />
  );
}
