import React, { useEffect, useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import DateRangePicker from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CONTROL_BASE, LABEL_TXT, getLabelConf } from "./field-helpers";
import { api as http } from "@/lib/http";
import { formatByPattern, getInputFormatPattern } from "@/lib/formatters";
import { toDateString } from "@/lib/date-core";
import CodeNamePair from "@/components/form/CodeNamePair";

import { convertDbToCheckbox, convertCheckboxToDb } from "@/lib/convert";

// 모듈 레벨 간단 캐시 (원치 않으면 field.cache=false)
const optCache = new Map();
// key 생성 유틸
const cacheKeyOf = (fieldName, kind, payload) =>
  `${fieldName}::${kind}::${JSON.stringify(payload ?? {})}`;

function renderWithLabel({ layout, label, control, labelPadPx, labelPadYPx, labelClassName, controlClassName, help, error }) {
  const helpNode = help ? <p className="mt-1 text-[12px] text-muted-foreground">{help}</p> : null;
  const errNode = error ? <p className="mt-1 text-[12px] text-red-600">{error}</p> : null;

  if (!label) return <div className={cn("min-w-0", controlClassName)}>{control}{errNode || helpNode}</div>;

  if (layout === "left-inline") {
    return (
      <div className="min-w-0 flex items-start">
        <div className="shrink-0" style={{ paddingRight: `${labelPadPx}px` }}>
          <Label className={cn(LABEL_TXT, labelClassName)}>{label}</Label>
        </div>
        <div className={cn("min-w-0 flex-1")}>
          <div className={cn("min-w-0", controlClassName)}>{control}</div>
          {errNode || helpNode}
        </div>
      </div>
    );
  }

  const alignCls = layout === "top-right" ? "text-right" : layout === "top-middle" ? "text-center" : "text-left";
  return (
    <div className="min-w-0">
      <div className={cn(alignCls)} style={{ marginBottom: `${labelPadYPx}px` }}>
        <Label className={cn(LABEL_TXT, labelClassName)}>{label}</Label>
      </div>
      <div className={cn("min-w-0", controlClassName)}>{control}</div>
      {errNode || helpNode}
    </div>
  );
}

// ✅ 어떤 응답이 와도 배열로 뽑아주는 유틸
const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;

  const d = res.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(res?.rows)) return res.rows;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.list)) return res.list;

  if (d && typeof d === "object") {
    const keys = Object.keys(d);
    if (!["rows", "items", "list", "data", "result", "success", "ok"].some(k => keys.includes(k))) {
      return [d];
    }
  }
  return [];
};

