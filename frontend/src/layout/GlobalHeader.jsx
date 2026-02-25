import React from "react";
import { useAuth } from "../auth/AuthContext";

export default function GlobalHeader() {
  const { user } = useAuth();

  const logout = () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  };

  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800/70 bg-slate-950 text-slate-100">
      <div className="font-semibold">BizXR ERP</div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-slate-400">{user?.teamName}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">{user?.busuName}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{user?.epName} ({user?.epCode})</div>
        </div>

        <button
          onClick={logout}
          className="rounded-lg px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700"        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
