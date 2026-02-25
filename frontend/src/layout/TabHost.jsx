import React from "react";
import Dashboard from "../pages/Dashboard";
import BlankPage from "../pages/BlankPage";

function renderByPath(path) {
  if (path === "/app/home") return <Dashboard />;
  return <BlankPage path={path} />;
}

export default function TabHost({ tabs, activeKey, onChange, onClose, activeTab }) {
  return (
    <div className="h-full grid grid-rows-[44px_1fr] min-w-0">
      {/* TAB BAR */}
      <div className="border-b border-slate-800/70 bg-slate-950">
        {/* 이 div가 '스크롤 컨테이너' */}
        <div className="flex items-center gap-2 px-3 h-11 overflow-x-auto overflow-y-hidden min-w-0">
          {tabs.map((t) => {
            const active = t.key === activeKey;
            return (
              <div
                key={t.key}
                className={[
                  "shrink-0 inline-flex items-center gap-2",
                  "rounded-2xl px-3 py-2 border text-sm",
                  "max-w-[220px] cursor-pointer select-none",
                  active
                    ? "bg-slate-900 border-slate-700 text-slate-100"
                    : "bg-slate-900/40 border-slate-800/70 text-slate-300 hover:bg-slate-900/70",
                ].join(" ")}
                onClick={() => onChange(t.key)}
                title={t.path}
              >
                <span className="truncate">{t.title}</span>

                {t.key !== "home" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(t.key);
                    }}
                    className="ml-1 rounded-lg px-1.5 py-0.5
                               text-slate-400 hover:text-slate-100
                               hover:bg-slate-800/70"
                  >                    
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-h-0 min-w-0 bg-slate-900/30 p-4 overflow-auto">
        <div className="rounded-2xl bg-white/5 border border-slate-800/70 min-h-full">
          <div className="p-5">
            {/* 여기는 화면 컴포넌트 */}
            {activeTab && <div>{/* renderByPath(activeTab.path) */}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
