"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

interface CircuitHeroPhotoProps {
  src: string;
  alt: string;
}

export function CircuitHeroPhoto({ src, alt }: CircuitHeroPhotoProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full bg-card flex items-center justify-center">
        <Flag className="w-12 h-12 opacity-20" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}
