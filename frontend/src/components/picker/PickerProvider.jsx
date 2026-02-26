import React, { createContext, useContext, useState, useCallback } from "react";
import LookupDialog from "@/components/picker/LookupDialog";

const PickerCtx = createContext(null);

export function PickerProvider({ children }) {
  const [state, setState] = useState({ open: false, opts: null, resolver: null });

  const openPicker = useCallback((opts) => {
    // opts: { title, columns, rows(또는 async), searchKeys, rowKey, mapResult(row) ... }
    return new Promise(async (resolve) => {
      let rows = opts.rows;
      if (typeof rows === "function") rows = await rows(); // async rows 지원
      setState({ open: true, opts: { ...opts, rows }, resolver: resolve });
    });
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const onSelect = useCallback((row) => {
    const { resolver, opts } = state;
    const result = opts?.mapResult ? opts.mapResult(row) : row;
    resolver?.(result);
    close();
  }, [state, close]);

  return (
    <PickerCtx.Provider value={{ openPicker }}>
      {children}
      <LookupDialog
        open={state.open}
        onOpenChange={(v) => !v && close()}
        {...(state.opts || { columns: [], rows: [] })}
        onSelect={onSelect}
      />
    </PickerCtx.Provider>
  );
}

export function usePicker() {
  const ctx = useContext(PickerCtx);
  if (!ctx) throw new Error("usePicker must be used within PickerProvider");
  return ctx.openPicker;
}
