import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * 범용 조회/선택 모달
 *
 * props:
 * - open: boolean
 * - onOpenChange: (open:boolean)=>void
 * - title?: string
 * - description?: string
 * - columns: Array<{ key:string, header:string, width?:number }>
 * - rows: Array<any> | (()=>Promise<Array<any>>)  // 배열 또는 비동기 공급자
 * - rowKey?: string                               // default: "id"
 * - searchKeys?: string[]                         // default: columns.map(c=>c.key)
 * - onSelect: (row:any)=>void                     // 항목 클릭 시 호출
 * - initialQuery?: string
 */
export default function LookupDialog({
  open,
  onOpenChange,
  title = "항목 선택",
  description,
  columns = [],
  rows,
  rowKey = "id",
  searchKeys,
  onSelect,
  initialQuery = "",
}) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(Array.isArray(rows) ? rows : []);
  const [loading, setLoading] = useState(false);
  
  // ✅ rows가 배열로 바뀌면 data 동기화
  useEffect(() => {
    if (Array.isArray(rows)) {
      setData(rows);
    }
  }, [rows]);

  // rows가 함수면 열릴 때 로드
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (typeof rows !== "function") return;
      setLoading(true);
      try {
        const arr = await rows();
        if (!ignore) setData(Array.isArray(arr) ? arr : []);
      } finally {
        setLoading(false);
      }
    }
    if (open) load();
    return () => { ignore = true; };
  }, [open, rows]);

  
  // ✅ 다이얼로그 열릴 때 검색어 초기화(선택)
  useEffect(() => {
    if (open) setQuery(initialQuery || "");
  }, [open, initialQuery]);

  const keys = useMemo(() => {
    if (searchKeys?.length) return searchKeys;
    return columns.map(c => c.key);
  }, [columns, searchKeys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return (data || []).filter(row =>
      keys.some(k => String(row?.[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, keys]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex items-center gap-2 w-full">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색"
            className="h-9"
          />
          <div className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
            {loading ? "로딩 중…" : `${filtered.length}건`}
          </div>
        </div>

        <div className="max-h-[55vh] overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-2"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header ?? col.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r?.[rowKey] ?? i}
                  className="hover:bg-muted cursor-pointer"
                  onClick={() => onSelect?.(r)}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2">
                      {String(r?.[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                    데이터 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}