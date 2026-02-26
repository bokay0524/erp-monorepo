// GridSection.jsx
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  RefreshCw,
  AlignJustify,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SimpleTable from "@/components/table/SimpleTable";
import { renderCellText } from "@/lib/table-renderers";
import { calcMinTableWidth } from "@/lib/table-layout-utils";
import { useResultSearch } from "@/hooks/useResultSearch";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useTableSorting } from "@/hooks/useTableSorting";
import { GridPaginationBar } from "@/components/table/GridPaginationBar";
import { ResultSearchInput } from "@/components/table/ResultSearchInput";

/* ⬇️ NEW: 컬럼 자동 생성 유틸 */
function autoColumnsFromRows(rows = [], opts = {}) {
  const {
    maxCols,
    guessAlign = true,
    shortKeys = [],
  } = opts;
  const first = rows?.[0];
  if (!first || typeof first !== "object") return [];

  let keys = Object.keys(first);
  if (maxCols && Number.isFinite(maxCols)) keys = keys.slice(0, maxCols);

  const isDateLike = (v) => {
    if (v == null) return false;
    const s = String(v);
    return /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s);
  };

  return keys.map((k) => {
    const sample = first[k];
    let align = "left";
    if (guessAlign) {
      if (typeof sample === "number") align = "right";
      else if (isDateLike(sample)) align = "center";
    }
    return {
      key: k,
      header: k,
      sortable: true,
      align,
      fitContent: shortKeys.includes(k),
    };
  });
}

/* CSV 유틸 */
function exportToCSV(filename, columns, rows) {
  const headers = columns.map((c) => c.header ?? c.key);
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = renderCellText(col, row);
        const s = (raw ?? "").toString().replace(/"/g, '""');
        return `"${s}"`;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...lines].join("\r\n");
  const csvWithBom = "\uFEFF" + csv;
  const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const safeFileName = (s) =>
  (s ?? "export")
    .toString()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
const getProgramTitleFromDocument = () => {
  if (typeof document === "undefined") return null;
  const raw = document.title?.trim();
  if (!raw) return null;
  const base = raw.split(/[|\-–—•·›»]/)[0]?.trim();
  return base || raw;
};

/* 날짜 안전 유틸 (yyyy.MM.dd → yyyymmdd) */
const ymdFromServer = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (m) return Number(m[1] + m[2] + m[3]);
  const m2 = s.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (m2)
    return Number(
      m2[1] + String(m2[2]).padStart(2, "0") + String(m2[3]).padStart(2, "0"),
    );
  return null;
};

/**
 * 페이지 스크롤 전용 GridSection + 날짜 안전 옵션
 */
