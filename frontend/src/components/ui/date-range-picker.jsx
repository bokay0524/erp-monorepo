import * as React from "react";
import { format, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const asDate = (x) => {
  if (!x) return undefined;
  if (x instanceof Date) return isNaN(x.getTime()) ? undefined : x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? undefined : d;
};

export default function DateRangePicker({
  value,
  onChange,
  placeholder = "기간 선택",
  disabled,
  clearable = true,
  formatStr = "yyyy-MM-dd",

  numberOfMonths = 2,
  calendarSize = "xs",        // 'xs'|'sm'|'md'|number
  calendarStyleVars,
  monthsGap = 20,
  fromYear = 2000,
  toYear = 2035,

  // ★ 추가: 외부에서 넘긴 폭/높이 클래스 적용 (SearchSection의 CONTROL_BASE가 여기로 들어옴)
  className,
}) {
  const [open, setOpen] = React.useState(false);
  const range = React.useMemo(() => ({ from: asDate(value?.from), to: asDate(value?.to) }), [value]);

  const label = React.useMemo(() => {
    if (range.from && range.to) return `${format(range.from, formatStr, { locale: ko })} ~ ${format(range.to, formatStr, { locale: ko })}`;
    if (range.from) return `${format(range.from, formatStr, { locale: ko })} ~`;
    return null;
  }, [range, formatStr]);

  // 좌측 기준 월
  const base = React.useMemo(() => range.from ?? new Date(), [range.from]);
  const [baseMonth, setBaseMonth] = React.useState(new Date(base.getFullYear(), base.getMonth(), 1));
  React.useEffect(() => { if (open) setBaseMonth(new Date(base.getFullYear(), base.getMonth(), 1)); }, [open, base]);

  const yL = baseMonth.getFullYear();
  const mL = baseMonth.getMonth();
  const right = addMonths(baseMonth, 1);
  const yR = right.getFullYear();
  const mR = right.getMonth();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          // ★ 고정폭 제거: w-[260px] → w-full / min-w-0
          // ★ SearchSection에서 넘어온 className(CONTROL_BASE: "w-full h-9")도 합치기
          className={cn("w-full min-w-0 justify-start text-left font-normal", !label && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{label ?? placeholder}</span>
          {clearable && (range.from || range.to) && (
            <XIcon
              className="ml-auto h-4 w-4 opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange?.({ from: undefined, to: undefined }); }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-1 w-auto">
        <div className="mb-1 flex items-center justify-between gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBaseMonth(addMonths(baseMonth, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            {/* Left */}
            <div className="flex items-center gap-1">
              <select
                className="h-7 rounded-md border bg-background px-1.5 text-[12px]"
                value={yL}
                onChange={(e) => setBaseMonth(new Date(clamp(+e.target.value, fromYear, toYear), mL, 1))}
              >
                {Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i).map((yy) => (
                  <option key={yy} value={yy}>{yy}</option>
                ))}
              </select>
              <select
                className="h-7 rounded-md border bg-background px-1.5 text-[12px]"
                value={mL}
                onChange={(e) => setBaseMonth(new Date(yL, +e.target.value, 1))}
              >
                {Array.from({ length: 12 }, (_, i) => i).map((mm) => (
                  <option key={mm} value={mm}>{mm + 1}월</option>
                ))}
              </select>
            </div>

            <div className="text-muted-foreground text-xs">~</div>

            {/* Right */}
            <div className="flex items-center gap-1">
              <select
                className="h-7 rounded-md border bg-background px-1.5 text-[12px]"
                value={yR}
                onChange={(e) => {
                  const y = clamp(+e.target.value, fromYear, toYear);
                  setBaseMonth(new Date(y, mR - 1, 1));
                }}
              >
                {Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i).map((yy) => (
                  <option key={yy} value={yy}>{yy}</option>
                ))}
              </select>
              <select
                className="h-7 rounded-md border bg-background px-1.5 text-[12px]"
                value={mR}
                onChange={(e) => setBaseMonth(new Date(yR, +e.target.value - 1, 1))}
              >
                {Array.from({ length: 12 }, (_, i) => i).map((mm) => (
                  <option key={mm} value={mm}>{mm + 1}월</option>
                ))}
              </select>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBaseMonth(addMonths(baseMonth, +1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          size={calendarSize}
          hideCaption
          styleVars={calendarStyleVars}
          cellSize={22}
          monthsGap={monthsGap}
          month={baseMonth}
          onMonthChange={setBaseMonth}
          mode="range"
          selected={range}
          onSelect={(next) => onChange?.(next ?? { from: undefined, to: undefined })}
          numberOfMonths={numberOfMonths}
          locale={ko}
          showOutsideDays
        />
      </PopoverContent>
    </Popover>
  );
}
