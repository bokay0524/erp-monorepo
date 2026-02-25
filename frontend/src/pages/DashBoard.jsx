export default function Dashboard() {
  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold tracking-tight">BizXR ERP</div>
      <p className="text-slate-300">로그인 성공 후 메인 화면</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
          <div className="text-sm text-slate-400">상태</div>
          <div className="mt-1 font-semibold">정상</div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
          <div className="text-sm text-slate-400">알림</div>
          <div className="mt-1 font-semibold">0건</div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
          <div className="text-sm text-slate-400">버전</div>
          <div className="mt-1 font-semibold">v0.1</div>
        </div>
      </div>
    </div>
  );
}
