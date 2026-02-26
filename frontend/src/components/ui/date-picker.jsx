import * as React from "react";
import { format } from "date-fns";
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

export default function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  className,
  disabled,
  clearable = true,
  formatStr = "yyyy-MM-dd",
  numberOfMonths = 1,

  // ⬇️ 축소 옵션
  calendarSize = "xs",        // 'xs'|'sm'|'md'|number
  calendarStyleVars,          // 선택
  monthsGap = 12,
  fromYear = 2000,
  toYear = 2035,
}) {
  const [open, setOpen] = React.useState(false);
  const selected = value ?? null;

  const initialMonth = React.useMemo(() => value ?? new Date(), [value]);
  const [month, setMonth] = React.useState(initialMonth);
  React.useEffect(() => { if (open) setMonth(value ?? new Date()); }, [open, value]);

  const y = month.getFullYear();
  const m = month.getMonth();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-[200px] justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className, 
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, formatStr, { locale: ko }) : <span>{placeholder}</span>}
          {clearable && selected && (
            <XIcon
              className="ml-auto h-4 w-4 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(null);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-1 w-auto">
        {/* 연/월 드롭다운 (캡션 대신) */}
        <div className="mb-1 flex items-center justify-between gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(new Date(y, m - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <select
              className="h-7 rounded-md border bg-background px-1.5 text-[12px]"
              value={y}
              onChange={(e) => setMonth(new Date(clamp(+e.target.value, fromYear, toYear), m, 1))}
            >
              {Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i).map((yy) => (
                <option key={yy} value={yy}>{yy}</option>
              ))}
            </select>
            <select
              className="h-7 rounded-md border bg-background px-1.5 text-[12px]"
              value={m}
              onChange={(e) => setMonth(new Date(y, +e.target.value, 1))}
            >
              {Array.from({ length: 12 }, (_, i) => i).map((mm) => (
                <option key={mm} value={mm}>{mm + 1}월</option>
              ))}
            </select>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(new Date(y, m + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          size={calendarSize}       // ← 여기만 바꿔도 줄어듦 (숫자 px도 가능)
          hideCaption               // ← 캡션 DOM 제거 → 공백 0
          styleVars={calendarStyleVars}
          monthsGap={monthsGap}
          cellSize={22}      /* ← 숫자로 바로 제어 (20~26px 추천) */
          month={month}
          onMonthChange={setMonth}
          mode="single"
          selected={selected}
          onSelect={(d) => { onChange?.(d ?? null); setOpen(false); }}
          numberOfMonths={numberOfMonths}
          locale={ko}
          showOutsideDays
        />
      </PopoverContent>
    </Popover>
  );
}
