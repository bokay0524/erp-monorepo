import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";

/**
 * props:
 * - size: 'xs'|'sm'|'md'|number   // 셀 한 칸(px). 숫자가 가장 확실 (예: 24)
 * - dayFontSize?: number          // 날짜 숫자 폰트(px)
 * - weekdayFontSize?: number      // 요일 머리글 폰트(px)
 * - outsideOpacity?: number       // 이전/다음달 날짜의 불투명도(0~1, 기본 0.25)
 * - hideCaption: boolean          // 기본 true (캡션 DOM 제거 → 공백 0)
 * - monthsGap: number             // numberOfMonths>1 일 때 달력 간 간격(px)
 */
export function Calendar({
  className,
  classNames,
  styles,
  showOutsideDays = true,
  size = "xs",
  dayFontSize,
  weekdayFontSize,
  hideCaption = true,
  monthsGap = 16,
  ...props
}) {
  // 이전/다음달 날짜 기본 투명도(더 연하게 보이도록 고정)
  const OUTSIDE_OPACITY = 0.10;

  // 셀 크기(px)
  const cellPx =
    typeof size === "number" ? size : size === "xs" ? 22 : size === "sm" ? 26 : 32;

  // 기본 폰트 크기(옵션 없으면 셀 크기에 맞춰 자동 설정)
  const headFs = weekdayFontSize ?? (cellPx <= 22 ? 10 : 11);
  const dayFs = dayFontSize ?? (cellPx <= 22 ? 11 : 12);

  // 인라인 강제 스타일(최우선 적용)
  const SBox = { width: cellPx, height: cellPx, padding: 0 };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      components={hideCaption ? { Caption: () => null, Nav: () => null, MonthCaption: () => null } : undefined}
      className={cn("p-1", className)}
      classNames={{
        months: "flex sm:flex-row justify-center",  // 가운데 정렬
        caption: "hidden",
        caption_label: "hidden",
        nav: "hidden",
        month_caption: "hidden",
        month: "space-y-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "font-normal text-muted-foreground", // 폰트는 styles로 강제
        row: "flex w-full mt-0",
        cell: "text-center",
        day: "aria-selected:opacity-100",
        day_selected: "bg-primary text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground",     // 색상 유지, 투명도는 styles로 더 연하게
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...(classNames || {}),
      }}
      styles={{
        months: { columnGap: monthsGap, gap: monthsGap },
        caption: { display: "none", margin: 0, padding: 0 },
        nav: { display: "none" },
        month_caption: { display: "none" },
        month: { margin: 0, padding: 0 },
        table: { margin: 0, borderCollapse: "collapse" },
        head_row: { margin: 0, padding: 0 },
        head_cell: { ...SBox, fontSize: headFs, lineHeight: 1.1 }, // 요일 칸
        row: { marginTop: 0 },
        cell: { ...SBox },                                         // 셀 박스
        day_button: { ...SBox, fontSize: dayFs, lineHeight: 1.2 }, // 날짜 버튼(핵심)
        day_outside: { opacity: OUTSIDE_OPACITY },                  // 이전/다음달 날짜 더 연하게
        // v8 호환(무시돼도 OK)
        day: { ...SBox, fontSize: dayFs, lineHeight: 1.2 },
        ...(styles || {}),
      }}
      {...props}
    />
  );
}
