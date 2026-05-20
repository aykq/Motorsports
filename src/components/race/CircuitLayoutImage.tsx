"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

interface CircuitLayoutImageProps {
  src: string;
  alt: string;
}

export function CircuitLayoutImage({ src, alt }: CircuitLayoutImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 rounded-lg bg-card border border-border text-muted-foreground">
        <MapPin className="w-8 h-8 opacity-30" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-40 object-contain rounded-lg bg-card border border-border p-3"
      onError={() => setError(true)}
    />
  );
}
