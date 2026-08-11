import type { ReactNode } from "react";
import { BackButton } from "@/components/layout/BackButton";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, eyebrow, subtitle, backHref, backLabel, icon, action }: PageHeaderProps) {
  const heading = (
    <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
      {eyebrow ? `${eyebrow} • ${title}` : title}
    </h1>
  );

  return (
    <div className="space-y-1">
      {backHref && backLabel && <BackButton fallbackHref={backHref} label={backLabel} />}
      {icon || action ? (
        <div className="flex items-center justify-between gap-2">
          {icon ? <div className="flex items-center gap-2">{icon}{heading}</div> : heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {subtitle}
    </div>
  );
}
