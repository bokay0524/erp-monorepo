import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import LookupDialog from "@/components/picker/LookupDialog";
import { usePicker } from "@/components/picker/PickerProvider";
import FieldControl from "./FieldControl";
import { DEFAULT_LABEL_CONF, GRID_COLS, spanClass, startClass, normalizeValue } from "./field-helpers.js";

export default function FormGrid({
    id,
    fields = [],
    values,
    onChange,
    defaultValues = {},
    cols = 6,
    bp = "lg",
    className,
    labelConfig = DEFAULT_LABEL_CONF,
    allRows,
    // validation (선택)
    validationRules,
    validateOn,
    showErrors,
    errors,
    setErrors,
    // computed (선택)
    computed,
}) {
    const openPicker = usePicker();
    const [local, setLocal] = useState(values ?? defaultValues);
    const v = values ?? local;

    // Lookup 모달
    const [lkOpen, setLkOpen] = useState(false);
    const [lkOpts, setLkOpts] = useState(null);

    const setField = (name, val) => {
        let next = { ...v, [name]: val };

        // computed 적용
        if (Array.isArray(computed) && computed.length) {
            computed.forEach(({ watch = [], compute }) => {
                if (watch.includes(name) && typeof compute === "function") {
                    const patch = compute(next);
                    if (patch && typeof patch === "object") next = { ...next, ...patch };
                }
            });
        }

        if (values) onChange?.(next); else setLocal(next);

        if (validateOn?.includes("change") && setErrors) {
            const rule = validationRules?.[name];
            if (rule?.custom) setErrors((prev) => ({ ...prev, [name]: rule.custom(val, next) || null }));
        }
    };

    function openLookupForField(fieldDef) {
        const { name, picker } = fieldDef; if (!picker) return;
        const { title = "항목 선택", description, columns = [], rows, rowKey = "id", searchKeys, mapValue, onPick } = picker;

        const handleSelect = (row) => {
            if (typeof onPick === "function") {
                onPick(row, {
                    setField,
                    setMany: (obj) => { const next = { ...v, ...obj }; values ? onChange?.(next) : setLocal(next); },
                });
            } else if (name && typeof mapValue === "function") setField(name, mapValue(row));
            else if (name) setField(name, row?.[name] ?? "");
            setLkOpen(false);
        };

        setLkOpts({ title, description, columns, rows, rowKey, searchKeys, onSelect: handleSelect });
        setLkOpen(true);
    }

    const gridCols = cn(GRID_COLS.base[cols] ?? GRID_COLS.base[12], GRID_COLS[bp]?.[cols] ?? "");

    const rendered = useMemo(() =>
        (fields || []).map((f, idx) => {
            const { name, type = "input", span, start } = f;
            const value = normalizeValue(type, name ? v?.[name] : undefined);
            const wrapperCls = cn("min-w-0", spanClass(span, cols, bp), startClass(start, bp));

            const ctx = {
                openPicker,
                allRows,
                formValues: v,
                value,
                setValue: (val) => name && setField(name, val),
                setField,
                setMany: (obj) => { const next = { ...v, ...obj }; values ? onChange?.(next) : setLocal(next); },
                openLookupForField: () => openLookupForField(f),
            };


            return (
                <div key={name ?? `f-${idx}`} className={wrapperCls}>
                    <FieldControl
                        field={f}
                        value={value}
                        setField={setField}
                        ctx={ctx}
                        labelConfig={labelConfig}
                        validationRules={validationRules}
                        validateOn={validateOn}
                        showErrors={showErrors}
                        errors={errors}
                        setErrors={setErrors}
                    />
                </div>
            );
        })
    , [fields, v, cols, bp, labelConfig, allRows, openPicker, validationRules, validateOn, showErrors, errors]);

    return (
        <>
            <Card className={className}>
                <CardContent className="p-5">
                    <div id={id} className={cn("grid grid-cols-12 sm:grid-cols-12 md:grid-cols-12 gap-4 grid-flow-dense items-start", gridCols)}>
                        {rendered}
                    </div>
                </CardContent>
            </Card>

            <LookupDialog open={lkOpen} onOpenChange={setLkOpen} {...(lkOpts || { columns: [], rows: [] })} />
        </>
    );
}

