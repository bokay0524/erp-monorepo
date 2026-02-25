import React, { useMemo, useState, useEffect } from "react";
import SidebarTree from "./SidebarTree";
import TopToolbar from "./TopToolbar";
import TabHost from "./TabHost";
import GlobalHeader from "./GlobalHeader";
import { fetchMenu } from "../api/MenuApi";

export default function AppShell() {
  const [menu, setMenu] = useState([]);

  const [tabs, setTabs] = useState([{ key: "home", title: "Home", path: "/app/home" }]);
  const [activeKey, setActiveKey] = useState("home");  

  const [menuKeyword, setMenuKeyword] = useState("");

  const pathToTitle = useMemo(() => {
    const map = new Map();
    const walk = (nodes) => {
      nodes.forEach((n) => {
        if (n.path) map.set(n.path, n.title);
        if (n.children) walk(n.children);
      });
    };
    walk(menu);
    map.set("/app/home", "Home");
    return map;
  }, [menu]);

  useEffect(() => {
    fetchMenu()
      .then(setMenu)
      .catch((e) => {
        console.error(e);
        setMenu([]); // 실패 시 빈 메뉴
      });
  }, []);
  

  const openTab = (path, title) => {
    const exist = tabs.find((t) => t.path === path);
    if (exist) return setActiveKey(exist.key);

    title = pathToTitle.get(path) ?? title;
    const key = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setTabs((prev) => [...prev, { key, title, path }]);
    setActiveKey(key);
  };

  const closeTab = (key) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.key !== key);
      if (activeKey === key) {
        const last = next[next.length - 1];
        setActiveKey(last?.key ?? "home");
      }
      return next.length ? next : [{ key: "home", title: "Home", path: "/app/home" }];
    });
  };

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];


  return (
    <div className="h-screen w-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* ✅ 전체를 rows로: GlobalHeader + Main */}
      <div className="h-full min-w-0 grid grid-rows-[48px_1fr]">
        <GlobalHeader />

        <div className="min-h-0 grid grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="border-r border-slate-800/70 bg-slate-950 min-w-0 flex flex-col min-h-0">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/70 shrink-0">
              <div className="font-semibold tracking-tight">메뉴항목</div>
              {/*<span className="text-xs text-slate-400">Tree</span> */}
            </div>

            <div className="px-3 py-3 border-b border-slate-800/70 shrink-0">
              <input
                className="w-full rounded-xl bg-slate-900/60 border border-slate-800/70 px-3 py-2 text-sm
                          placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600"
                placeholder="메뉴 검색..."
                value={menuKeyword}
                onChange={(e) => setMenuKeyword(e.target.value)}
              />
            </div>

            {/* ✅ 이 영역이 남은 높이 전부 차지 */}
            <div className="flex-1 min-h-0">
              <SidebarTree tree={menu} keyword={menuKeyword} onOpen={openTab} />
            </div>
          </aside>


          {/* Right */}
          <section className="min-w-0 flex flex-col">
            <TopToolbar
              title={activeTab.title}
              onAction={(action) => console.log("Toolbar action:", action, "active:", activeTab)}
            />
            <div className="min-h-0 flex-1">
              <TabHost
                tabs={tabs}
                activeKey={activeKey}
                onChange={setActiveKey}
                onClose={closeTab}
                activeTab={activeTab}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
