// EditableGridSection.jsx
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Save, Trash2, AlignJustify } from "lucide-react";
import EditTable from "@/components/table/EditTable";
import { cn } from "@/lib/utils";
import { calcMinTableWidth } from "@/lib/table-layout-utils";
import { useResultSearch } from "@/hooks/useResultSearch";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useTableSorting } from "@/hooks/useTableSorting";
import { GridPaginationBar } from "@/components/table/GridPaginationBar";
import { ResultSearchInput } from "@/components/table/ResultSearchInput";

export default function EditableGridSection({
  // 테이블/편집 관련
  rows,
  rowKey,
  baseColumns,
  openLookup,
  selectedIds,
  setSelectedIds,
  startEdit,
  applyLocal,
  addRow, // addRowTop 없으면 사용
  addRowTop, // 맨 위에 임시행 삽입
  saveAll,
  refresh,
  onBulkDelete, // (ids)=>Promise<void>
  editableKeys, // Set | (key)=>boolean
  autoMinWidth = true,

  // 내장 에디터용 공통 카탈로그(옵션)
  editCatalogs,

  // UI/검색/페이지네이션
  className,
  contentClassName,
  showExport = false, // (미사용이지만 인터페이스 유지용)
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  showResultSearch = true,
  resultSearch,
  onResultSearchChange,
  resultSearchPlaceholder = "결과 검색",
  tableHeaderVariant = "muted",

  // 정렬 (GridSection과 동일 인터페이스)
  sorting,
  defaultSorting,
  onSortingChange,

  // 기타
  emptyText = "데이터가 없습니다. ‘새 행’을 눌러 추가하세요.",
  striped = true,

  // 밀도
  densityControlled,
  defaultDensity = "normal",

  // ✅ 추가: 셀 클릭 핸들러
  onCellClick,
  showRowNumber = false, // 🔹 NEW: 행 번호 표시 여부
}) {
  /* 밀도(행 간격) */
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
    rows,
    columns: baseColumns || [],
    resultSearch,
    defaultResultSearch: resultSearch || "",
    onResultSearchChange,
  });

  /* 2) 정렬 */
  const {
    sort,
    requestSort,
    sortedRows,
  } = useTableSorting({
    columns: baseColumns || [],
    rows: filteredRows,
    sorting,
    defaultSorting,
    onSortingChange,
  });

  /* 3) 페이징 (클라이언트) */
  const {
    page,
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
    defaultPageSize,
  });

  // 3-1) 행 번호 컬럼 추가 (start가 정의된 후 선언)
  const columnsWithRowNumber = useMemo(() => {
    const cols = baseColumns || [];
    if (!showRowNumber) return cols;
    return [
      {
        key: "_rowNumber",
        header: "No.",
        width: 50,
        align: "center",
        fitContent: true,
        editableWhen: "never", // 편집 불가
        render: (_, index) => (start ?? 0) + index + 1,
      },
      ...cols,
    ];
  }, [baseColumns, showRowNumber, start]);

  const handleAddRowTop = () => {
    setSelectedIds(new Set());
    if (typeof addRowTop === "function") addRowTop({});
    else if (typeof addRow === "function") addRow({});
    // 새 행 추가 후 첫 페이지로
    setPage(1);
  };

  const handleRowDoubleClick = (row, idx, columnKey) => {
    if (!row) return;
    const id = row?.[rowKey];
    if (id == null) return;
    startEdit?.(id, columnKey);
  };

  // 최소 테이블 폭 계산
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
            총{" "}
            <b className="tabular-nums">
              {filteredRows.length.toLocaleString()}
            </b>
            건
          </div>
          <div />
          <div className="flex items-center gap-2 min-w-0 justify-end">
            {showResultSearch && (
              <ResultSearchInput
                value={query}
                onChange={(v) => {
                  setPage(1);
                  setQuery(v);
                }}
                placeholder={resultSearchPlaceholder}
              />
            )}

            {/* 밀도 */}
            <Button
              variant="outline"
              size="sm"
              aria-label="행 간격 설정"
              asChild={false}
            >
              <span
                className="flex items-center"
                onClick={() =>
                  setDensity(density === "compact" ? "normal" : "compact")
                }
              >
                <AlignJustify className="mr-2 h-4 w-4" />
                {density === "compact" ? "컴팩트" : "보통"}
              </span>
            </Button>

            <Button size="sm" onClick={handleAddRowTop}>
              <Plus className="mr-1 h-4 w-4" /> 새 행
            </Button>
            <Button size="sm" variant="outline" onClick={saveAll}>
              <Save className="mr-1 h-4 w-4" /> 전체 저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedIds(new Set());
                refresh();
                setPage(1);
              }}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> 새로고침
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onBulkDelete?.(Array.from(selectedIds))}
              disabled={selectedIds.size === 0}
            >
              <Trash2 className="mr-1 h-4 w-4" /> 선택 삭제 ({selectedIds.size})
            </Button>
          </div>
        </div>

        <Separator />

        {/* Table */}
        <div className="w-full overflow-x-auto overflow-y-visible">
          <div style={{ minWidth: tableMinWidth || undefined }}>
            <EditTable
              rows={pageRows}
              rowKey={rowKey}
              baseColumns={columnsWithRowNumber}
              openLookup={openLookup}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              startEdit={startEdit}
              applyLocal={applyLocal}
              editableKeys={editableKeys}
              headerVariant={tableHeaderVariant}
              striped={striped}
              emptyText={emptyText}
              autoSize
              onRowDoubleClick={handleRowDoubleClick}
              editCatalogs={editCatalogs}
              /* 정렬 지원 (EditTable에서 헤더 클릭으로 requestSort 호출하도록 구현 필요) */
              sorting={sort}
              onRequestSort={requestSort}
              densityRowCls={densityRowCls}
              onCellClick={onCellClick} // ✅ Pass onCellClick to EditTable
            />
          </div>
        </div>

        {/* Pagination */}
        <Separator />
        <GridPaginationBar
          total={total}
          start={start}
          end={end}
          page={page}
          maxPage={maxPage}
          pageSize={ps}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          query={query}
        />
      </CardContent>
    </Card>
  );
}
