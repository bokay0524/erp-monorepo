// src/components/picker/SmartLookupDialog.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SearchSection from "@/components/sections/SearchSection";
import api from "@/lib/http";
import { cn } from "@/lib/utils";
import { Search as SearchIcon } from "lucide-react";

export default function SmartLookupDialog({
  open,
  onOpenChange,
  title = "데이터 검색",
  description,
  columns = [],
  scriptId,
  scriptWhereAdd,
  onSelect,
  rowKey = "id",
  titleKey,

  // 페이징
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,

  // 레이아웃/크기
  dense = true,
  dialogContentClassName,
  bodyMaxHeight = "70vh",
  tableMaxHeight = "38vh",

  // 검색 컨트롤
  searchPlacement = "top",
  searchCols = 12,
  searchBp = "lg",
  searchLabelConfig,
  searchActionsAlign = "right",
  searchOrder,
  searchSpans = {},
  // 기본 span (searchSpans에 없는 필드용)
  defaultSpan = 3,
  // searchOrder에 없는 필드도 자동으로 뒤에 붙일지
  strictOrder = false,

  searchSectionProps = {},
}) {
  const displayKey = useMemo(() => titleKey || columns[0]?.key || null, [titleKey, columns]);

  // -------------------------
  // API 엔드포인트 설정 (sys_db_script_query: GET, script_id 쿼리 필요)
  // -------------------------
  // 컴포넌트에서는 "/sys/..." 만 넘기면 http.js에서 dev/prod 규칙에 맞춰 /api 붙여줍니다.
  
  const API_URL = useMemo(() => {
   if (!scriptId) return null;
   const q = scriptWhereAdd ? `?scriptWhereAdd=${encodeURIComponent(scriptWhereAdd)}` : "";
   // dev에서는 http.js가 /api 프리픽스 자동 부여
   return `/sys/sys_popup_script/${encodeURIComponent(scriptId)}${q}`;
 }, [scriptId, scriptWhereAdd]);

  const [searchParams, setSearchParams] = useState({});
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(defaultPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const [serverPaged, setServerPaged] = useState(false);
  const fullRowsRef = useRef([]);
  const seqRef = useRef(0);

  // searchable 필드 자동 생성
  const autoFields = useMemo(() => {
    const base = columns.filter((c) => c.searchable);
    return base.map((c) => ({ name: c.key, label: c.header || c.key, type: "input" }));
  }, [columns]);

  // 간단 배치 엔진 (order + spans, 남는 필드는 자동 이어붙임)
  const computedSearchFields = useMemo(() => {
    const base = autoFields;
    if (!base.length) return [];
    const baseMap = new Map(base.map((f) => [f.name, f]));

    const orderList = Array.isArray(searchOrder) && searchOrder.length
      ? searchOrder.filter((k) => baseMap.has(k))
      : [];
    const orderSet = new Set(orderList);
    const tail = strictOrder ? [] : [...baseMap.keys()].filter((k) => !orderSet.has(k));
    const finalOrder = [...orderList, ...tail];

    const packed = [];
    let cursor = 1; // 1-based
    let rowWidth = 0;

    for (const key of finalOrder) {
      const f = baseMap.get(key);
      const spanConf = searchSpans[key];
      const span = Math.max(1, Math.min(searchCols, Number(spanConf ?? defaultSpan) || defaultSpan));

      if (rowWidth + span > searchCols) {
        cursor = 1;
        rowWidth = 0;
      }
      packed.push({ ...f, span, start: cursor });
      cursor += span;
      rowWidth += span;
      if (rowWidth === searchCols) {
        cursor = 1;
        rowWidth = 0;
      }
    }
    return packed;
  }, [autoFields, searchOrder, searchSpans, searchCols, strictOrder, defaultSpan]);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setError("");
    setPage(1);
    setSize(defaultPageSize);
    setServerPaged(false);
    fullRowsRef.current = [];
  }, [open, defaultPageSize]);

  useEffect(() => {
    if (!open) return;
    if (serverPaged) {
      void fetchData(searchParams, page, size);
    } else {
      if (fullRowsRef.current.length) {
        const start = (page - 1) * size;
        setData(fullRowsRef.current.slice(start, start + size));
        setTotal(fullRowsRef.current.length);
      } else {
        void fetchData(searchParams, 1, size);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, size, serverPaged]);

  // -------------------------
  // fetchData: GET 방식으로 호출
  // -------------------------
  const fetchData = useCallback(
    async (criteria, uiPage = page, uiSize = size) => {
      if (!scriptId) return;
      const my = ++seqRef.current;
      setIsLoading(true);
      setError("");
      if (serverPaged) setData([]);

      try {
        // criteria에서 빈값 제거
        const filtered = Object.fromEntries(
          Object.entries(criteria || {}).filter(
            ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
          )
        );

        // 서버 스크립트가 page/size를 기대하면 전달 (서버 스크립트에 맞춰 사용)
        const params = {
          script_id: scriptId,
          ...filtered,
          // 서버쪽이 0-based 페이지를 기대하면 page-1 넣기
          page: Math.max(0, uiPage - 1),
          size: uiSize,
        };
        // scriptWhereAdd가 필요하면 같이 전달 (optional)
        if (scriptWhereAdd) params.scriptWhereAdd = scriptWhereAdd;

        // GET 호출 — 결과 형태(res)가 배열 또는 { rows:[], total: n }일 수 있으니 기존 처리 로직 재사용
        const body = {
          searchParams: {
            ...filtered,
            page: Math.max(0, uiPage - 1),
            size: uiSize,
          },
          config: { columns },
        };
        const res = await api.post(API_URL, body, { timeout: 20000 });

        if (seqRef.current !== my) return;

        let rows = [];
        let t = 0;
        if (Array.isArray(res)) {
          rows = res;
        } else if (res && typeof res === "object") {
          rows = res.rows || res.data || [];
          t = Number(res.total || res.count || 0);
        }

        const serverLooksPaged =
          t > 0 ||
          (uiPage > 1 && rows.length <= uiSize && rows.length > 0) ||
          (uiPage > 1 && rows.length === 0);

        if (serverLooksPaged) {
          setServerPaged(true);
          setData(rows);
          setTotal(t || 0);
        } else {
          setServerPaged(false);
          fullRowsRef.current = rows;
          setTotal(rows.length);
          const start = (uiPage - 1) * uiSize;
          setData(rows.slice(start, start + uiSize));
        }
      } catch (e) {
        if (seqRef.current === my) setError(e?.message || "서버 통신 오류");
      } finally {
        if (seqRef.current === my) setIsLoading(false);
      }
    }, [API_URL, columns, page, size, serverPaged]);

  const submitSearch = () => {
    setPage(1);
    fullRowsRef.current = [];
    void fetchData(searchParams, 1, size);
  };
  const resetSearch = () => {
    setSearchParams({});
    setPage(1);
    fullRowsRef.current = [];
    void fetchData({}, 1, size);
  };

  const hasServerTotal = !!serverPaged && total > 0;
  const pageCount = hasServerTotal ? Math.max(1, Math.ceil(total / size)) : null;
  const noNext =
    hasServerTotal
      ? (pageCount ? page >= pageCount : true)
      : data.length < size && fullRowsRef.current.length <= page * size;

  const changeSize = (val) => {
    const ns = Number(val) || defaultPageSize;
    setSize(ns);
    setPage(1);
  };

  // 검색 UI (소형화 + 위치 제어)
  const actionsWrapCls =
    searchActionsAlign === "left"
      ? "justify-start"
      : searchActionsAlign === "between"
      ? "justify-between"
      : "justify-end";

  const searchUI =
    computedSearchFields.length && searchPlacement !== "hidden" ? (
      <div className="border rounded-md bg-muted/30 p-2 text-[12.5px]">
        <SearchSection
          id="smart-lookup__search"
          fields={computedSearchFields}
          values={searchParams}
          onChange={setSearchParams}
          onSubmit={submitSearch}
          onReset={resetSearch}
          cols={searchCols}
          bp={searchBp}
          labelConfig={searchLabelConfig}
          className={cn(searchSectionProps?.className)}
          actions={
            <div className={cn("flex gap-1 w-full", actionsWrapCls)}>
              <div className="flex gap-1">
                <Button type="button" variant="outline" onClick={resetSearch} disabled={isLoading} className="h-6 px-2 text-[12px]">
                  초기화
                </Button>
                <Button type="submit" onClick={submitSearch} disabled={isLoading} className="h-6 px-2 text-[12px]">
                  검색
                </Button>
              </div>
              {searchActionsAlign === "between" && (searchSectionProps?.extraActions || null)}
            </div>
          }
          {...searchSectionProps}
        />
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "slk-compact sm:max-w-3xl p-3 text-[12.5px] leading-tight",
          dialogContentClassName
        )}
        style={{ maxHeight: bodyMaxHeight, display: "flex", flexDirection: "column" }}
      >
        {/* 🔽 스코프드 컴팩트 스타일: SearchSection 내부 인풋까지 높이↓ */}
        <style>{`
          .slk-compact input, 
          .slk-compact select, 
          .slk-compact textarea {
            height: 1.5rem !important;      /* 24px */
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            font-size: 12px !important;
            line-height: 1.25rem !important; /* 20px */
          }
          .slk-compact .h-9 { height: 1.5rem !important; }   /* shadcn input 기본 높이 무시 */
          .slk-compact .h-8 { height: 1.5rem !important; }
          .slk-compact .h-7 { height: 1.5rem !important; }
          .slk-compact table thead tr { height: 1.75rem; }    /* 28px 헤더 */
          .slk-compact td, .slk-compact th { vertical-align: middle; }
          .slk-compact .btn-compact { height: 1.5rem; padding: 0 0.5rem; font-size: 12px; }
        `}</style>

        <DialogHeader className={dense ? "py-1" : "py-3"}>
          <DialogTitle className={cn("flex items-center", dense ? "text-[14px] font-semibold" : "")}><SearchIcon className="mr-1.5 h-4 w-4" /> {title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {searchPlacement === "top" && searchUI}

        {/* 상태 바
        <div className={cn("text-xs flex items-center gap-2 min-h-5", dense ? "mt-1" : "mt-2")}>
          {isLoading && <span className="animate-pulse">불러오는 중…</span>}
          {!isLoading && <span>{total ? `총 ${total}건` : `건수 미제공`}</span>}
          {error && <span className="text-destructive">{error}</span>}
        </div> */}

        {/* 테이블 */}
        <div className="border rounded overflow-auto mt-1" style={{ maxHeight: tableMaxHeight }}>
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1 w-12">선택</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-2 py-1 font-medium whitespace-nowrap"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header ?? col.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const key = row?.[rowKey] ?? i;
                const isSel =
                  displayKey &&
                  row?.[displayKey] !== undefined &&
                  selected?.[displayKey] === row[displayKey];
                return (
                  <tr
                    key={key}
                    className={cn("cursor-pointer", isSel ? "bg-primary/10" : "hover:bg-muted")}
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-2 py-1 text-center align-middle">
                      <input type="radio" name="smart-lookup-select" checked={!!isSel} onChange={() => setSelected(row)} />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-2 py-1 whitespace-nowrap align-middle">
                        {String(row?.[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {!isLoading && data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-2 py-4 text-center text-muted-foreground align-middle">
                    데이터 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {searchPlacement === "bottom" && searchUI}

        {/* 페이징 */}
        <div className={cn("flex items-center justify-between", dense ? "mt-1 text-[12px]" : "mt-3")}>
          <div className="text-muted-foreground">
            {/* {total
              ? `총 ${total}건 중 ${(page - 1) * size + 1}–${Math.min(page * size, total)}`
              : `페이지 ${page}`} */}
            {isLoading && <span className="animate-pulse">불러오는 중…</span>}
            {!isLoading && <span>{total ? `총 ${total}건` : `건수 미제공`}</span>}
            {error && <span className="text-destructive">{error}</span>}
          </div>
          <div className="flex items-center gap-1">
            <select className="h-6 px-1 border rounded text-[12px]" value={size} onChange={(e) => changeSize(e.target.value)}>
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}/p</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1} className="btn-compact">«</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-compact">‹</Button>
            <span className="px-1">{page}{serverPaged && total ? ` / ${Math.max(1, Math.ceil(total / size))}` : ""}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={noNext} className="btn-compact">›</Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(Math.max(1, Math.ceil(total / size)))}
              disabled={total ? page >= Math.ceil(total / size) : true}
              className="btn-compact"
            >
              »
            </Button>
          </div>
        </div>

        {/* 푸터: 수직 가운데 정렬 보정 */}
        <DialogFooter className={dense ? "pt-2" : "pt-3"}>
          <div className="w-full flex items-center justify-between">
            <div className="text-[12px] text-muted-foreground flex items-center min-h-6">
              {selected && displayKey ? (
                <span className="text-primary font-medium">선택: {String(selected[displayKey])}</span>
              ) : (
                <span>항목을 선택하세요</span>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" onClick={() => onOpenChange?.(false)} className="btn-compact">취소</Button>
              <Button onClick={() => selected && (onSelect?.(selected), onOpenChange?.(false))} disabled={!selected} className="btn-compact">
                선택
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
