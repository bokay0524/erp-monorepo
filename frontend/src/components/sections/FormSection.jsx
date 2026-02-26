import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import FormGrid from "./shared/FormGrid";

// 기본 검증기 (간단 예시 — 기존 규칙을 여기에 넣어도 됨)
function validateField(value, rules = {}, form) {
  if (!rules) return null;
  const v = value;
  if (rules.required) {
    const empty = v == null || String(v).trim?.() === "" || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
    if (empty) return rules.message || "필수 입력입니다.";
  }
  if (rules.pattern?.test && v != null && String(v).trim?.() !== "" && !rules.pattern.test(String(v))) return rules.message || "형식이 올바르지 않습니다.";
  if (rules.min != null && !isNaN(Number(v)) && Number(v) < rules.min) return rules.message || `최소값은 ${rules.min}입니다.`;
  if (rules.max != null && !isNaN(Number(v)) && Number(v) > rules.max) return rules.message || `최대값은 ${rules.max}입니다.`;
  if (rules.minLength != null && v != null && String(v).length < rules.minLength) return rules.message || `최소 ${rules.minLength}자 이상`;
  if (rules.maxLength != null && v != null && String(v).length > rules.maxLength) return rules.message || `최대 ${rules.maxLength}자 이하`;
  if (typeof rules.custom === "function") { const r = rules.custom(v, form); if (typeof r === "string" && r) return r; }
  return null;
}

export default function FormSection({
  id = "form-section",
  fields = [],
  values,
  defaultValues = {},
  onChange,
  onSubmit,
  onReset,
  cols = 6,
  bp = "lg",
  className,
  labelConfig,
  // 폼 전용
  validationRules = {},
  validateOn = ["submit", "blur"],
  showErrors = true,
  warnBeforeUnload = true,
  computed,
  // 액션
  actions,
  showActions = false,
  onSave,
  onDelete,
  loading = {},
  disabled = {},
}) {
  const [local, setLocal] = useState(values ?? defaultValues);
  const v = values ?? local;

  // dirty
  const initRef = useRef(JSON.stringify(v));
  const dirty = useMemo(() => JSON.stringify(v) !== initRef.current, [v]);

  useEffect(() => {
    if (!warnBeforeUnload) return;
    const handler = (e) => { if (!dirty) return; e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, warnBeforeUnload]);

  // 검증 상태
  const [errors, setErrors] = useState({});

  const validateAll = (form) => {
    const nextErrors = {};
    Object.keys(validationRules || {}).forEach((name) => {
      const rule = validationRules[name];
      // 공통 validateField + custom
      const base = validateField(form?.[name], rule, form);
      nextErrors[name] = base;
    });
    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    let canSubmit = true;
    if (validateOn?.includes("submit")) {
      const errs = validateAll(v);
      canSubmit = Object.values(errs).every((x) => !x);
    }
    if (!canSubmit) return;
    onSubmit?.(v, e);
    onSave?.(v);
  };

  const handleReset = () => { values ? onChange?.(defaultValues) : setLocal(defaultValues); setErrors({}); onReset?.(); };

  const builtInActions = showActions ? (
    <div className="mt-2 flex justify-end gap-2">
      {onDelete && (
        <Button type="button" variant="destructive" onClick={() => onDelete?.(v)} disabled={!!disabled.delete || !!loading.delete}>
        {loading.delete ? "삭제 중…" : "삭제"}
        </Button>
      )}
      <Button type="button" variant="outline" onClick={handleReset}>초기화</Button>
      <Button type="submit" variant="default" disabled={!!disabled.save || !!loading.save}>
        {loading.save ? "저장 중…" : "저장"}
      </Button>
    </div>
  ) : null;

  return (
      <form id={id} onSubmit={handleSubmit}>
      <FormGrid
        id={`${id}__grid`}
        fields={fields}
        values={v}
        onChange={values ? onChange : setLocal}
        defaultValues={defaultValues}
        cols={cols}
        bp={bp}
        className={className}
        labelConfig={labelConfig}
        // 폼 전용 옵션 전달
        validationRules={validationRules}
        validateOn={validateOn}
        showErrors={showErrors}
        errors={errors}
        setErrors={setErrors}
        computed={computed}
      />
      
      {/* 액션 영역 */}
      {actions ? <div className="mt-2 flex justify-end gap-2">{actions}</div> : builtInActions}
    </form>
  );
}