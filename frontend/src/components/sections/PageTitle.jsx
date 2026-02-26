import React from "react";
import { cn } from "@/lib/utils";
import { useProgramTitle } from "@/hooks/use-program-title";

export default function PageTitle({ title, subtitle, actions, className }) {
  // title이 없으면 자동 계산
  const autoTitle = useProgramTitle();
  const finalTitle = title ?? autoTitle ?? ""; // 안전 폴백

  return (
    <div className={cn("mt-2 mb-1 flex flex-wrap items-center justify-between gap-x-4", className)}>
      <div>
        <h4 className="text-xl font-bold tracking-tight">{finalTitle}</h4>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
