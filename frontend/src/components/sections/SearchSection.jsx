import React, { useState } from "react";
import FormGrid from "./shared/FormGrid";

export default function SearchSection({
  id = "search-form",
  fields = [],
  values,
  defaultValues = {},
  onChange,
  onSubmit,
  onReset,
  cols = 6,
  bp = "lg",
  actions,
  className,
  labelConfig,
  allRows,
}) {
  const [local, setLocal] = useState(defaultValues);
  const v = values ?? local;

  const handleSubmit = (e) => { e?.preventDefault?.(); onSubmit?.(v, e); };
  const handleReset = () => { values ? onChange?.(defaultValues) : setLocal(defaultValues); onReset?.(); };

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
        allRows={allRows}
      />
      {actions ? <div className="mt-2 flex justify-end gap-2">{actions}</div> : null}
    </form>
  );
}