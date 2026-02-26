import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Search as SearchIcon, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props:
 * - onReset, onSearch, onSave, onDelete
 * - show: { reset, search, save, delete }        // 기본: reset, search = true
 * - labels: { reset, search, save, delete }
 * - order: ['reset','search','save','delete']
 * - confirmDelete: boolean                        // 삭제 확인(기본 true)
 * - loading: { save?, delete? }                   // search 로딩 제거 (일관성 유지)
 * - disabled: { reset?, search?, save?, delete? }
 * - enableHotkeys: boolean                        // 기본 true
 */
export default function TitleActions({
  onReset,
  onSearch,
  onSave,
  onDelete,
  show = { reset: true, search: true, save: false, delete: false },
  labels = { reset: "초기화", search: "조회", save: "저장", delete: "삭제" },
  order = ["reset", "search", "save", "delete"],
  confirmDelete = true,
  loading = {},              // { save, delete }만 사용
  disabled = {},
  enableHotkeys = true,
  className,
}) {
  const searchVariant = show.save && show.search ? "secondary" : "default";

  // ===== Hotkeys =====
  useEffect(() => {
    if (!enableHotkeys) return;

    const isEditable = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      return el.matches('input, textarea, select, [contenteditable="true"]');
    };

    const handler = (e) => {
      const target = e.target;

      // Ctrl/⌘ + S : 저장
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (show.save && onSave && !disabled.save && !loading.save) {
          e.preventDefault(); // 브라우저 '페이지 저장' 방지
          onSave();
        }
        return;
      }

      // Enter : 조회 (textarea 입력 중엔 무시)
      if (
        e.key === "Enter" &&
        !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
      ) {
        const tag = target?.tagName;
        if (tag === "TEXTAREA") return;
        if (show.search && onSearch && !disabled.search) {
          onSearch();
        }
        return;
      }

      // Delete : 삭제 (입력필드에서 텍스트 지우는 건 방해하지 않음)
      if (e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isEditable(target)) return;
        if (show.delete && onDelete && !disabled.delete && !loading.delete) {
          if (confirmDelete) {
            const ok = window.confirm("정말 삭제하시겠습니까?");
            if (!ok) return;
          }
          onDelete();
        }
        return;
      }

      // Esc : 초기화
      if (e.key === "Escape" && onReset && show.reset && !disabled.reset) {
        onReset();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    enableHotkeys,
    show.reset, show.search, show.save, show.delete,
    onReset, onSearch, onSave, onDelete,
    disabled.reset, disabled.search, disabled.save, disabled.delete,
    loading.save, loading.delete,
  ]);

  const renderBtn = (key) => {
    switch (key) {
      case "reset":
        if (!show.reset) return null;
        return (
          <Button
            key="reset"
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={disabled.reset}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {labels.reset}
          </Button>
        );
      case "search":
        if (!show.search) return null;
        return (
          <Button
            key="search"
            type="button"
            variant={searchVariant}
            onClick={onSearch}
            disabled={disabled.search}
          >
            <SearchIcon className="mr-1.5 h-4 w-4" />
            {labels.search}
          </Button>
        );
      case "save":
        if (!show.save) return null;
        return (
          <Button
            key="save"
            type="button"
            variant="default"
            onClick={onSave}
            disabled={disabled.save || loading.save}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {loading.save ? "저장 중…" : labels.save}
          </Button>
        );
      case "delete":
        if (!show.delete) return null;
        return (
          <Button
            key="delete"
            type="button"
            variant="destructive"
            onClick={() => {
              if (confirmDelete) {
                const ok = window.confirm("정말 삭제하시겠습니까?");
                if (!ok) return;
              }
              onDelete?.();
            }}
            disabled={disabled.delete || loading.delete}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {loading.delete ? "삭제 중…" : labels.delete}
          </Button>
        );
      default:
        return null;
    }
  };

  return <div className={cn("flex items-center gap-2", className)}>{order.map(renderBtn)}</div>;
}
