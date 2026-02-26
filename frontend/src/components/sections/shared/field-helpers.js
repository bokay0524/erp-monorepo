import { parseDateLoose } from "@/lib/date-core";
export const DEFAULT_LABEL_CONF = { layout: "top", padX: 8, padY: 4 };

export const GRID_COLS = {
    base: { 2:"grid-cols-2",3:"grid-cols-3",4:"grid-cols-4",6:"grid-cols-6",12:"grid-cols-12" },
    md: { 2:"md:grid-cols-2",3:"md:grid-cols-3",4:"md:grid-cols-4",6:"md:grid-cols-6",12:"md:grid-cols-12" },
    lg:  { 2:"lg:grid-cols-2",3:"lg:grid-cols-3",4:"lg:grid-cols-4",6:"lg:grid-cols-6",12:"lg:grid-cols-12" },
    xl: { 2:"xl:grid-cols-2",3:"xl:grid-cols-3",4:"xl:grid-cols-4",6:"xl:grid-cols-6",12:"xl:grid-cols-12" },
};
const COL_SPAN = {
    base: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`col-span-${i+1}`])),
    sm: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`sm:col-span-${i+1}`])),
    md: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`md:col-span-${i+1}`])),
    lg: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`lg:col-span-${i+1}`])),
    xl: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`xl:col-span-${i+1}`])),
};
const COL_START = {
    base: Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,`col-start-${i+1}`])),
    sm: Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,`sm:col-start-${i+1}`])),
    md: Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,`md:col-start-${i+1}`])),
    lg: Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,`lg:col-start-${i+1}`])),
    xl: Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,`xl:col-start-${i+1}`])),
};

export const LABEL_TXT = "text-[13px] font-medium leading-none text-foreground whitespace-nowrap select-none";
export const CONTROL_BASE = "w-full h-9";


export function spanClass(span, cols, bp = "lg") {
    const s = typeof span === "number" ? { base: span, sm: span, md: span, lg: span, xl: span } : (span || {});
    const base = COL_SPAN.base[s.base ?? s.sm ?? s.md ?? s.lg ?? s.xl ?? 12];
    const sm = COL_SPAN.sm [s.sm ?? s.base ?? s.md ?? s.lg ?? s.xl ?? (cols>=6?6:cols)];
    const md = COL_SPAN.md [s.md ?? s.sm ?? s.base ?? s.lg ?? s.xl ?? (cols>=4?4:cols)];
    const atBp = COL_SPAN[bp] [s[bp] ?? s.md ?? s.sm ?? s.base ?? 1];
    return [base, sm, md, atBp].filter(Boolean).join(" ");
}
export function startClass(start, bp = "lg") {
    if (start == null) return "";
    const s = typeof start === "number" ? { base: start, sm: start, md: start, lg: start, xl: start } : start;
    const base = s.base ? COL_START.base[s.base] : "";
    const sm = s.sm ? COL_START.sm[s.sm] : "";
    const md = s.md ? COL_START.md[s.md] : "";
    const atBp = s[bp] ? COL_START[bp][s[bp]] : "";
    return [base, sm, md, atBp].filter(Boolean).join(" ");
}

export function getLabelConf(field, globalConf) {
    return {
        layout: field.labelLayout || globalConf.layout,
        padX: field.labelPadPx ?? field.labelPadX ?? globalConf.padX,
        padY: field.labelPadYPx ?? field.labelPadY ?? globalConf.padY,
        labelClassName: field.labelClassName,
        controlClassName: field.controlClassName,
    };
}
export function normalizeValue(type, value) {
    const t = String(type).toLowerCase();
    let v = value;
    if (t === "date") {
        if (v === "" || v == null) {
            v = null;
        } else if (v instanceof Date) {
            v = isNaN(v.getTime()) ? null : v;
        } else {
            const d = parseDateLoose(v);
            v = d ?? null;
        }
    } else if (t === "daterange") {
        if (!v || typeof v !== "object") v = { from: undefined, to: undefined };
        else {
            const { from, to } = v; const fix = (x) => (x instanceof Date ? x : x ? (isNaN(new Date(x).getTime()) ? undefined : new Date(x)) : undefined);
            v = { from: fix(from), to: fix(to) };
        }
      } else if (t === "select") {
        // ✅ 빈 선택은 ""로 표준화 (UI에선 센티널로 매핑)
        v = (v == null ? "" : v);
    } else if (t === "listbox") {
        // ✅ ListBox: 단일/다중 모두 지원
        //  - 단일: "" (select와 동일)
        //  - 다중: []
        if (Array.isArray(value)) v = value;            // 다중일 가능성
        else if (value == null) v = "";                 // 단일 기본값
        // ※ FieldControl에서 field.multiple 여부를 보고 최종 세팅
    } else if (t === "checkbox") {
        // ✅ DB 값 → boolean 정규화 (문자열 "0"은 false로!)
        // falsy 값: null, undefined, "", 0, "0", false, "f", "false"
        if (!value || value === 0 || value === "0" || value === "f" || value === "false") {
            v = false;
        } else {
            v = !!value;
        }
    } else if (t === "radiogroup") {
        // 라디오는 단일 선택 → 문자열
        v = (value == null ? "" : String(value));
    } else if (t === "checkboxgroup") {
        // 체크박스 그룹은 다중 선택 → 문자열 배열
        v = Array.isArray(value) ? value.map(String) : [];
   } else if (t === "codenamepair") {
       // 복합 필드: FieldControl에서 코드/명은 ctx.formValues로 직접 다룸
       v = value;
    } else if (!["spacer","node","custom"].includes(t)) {
        v = v ?? "";
    }
    return v;
}