export default function FieldControl({
  field,
  value,
  setField,
  ctx,
  labelConfig,
  validationRules,
  validateOn,
  showErrors,
  errors,
  setErrors
}) {
  const {
    name, label, type = "input", placeholder,
    props, options = [], includeAllOption,
    // optionsApi는 이펙트 내부에서 최신값으로 읽는다
    optionsDeps = [], cache = true,
    render, node, help,
  } = field;

  // 사용자 정의 onChange / onBlur 분리
  const { onChange: userOnChange, onBlur: userOnBlur, ...restProps } = props || {};

  const EMPTY = "__EMPTY__";
  const appliedDefaultRef = React.useRef(false);
  const hasValue = useMemo(() => {
    if (Array.isArray(value)) return value.length > 0;
    return !(value === "" || value == null);
  }, [value]);
  // 옵션에서 첫 값 꺼내기 유틸
  const firstOptionValue = (items) => {
    const o = items?.[0];
    if (!o) return undefined;
    return String(o.id ?? o.value ?? o.code ?? "");
  };

  const labelConf = getLabelConf(field, labelConfig);
  const t = String(type).toLowerCase();
  const fieldError = showErrors && name ? errors?.[name] : null;
  const invalidCls = fieldError ? "ring-1 ring-red-500 focus-visible:ring-red-500" : "";

  // ─────────────────────────────────────────────
  // 옵션 로딩 (select/listbox/radiogroup/checkboxgroup 공용)
  // ─────────────────────────────────────────────
  const [optItems, setOptItems] = useState(Array.isArray(options) ? options : []);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(null);
  const optionsCount = optItems?.length ?? 0;

  // 의존값 스냅샷 (deps 비교용)
  const depSnap = useMemo(
    () => (optionsDeps || []).map((k) => ctx.formValues?.[k]),
    [optionsDeps, ctx.formValues]
  );

  // 옵션 정규화: row => {value,label}
  const normalize = (rows) => {
    if (!rows) return [];
    return rows.map((r) => {
      if (r && typeof r === "object" && "value" in r && "label" in r) return r;
      const v = r?.value ?? r?.id ?? r?.code ?? r?.key ?? r?.epcode ?? String(r);
      const l = r?.label ?? r?.name ?? r?.title ?? r?.epname ?? String(r);
      return { value: v, label: l };
    });
  };

  useEffect(() => {
    if (!["select", "listbox", "radiogroup", "checkboxgroup"].includes(t)) return;

    let cancel = false;
    const run = async () => {
      setLoadErr(null);

      // 최신 필드 속성 읽기
      const oapi = field?.optionsApi || null;
      const scriptId = field?.optionsScriptId || null;
      const scriptMap = field?.optionsScriptMap; // { codeKey, nameKey }
      const scriptParams = field?.optionsScriptParams; // function(ctx) | object

      // 1) 정적 배열
      if (Array.isArray(options) && options.length > 0) {
        setOptItems(options);
        return;
      }

      const basePayload = { deps: depSnap, name };
      let key = null;

      try {
        setLoading(true);

        // 2) async 함수 로더
        if (typeof options === "function") {
          key = cacheKeyOf(name, "fn", basePayload);
          if (cache && optCache.has(key)) {
            setOptItems(optCache.get(key));
            return;
          }
          const rows = await options(ctx);
          const items = normalize(rows);
          if (!cancel) {
            setOptItems(items);
            if (cache) optCache.set(key, items);
          }
          return;
        }

        // 3) 스크립트 ID 내장 로더
        if (scriptId) {
          const paramsFromField = typeof scriptParams === "function" ? scriptParams(ctx) : (scriptParams || {});
          if (!("script_id" in paramsFromField)) paramsFromField.script_id = scriptId;

          key = cacheKeyOf(name, "script", { scriptId, params: paramsFromField, deps: depSnap });
          if (cache && optCache.has(key)) {
            setOptItems(optCache.get(key));
            return;
          }

          // dev에서는 /api 프록시이므로 절대 /api를 직접 쓰지 말 것
          const url = "/sys/sys_db_script_query"; // http 인스턴스의 base가 /api이면 /api/sys/...로 프록시됨
          const res = await http.get(url, { params: paramsFromField });
          // 서버가 에러를 200으로 줄 수 있으니 방어
          if (res && typeof res === "object" && (res.error || res.message)) {
            throw new Error(res.error || res.message);
          }
          const rawRows = extractArray(res);

          // 컬럼 키가 대소문자 섞여 와도 매핑되도록 로어킷 변환
          const codeKey = (scriptMap?.codeKey ?? "code").toLowerCase();
          const nameKey = (scriptMap?.nameKey ?? "name").toLowerCase();
          const mapped = rawRows.map((r, i) => {
            const lower = r && typeof r === "object"
              ? Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).toLowerCase(), v]))
              : {};
            const id =
              lower[codeKey] ?? lower.id ?? lower.key ?? lower.epcode ?? r?.id ?? r?.key ?? r?.epcode ?? i;
            const label =
              lower[nameKey] ?? lower.label ?? lower.value ?? lower.name ?? lower.title
              ?? r?.label ?? r?.value ?? r?.name ?? r?.title ?? String(id);
            return { id: String(id), label: String(label) };
          });

          if (!cancel) {
            setOptItems(mapped);
            if (cache) optCache.set(key, mapped);
          }
          return;
        }

        // 4) 일반 optionsApi
        if (oapi?.url) {
          const method = (oapi.method || "GET").toUpperCase();
          const params = typeof oapi.params === "function" ? oapi.params(ctx) : (oapi.params || {});
          key = cacheKeyOf(name, "api", { url: oapi.url, method, params });

          if (cache && optCache.has(key)) {
            setOptItems(optCache.get(key));
            return;
          }

          let res;
          if (method === "GET") res = await http.get(oapi.url, { params });
          else res = await http[method.toLowerCase()](oapi.url, params);

          const rawRows = extractArray(res);
          const mapped = oapi.map ? rawRows.map(oapi.map) : normalize(rawRows);

          if (!cancel) {
            setOptItems(mapped);
            if (cache) optCache.set(key, mapped);
          }
          return;
        }

        // 정의 없음 → 빈 목록
        setOptItems([]);
      } catch (e) {
        console.error("[Select:error]", e);
        if (!cancel) {
          setLoadErr(e?.message || "옵션 로딩 중 오류가 발생했습니다.");
          setOptItems([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    run();
    return () => { cancel = true; };
    // 최신 옵션 설정에 반응하도록 의존성 구성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    t,
    JSON.stringify(field?.optionsApi ?? {}),
    JSON.stringify(field?.optionsScriptId ?? ""),
    JSON.stringify(field?.optionsScriptParams ?? {}),
    JSON.stringify(field?.optionsScriptMap ?? {}),
    JSON.stringify(options ?? {}),
    ...depSnap
  ]);

  // ✅ 옵션이 준비되고, 값이 비어있을 때 기본값을 주입 (한 번만)
  useEffect(() => {
    if (!["select", "listbox", "radiogroup", "checkboxgroup"].includes(t)) return;
    if (loading) return;
    if (optionsCount === 0) return;
    if (appliedDefaultRef.current) return;
    if (hasValue) return;

    const { defaultValue, defaultFrom } = field || {};
    let next;

    // 1) 개발자 명시 defaultValue 우선
    if (typeof defaultValue === "function") {
      const ret = defaultValue(ctx, optItems);
      //console.log("[DEBUG-defaultValue]", { name, ret, optItems });
      if (Array.isArray(ret)) {
        next = ret.map(el => {
          if (el && typeof el === "object") return String(el.id ?? el.value ?? el.code);
          return String(el);
        });
      }
      else if (ret && typeof ret === "object" && ("id" in ret || "value" in ret || "code" in ret)) {
        next = String(ret.id ?? ret.value ?? ret.code);
      } else if (ret != null) {
        next = Array.isArray(ret) ? ret.map(String) : String(ret);
      }
    } else if (defaultValue != null) {
      next = Array.isArray(defaultValue) ? defaultValue.map(String) : String(defaultValue);
    }

    // 2) defaultFrom 보조 전략
    if (next == null) {
      if (defaultFrom === "all") {
        next = (t === "checkboxgroup" || (t === "listbox" && field.multiple)) ? [] : (includeAllOption ? "" : undefined);
      } else if (defaultFrom === "first") {
        next = firstOptionValue(optItems);
      }
    }

    // 3) select/radio는 단일 값, listbox(multiple)/checkboxgroup은 배열 처리
    if (next != null) {
      const existsSet = new Set(
        optItems.map(o => String(o.id ?? o.value ?? o.code ?? ""))
      );
      if (t === "checkboxgroup" || (t === "listbox" && field.multiple)) {
        const arr = Array.isArray(next) ? next.map(String) : [String(next)];
        // 빈 문자열("")은 다중 컨트롤에선 의미가 없으므로 제외
        const filtered = arr.filter(v => existsSet.has(v));
        setField(name, filtered);
        appliedDefaultRef.current = true;
      } else {
        const v = String(next);
        // 옵션에 없는 값이면 무시 (안전)
        const exists = existsSet.has(v) || (v === "" && includeAllOption);
        if (exists) {
          setField(name, v);
          appliedDefaultRef.current = true;
        }
      }
    }
  }, [t, loading, optionsCount, hasValue, field, includeAllOption, optItems, name, setField, ctx]);

  // inputFormatter / inputFormat 이 있으면 초기값도 한 번 마스킹해서 상태에 반영
  useEffect(() => {
    if (t !== "input") return;
    if (!name) return;

    const pattern = getInputFormatPattern(field || {});
    if (!pattern) return;

    if (value == null || value === "") return;

    const formatted = formatByPattern(value, pattern);
    if (formatted !== value) {
      setField(name, formatted);
    }
  }, [t, name, field, value, setField]);

  // ─────────────────────────────────────────────

  let control = null;
  if (t === "spacer") return null;

  if (t === "node") control = typeof node === "function" ? node(ctx) : (node ?? null);
  else if (t === "custom" && typeof render === "function") control = render(value, (val) => setField(name, val), ctx);
  else if (t === "codenamepair") {
    // ⚙️ 어떤 필드에 값을 쓸지 결정
    const codeField = field.codeField || name;                // 코드 저장 필드 (기본: name)
    const nameField =
      field.nameField ||
      (field.codeField ? field.nameField : (name ? `${name}Name` : undefined)); // 기본: name + "Name"

    const codeVal = codeField ? ctx.formValues?.[codeField] ?? "" : "";
    const nameVal = nameField ? ctx.formValues?.[nameField] ?? "" : "";

    control = (
      <CodeNamePair
        // ✅ label은 FieldControl이 그리므로 숨김
        externalLabel
        value={{ code: codeVal, name: nameVal }}
        onChange={({ code, name }) => {
          const patch = {};
          if (codeField) patch[codeField] = code ?? "";
          if (nameField) patch[nameField] = name ?? "";
          ctx.setMany(patch);  // formValues에 epcode/epname 같이 한번에 반영
        }}

        // placeholder/동작 옵션들 field에서 그대로 가져오기
        codePlaceholder={field.codePlaceholder ?? placeholder ?? "코드"}
        namePlaceholder={field.namePlaceholder ?? field.nameLabel ?? "명칭"}
        readOnlyName={field.readOnlyName ?? false}
        resetNameOnCodeChange={field.resetNameOnCodeChange ?? true}
        clearable={field.clearable}
        compact={field.compact ?? false}
        disabled={field.disabled || props?.disabled}

        className={props?.className}
        labelClassName={field.labelClassName}
        codeClassName={field.codeClassName}
        nameClassName={field.nameClassName}

        // 🔍 lookup 버튼 / F2 동작
        onLookup={() => {
          if (typeof field.onLookup === "function") {
            // 외부에서 setEmpOpen 같은 거 걸어두고 싶을 때
            field.onLookup(ctx);
          } else if (field.picker) {
            // FormGrid의 공용 LookupDialog 사용
            ctx.openLookupForField(field);
          }
        }}
      />
    );
  } else if (t === "select") {
    const uiValue = (value === "" || value == null) ? (includeAllOption ? EMPTY : undefined) : String(value);
    control = (
      <Select
        value={uiValue}
        onValueChange={(val) => setField(name, val === EMPTY ? "" : val)}
        disabled={props?.disabled || loading}
      >
        <SelectTrigger
          className={cn(CONTROL_BASE, props?.className, invalidCls, loading && "opacity-70")}
          aria-invalid={!!fieldError}
        >
          <SelectValue placeholder={placeholder ?? (loading ? "불러오는 중..." : "선택")} />
        </SelectTrigger>

        <SelectContent>
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">불러오는 중...</div>}
          {loadErr && <div className="px-3 py-2 text-sm text-red-600">{loadErr}</div>}

          {includeAllOption && <SelectItem value={EMPTY}>전체</SelectItem>}
          {optItems.map((opt, i) => {
            const val = String(opt.id ?? opt.value ?? opt.code ?? i);
            const lbl = opt.label ?? opt.name ?? opt.title ?? String(val);
            return (
              <SelectItem key={val} value={val}>{lbl}</SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );

  } else if (t === "listbox") {
    const multiple = !!field.multiple;
    const valArr = Array.isArray(value) ? value.map(String) : [];
    const valStr = !Array.isArray(value) ? String(value ?? "") : "";

    const listboxRows = field.listboxRows ?? 6; // 기본 6줄
    const rowHeight = 32; // px
    const boxHeight = rowHeight * listboxRows;

    const toggleValue = (val) => {
      if (multiple) {
        const exists = valArr.includes(val);
        const next = exists ? valArr.filter(v => v !== val) : [...valArr, val];
        setField(name, next);
      } else {
        setField(name, val);
      }
    };
    const clearAll = () => setField(name, multiple ? [] : "");

    control = (
      <div className={cn("min-w-0", props?.className)}>
        <div
          role="listbox"
          aria-multiselectable={multiple || undefined}
          tabIndex={0}
          className={cn(
            "w-full rounded-md border bg-background",
            "overflow-auto focus:outline-none focus:ring-2 focus:ring-ring",
            invalidCls
          )}
          style={{ maxHeight: `${boxHeight}px` }}
        >
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">불러오는 중…</div>}
          {loadErr && <div className="px-3 py-2 text-sm text-red-600">{loadErr}</div>}

          {includeAllOption && (
            <div
              role="option"
              aria-selected={multiple ? valArr.length === 0 : valStr === ""}
              onClick={clearAll}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                (multiple ? valArr.length === 0 : valStr === "") && "bg-accent/50"
              )}
            >
              전체
            </div>
          )}

          {optItems.map((opt, i) => {
            const val = String(opt.id ?? opt.value ?? opt.code ?? i);
            const lbl = opt.label ?? opt.name ?? opt.title ?? String(val);
            const selected = multiple ? valArr.includes(val) : valStr === val;
            return (
              <div
                key={val}
                role="option"
                aria-selected={selected}
                onClick={() => toggleValue(val)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  selected && "bg-accent/50"
                )}
              >
                {multiple ? (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selected} readOnly className="h-3.5 w-3.5" />
                    <span className="truncate">{lbl}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-2.5 w-2.5 rounded-full border",
                        selected ? "bg-foreground" : "bg-background"
                      )}
                    />
                    <span className="truncate">{lbl}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

  } else if (t === "checkbox") {
    // ✅ checkOption이 없으면 기본값 ONEZERO 설정
    const checkOption = field.checkOption || '1';  // CHECKBOX_OPTIONS.ONEZERO

    // ✅ value는 normalizeValue("checkbox")에서 이미 boolean으로 정규화됨
    // true/false 값만 받으므로 직접 사용
    const checked = value === true;

    control = (
      <div className={cn("flex items-center gap-2", props?.className)}>
        <Checkbox
          checked={checked}
          onCheckedChange={(val) => {
            // ✅ form에는 UI 값 (boolean)을 저장
            // save할 때 toServer에서 자동으로 DB 값 (1/0, t/f, true/false 등)으로 변환됨
            setField(name, val);
          }}
          aria-invalid={!!fieldError}
        />
        {field.inlineLabel && (
          <Label className="text-sm text-foreground/90">{field.inlineLabel}</Label>
        )}
      </div>
    );

  } else if (t === "radiogroup") {
    const direction = field.direction === "horizontal" ? "horizontal" : "vertical";
    const items = optItems;
    control = (
      <RadioGroup
        value={String(value ?? "")}
        onValueChange={(val) => setField(name, val)}
        className={cn(direction === "horizontal" ? "flex flex-wrap gap-4" : "space-y-2", props?.className)}
      >
        {items.map((opt, i) => {
          const val = String(opt.id ?? opt.value ?? opt.code ?? i);
          const lbl = opt.label ?? opt.name ?? opt.title ?? String(val);
          return (
            <div key={val} className="flex items-center gap-2">
              <RadioGroupItem id={`${name}-${val}`} value={val} />
              <Label htmlFor={`${name}-${val}`} className="text-sm">{lbl}</Label>
            </div>
          );
        })}
      </RadioGroup>
    );

  } else if (t === "checkboxgroup") {
    const direction = field.direction === "horizontal" ? "horizontal" : "vertical";
    const selected = Array.isArray(value) ? value.map(String) : [];
    const toggle = (val) => {
      const has = selected.includes(val);
      const next = has ? selected.filter(v => v !== val) : [...selected, val];
      setField(name, next);
    };
    const clearAll = () => setField(name, []);

    control = (
      <div className={cn("space-y-2", props?.className)}>
        {includeAllOption && (
          <button type="button" onClick={clearAll} className="text-xs text-muted-foreground underline">
            전체 해제
          </button>
        )}
        <div className={cn(direction === "horizontal" ? "flex flex-wrap gap-4" : "space-y-2")}>
          {optItems.map((opt, i) => {
            const val = String(opt.id ?? opt.value ?? opt.code ?? i);
            const lbl = opt.label ?? opt.name ?? opt.title ?? String(val);
            const checked = selected.includes(val);
            return (
              <div key={val} className="flex items-center gap-2">
                <Checkbox
                  id={`${name}-${val}`}
                  checked={checked}
                  onCheckedChange={() => toggle(val)}
                />
                <Label htmlFor={`${name}-${val}`} className="text-sm">{lbl}</Label>
              </div>
            );
          })}
        </div>
      </div>
    );

  } else if (t === "date") {
    control = (
      <DatePicker
        value={value}
        onChange={(d) => setField(name, d ? toDateString(d) : "")}
        placeholder={placeholder || "날짜 선택"}
        numberOfMonths={1}
        className={cn(CONTROL_BASE, "px-3", props?.className, invalidCls)}
        aria-invalid={!!fieldError}
        {...restProps}
        onBlur={(e) => {
          if (validateOn?.includes("blur")) {
            const err = (validationRules?.[name]?.custom || validationRules?.[name])
              ? (validationRules?.[name]?.custom?.(value, ctx.formValues) || null)
              : null;
            setErrors?.((prev) => ({ ...prev, [name]: err }));
          }
          userOnBlur?.(e);
        }}
      />
    );

  } else if (t === "daterange") {
    control = (
      <DateRangePicker
        value={value}
        onChange={(r) => setField(name, r)}
        placeholder={placeholder || "기간 선택"}
        numberOfMonths={2}
        className={cn(CONTROL_BASE, "px-3", props?.className, invalidCls)}
        aria-invalid={!!fieldError}
        {...restProps}
        onBlur={(e) => {
          if (validateOn?.includes("blur")) {
            const err = (validationRules?.[name]?.custom || validationRules?.[name])
              ? (validationRules?.[name]?.custom?.(value, ctx.formValues) || null)
              : null;
            setErrors?.((prev) => ({ ...prev, [name]: err }));
          }
          userOnBlur?.(e);
        }}
      />
    );

  } else if (t === "number") {
    control = (
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          setField(name, e.target.value);
          userOnChange?.(e);
        }}
        placeholder={placeholder || ""}
        className={cn(CONTROL_BASE, props?.className, invalidCls)}
        aria-invalid={!!fieldError}
        {...restProps}
        onDoubleClick={() => field.picker && ctx.openLookupForField(field)}
        onBlur={(e) => {
          if (validateOn?.includes("blur")) {
            const err = (validationRules?.[name]?.custom || validationRules?.[name])
              ? (validationRules?.[name]?.custom?.(value, ctx.formValues) || null)
              : null;
            setErrors?.((prev) => ({ ...prev, [name]: err }));
          }
          userOnBlur?.(e);
        }}
      />
    );

  } else {
    control = (
      <Input
        value={value}
        onChange={(e) => {
          let v = e.target.value;

          // 마스킹 패턴 적용 (전화번호/사업자번호/우편번호 등)
          const pattern = getInputFormatPattern(field || {});
          if (pattern) {
            v = formatByPattern(v, pattern);
          }

          setField(name, v);
          userOnChange?.(e);
        }}
        placeholder={placeholder || ""}
        className={cn(CONTROL_BASE, props?.className, invalidCls)}
        aria-invalid={!!fieldError}
        {...restProps}
        onDoubleClick={() => field.picker && ctx.openLookupForField(field)}
        onBlur={(e) => {
          if (validateOn?.includes("blur")) {
            const err = (validationRules?.[name]?.custom || validationRules?.[name])
              ? (validationRules?.[name]?.custom?.(value, ctx.formValues) || null)
              : null;
            setErrors?.((prev) => ({ ...prev, [name]: err }));
          }
          userOnBlur?.(e);
        }}
      />
    );
  }

  return renderWithLabel({
    layout: labelConf.layout,
    label,
    control,
    labelPadPx: labelConf.padX,
    labelPadYPx: labelConf.padY,
    labelClassName: labelConf.labelClassName,
    controlClassName: labelConf.controlClassName,
    help,
    error: fieldError,
  });
}
