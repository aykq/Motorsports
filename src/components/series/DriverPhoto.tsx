import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SeriesConfig } from "@/lib/series-config";

interface Props {
  image?: string;
  alt: string;
  size: number;
  config: Pick<SeriesConfig, "imageObjectPosition" | "imageZoom">;
  fallbackColor: string;
  fallbackLabel: string;
  className?: string;
  priority?: boolean;
}

export function DriverPhoto({
  image,
  alt,
  size,
  config,
  fallbackColor,
  fallbackLabel,
  className = "",
  priority,
}: Props) {
  if (!image) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-xs font-black text-white shrink-0",
          className
        )}
        style={{ backgroundColor: fallbackColor, width: size, height: size }}
      >
        {fallbackLabel}
      </div>
    );
  }

  const objectPosition = config.imageObjectPosition ?? "center -35%";
  const zoom = config.imageZoom ?? 1;
  // Local motogp images are served as static files — skip /_next/image optimizer
  const unoptimized = image.startsWith("/motogp/");

  return (
    <div
      className={cn("relative rounded-full overflow-hidden bg-muted shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={image}
        alt={alt}
        fill
        sizes={`${zoom > 1 ? size * 3 : size}px`}
        className="object-cover"
        style={
          zoom > 1
            ? { objectPosition: "center top", transform: `scale(${zoom})`, transformOrigin: "center top" }
            : { objectPosition }
        }
        priority={priority}
        unoptimized={unoptimized}
      />
    </div>
  );
}
