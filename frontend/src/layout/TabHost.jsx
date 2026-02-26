import React, { Suspense, useMemo } from "react";
import Dashboard from "../pages/Dashboard";
import BlankPage from "../pages/BlankPage";

// 💡 1. Vite의 기능을 사용해 pages 폴더 안의 모든 jsx 파일 경로를 스캔하여 가져옵니다.
// 이렇게 하면 개발자가 일일이 import 구문을 쓰지 않아도 됩니다.
const pageModules = import.meta.glob("../pages/**/*.jsx");

export default function TabHost({ tabs, activeKey, onChange, onClose, activeTab }) {
  
  // 💡 2. path를 기반으로 컴포넌트를 찾아 렌더링하는 함수
  const renderDynamicPage = (path) => {
    if (path === "/app/home") return <Dashboard />;

    // 💡 3. 메뉴의 path를 실제 파일 경로 문자열로 변환합니다.
    // 예: 메뉴 path가 "/MAT/PM13060F" 라면 -> "../pages/MAT/PM13060F.jsx" 로 변환
    // (※ DB에 저장된 실제 메뉴 path 형태에 맞춰 이 부분의 문자열 조작 로직은 수정이 필요할 수 있습니다.)
    const filePath = `../pages/${path.replace('/app', '')}.jsx`; 

    console.log("check = "+filePath)
    
    // pageModules 객체에서 해당 파일 경로와 일치하는 import 함수를 꺼냅니다.
    const importComponentFunc = pageModules[filePath];

    if (!importComponentFunc) {
      console.warn(`컴포넌트 파일을 찾을 수 없습니다: ${filePath}`);
      return <BlankPage path={path} />;
    }

    // 찾은 함수를 React.lazy로 감싸서 컴포넌트로 만듭니다.
    const LazyComponent = React.lazy(importComponentFunc);

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full text-slate-500">
          화면을 불러오는 중입니다...
        </div>
      }>
        <LazyComponent />
      </Suspense>
    );
  };

  return (
    <div className="h-full grid grid-rows-[44px_1fr] min-w-0">
      {/* TAB BAR */}
      <div className="border-b border-slate-800/70 bg-slate-950">
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
                    className="ml-1 flex items-center justify-center rounded-lg px-1.5 py-0.5
                               text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                  >
                    ✕
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
          <div className="p-5 h-full">
            {activeTab && renderDynamicPage(activeTab.path)}
          </div>
        </div>
      </div>
    </div>
  );
}