export default function GridSection({
  // 자동 컬럼/rowKey 옵션
  autoColumns = true,
  autoColumnsOptions, // { maxCols?, guessAlign?, shortKeys? }
  autoRowKey = true,
  rowKeyCandidates = ["id", "ID", "epcode", "사번", "코드"],
  showRowNumber = false, // 🔹 NEW: 행 번호 표시 여부

  // 날짜 표시 안전 옵션
  dateAsText = false,
  dateKeys, // string[]
  detectByKeySuffix = true,

  // 툴바 커스텀
  toolbarLeft,
  toolbarRight,

  // 새로고침/내보내기
  showRefresh = false,
  onRefresh,
  showExport = false,
  onExportCSV,
  exportFileName,

  // 밀도
  densityControlled,
  defaultDensity = "normal",

  // 테이블/스타일
  stickyHeader = true,
  className,
  contentClassName,
  autoMinWidth = true,

  // 데이터/컬럼
  table = {}, // { columns, rows, rowKey, emptyText, ... }

  // 정렬
  sorting,
  defaultSorting,
  onSortingChange,

  // 페이지네이션
  pagination = true,
  page,
  pageSize,
  onPageChange,
  defaultPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],

  // 결과 검색
  showResultSearch = true,
  resultSearch,
  defaultResultSearch = "",
  onResultSearchChange,
  searchKeys,
  rowToSearchText,
  resultSearchPlaceholder = "결과 검색",

  // 왼쪽 요약(총 N건)
  showSummaryLeft = true,

  // 헤더 색상
  tableHeaderVariant = "muted",
  tableHeaderClassName,
}) {
  const baseRows = table?.rows ?? [];

  // 1) 컬럼 자동 생성
  const baseColumns = useMemo(() => {
    const cols = table?.columns ?? [];
    if (cols && cols.length) return cols;
    if (!autoColumns) return [];
    return autoColumnsFromRows(baseRows, autoColumnsOptions);
  }, [table?.columns, baseRows, autoColumns, autoColumnsOptions]);

  // 2) 날짜 컬럼 key 세트
  const dateKeySet = useMemo(() => {
    if (!dateAsText) return new Set();
    if (Array.isArray(dateKeys) && dateKeys.length) {
      return new Set(dateKeys);
    }
    if (!detectByKeySuffix) return new Set();
    const set = new Set();
    for (const c of baseColumns) {
      const k = c?.key;
      if (!k) continue;
      if (/Date$/i.test(k)) set.add(k);
    }
    return set;
  }, [dateAsText, dateKeys, detectByKeySuffix, baseColumns]);

  // 3) 날짜 컬럼 변환된 columns
  const columnsView = useMemo(() => {
    if (!dateAsText || dateKeySet.size === 0) return baseColumns;
    return baseColumns.map((c) => {
      const k = c?.key;
      if (!k || !dateKeySet.has(k)) return c;

      return {
        ...c,
        key: `${k}_text`,
        valueType: "text",
        render: (row) => row?.[`${k}_text`],
        sortable: c.sortable !== false,
        sortAccessor: (row) => ymdFromServer(row?.[k]) ?? 0,
        sortCompare: (a, b) => a - b,
      };
    });
  }, [baseColumns, dateAsText, dateKeySet]);



  // 4) 날짜 *_text 필드 rows에 주입
  const rowsView = useMemo(() => {
    if (!dateAsText || dateKeySet.size === 0) return baseRows;
    return (Array.isArray(baseRows) ? baseRows : []).map((r) => {
      const out = { ...r };
      dateKeySet.forEach((k) => {
        out[`${k}_text`] = r?.[k] != null ? String(r[k]) : "";
      });
      return out;
    });
  }, [baseRows, dateAsText, dateKeySet]);

  // 5) 기본 정렬 키 날짜 보정
  const normalizedDefaultSorting = useMemo(() => {
    if (!defaultSorting) return null;
    const k = defaultSorting.key;
    if (dateAsText && dateKeySet.has(k)) {
      return { ...defaultSorting, key: `${k}_text` };
    }
    return defaultSorting;
  }, [defaultSorting, dateAsText, dateKeySet]);

  // 6) rowKey 자동 추정
  const resolvedRowKey = useMemo(() => {
    if (table?.rowKey) return table.rowKey;
    if (!autoRowKey) return undefined;
    const first = rowsView?.[0];
    if (!first) return undefined;
    const found = rowKeyCandidates.find((k) =>
      Object.prototype.hasOwnProperty.call(first, k),
    );
    if (found) return found;
    return columnsView?.[0]?.key ?? Object.keys(first)[0];
  }, [table?.rowKey, autoRowKey, rowKeyCandidates, rowsView, columnsView]);

  /* 밀도 */
  const [localDensity, setLocalDensity] = useState(defaultDensity);
  const density = densityControlled?.value ?? localDensity;
  const setDensity = densityControlled?.onChange ?? setLocalDensity;
  const isCompact = density === "compact";
  const densityRowCls = isCompact ? "px-3 py-1.5" : "px-4 py-2";

  /* 1) 검색 */
  const {
    query,
    setQuery,
    filteredRows,
  } = useResultSearch({
    rows: rowsView,
    columns: columnsView,
    resultSearch,
    defaultResultSearch,
    onResultSearchChange,
    searchKeys,
    rowToSearchText,
  });

  /* 2) 정렬 */
  const {
    sort,
    requestSort,
    sortedRows,
  } = useTableSorting({
    columns: columnsView,
    rows: filteredRows,
    sorting,
    defaultSorting: normalizedDefaultSorting ?? undefined,
    onSortingChange,
  });

  /* 3) 페이징 */
  const {
    page: currentPage,
    pageSize: ps,
    total,
    maxPage,
    start,
    end,
    pageRows,
    setPage,
    setPageSize,
  } = useClientPagination({
    rows: sortedRows,
    page,
    pageSize,
    defaultPageSize,
    onPageChange,
    enabled: pagination,
  });

  // 3-1) 행 번호 컬럼 추가 (start가 정의된 후 선언)
  const columnsWithRowNumber = useMemo(() => {
    if (!showRowNumber) return columnsView;
    return [
      {
        key: "_rowNumber",
        header: "No.",
        width: 50,
        align: "center",
        fitContent: true,
        render: (_, index) => (start ?? 0) + index + 1,
      },
      ...columnsView,
    ];
  }, [columnsView, showRowNumber, start]);

  /* 왼쪽 요약 */
  const effectiveTotal = Array.isArray(filteredRows) ? filteredRows.length : 0;
  const hasCustomLeft =
    !(toolbarLeft == null || toolbarLeft === "" || toolbarLeft === false);
  const summaryLeftNode = hasCustomLeft
    ? toolbarLeft
    : showSummaryLeft !== false
      ? (
        <>
          총{" "}
          <b className="tabular-nums">{effectiveTotal.toLocaleString()}</b>건
        </>
      )
      : null;

  /* CSV 내보내기 (검색/정렬 반영 전체) */
  const doExportCSV = () => {
    const baseRaw =
      exportFileName ||
      `${safeFileName(getProgramTitleFromDocument() || "export")}`;
    const base = baseRaw.toLowerCase().endsWith(".csv")
      ? baseRaw
      : `${baseRaw}.csv`;
    const cols = columnsWithRowNumber ?? baseColumns;
    const dataForExport = sortedRows;
    exportToCSV(base, cols, dataForExport);
  };

  // minWidth 계산도 최종 컬럼 기준으로
  const tableMinWidth = useMemo(
    () => (autoMinWidth ? calcMinTableWidth(columnsWithRowNumber || []) : 0),
    [autoMinWidth, columnsWithRowNumber],
  );

  return (
    <Card className={cn(className)}>
      <CardContent className={cn("p-0", contentClassName)}>
        {/* Toolbar */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center p-4 gap-3">
          <div className="text-sm text-foreground whitespace-nowrap">
            {summaryLeftNode}
          </div>
          <div />
          <div className="flex items-center gap-2 min-w-0 justify-end">
            {/* 검색 */}
            {showResultSearch && (
              <ResultSearchInput
                value={query}
                onChange={(v) => {
                  // 검색어 바뀌면 첫 페이지로
                  if (pagination) setPage(1);
                  setQuery(v);
                }}
                placeholder={resultSearchPlaceholder}
              />
            )}

            {/* 밀도 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="행 간격 설정">
                  <AlignJustify className="mr-2 h-4 w-4" />
                  {density === "compact" ? "컴팩트" : "보통"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>행 간격</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDensity("normal")}>
                  보통
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDensity("compact")}>
                  컴팩트
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 새로고침 */}
            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={!onRefresh}
                aria-label="새로고침"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            )}

            {/* 내보내기 */}
            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="내보내기">
                    <Download className="mr-2 h-4 w-4" />
                    내보내기
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      (onExportCSV ? onExportCSV() : doExportCSV())
                    }
                  >
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {toolbarRight}
          </div>
        </div>

        <Separator />

        {/* Table: 컬럼 많을 때 가로 스크롤 */}
        <div className="overflow-x-auto overflow-y-visible">
          <div style={{ minWidth: tableMinWidth || undefined }}>
            <SimpleTable
              columns={columnsWithRowNumber}
              rows={pageRows}
              rowKey={resolvedRowKey}
              emptyText={table.emptyText}
              stickyHeader={stickyHeader}
              densityRowCls={densityRowCls}
              sorting={sort}
              onRequestSort={requestSort}
              onCellClick={table.onCellClick}
              headerVariant={tableHeaderVariant}
              headerClassName={tableHeaderClassName}
              striped={table.striped}
              stripeOddClass={table.stripeOddClass}
              stripeEvenClass={table.stripeEvenClass}
              rowClassName={table.rowClassName}
              autoSize={table.autoSize}
              wrapOverflow={false}
            />
          </div>
        </div>

        {/* Pagination */}
        {pagination && (
          <>
            <Separator />
            <GridPaginationBar
              total={total}
              start={start}
              end={end}
              page={currentPage}
              maxPage={maxPage}
              pageSize={ps}
              pageSizeOptions={pageSizeOptions}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              query={query}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
