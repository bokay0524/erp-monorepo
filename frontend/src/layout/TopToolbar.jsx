import React from "react";
import { useAuth } from "../auth/AuthContext";

const actions = [
  { key: "new", label: "신규" },
  { key: "search", label: "조회" },
  { key: "save", label: "저장" },
  { key: "delete", label: "삭제" },
  { key: "print", label: "출력" },
  { key: "excel", label: "XLS" },
];

function ToolButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center justify-center
        rounded-xl px-3 py-2 text-sm font-medium
        bg-slate-900/60 border border-slate-800/70
        hover:bg-slate-900 hover:border-slate-700
        active:bg-slate-800
        focus:outline-none focus:ring-2 focus:ring-slate-600
      "
      type="button"
    >
      {label}
    </button>
  );
}

export default function TopToolbar({ title, onAction }) {
  const { user } = useAuth();

  // const onAction = (functionKey) => {
  //   console.log(functionKey);
  // };

  return (
    <div className="h-14 px-3 flex items-center justify-between gap-3 border-b border-slate-800/70 bg-slate-950">
   
      {/* LEFT : 현재 화면 */}
      {/* <div className="min-w-0">
        <div className="text-xs text-slate-400">현재 화면</div>
        <div className="font-semibold truncate">{title}</div>
      </div> */}

      {/* CENTER : 툴바 버튼 */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {actions.map((a) => (
          <ToolButton
            key={a.key}
            label={a.label}
            onClick={() => onAction(a.key)}
            //onClick={onAction(a.key)}
          />
        ))}
      </div>      

    </div>
  );
}
