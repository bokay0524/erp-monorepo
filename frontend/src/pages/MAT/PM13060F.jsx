import React, { useState } from "react";

export default function PM13060F() {
  // 상태 관리 (예: 검색 조건)
  const [searchKeyword, setSearchKeyword] = useState("");

  // 조회 버튼 이벤트
  const handleSearch = () => {
    console.log("검색 실행:", searchKeyword);
    // TODO: 나중에 이 부분에서 Spring Boot API를 호출하게 됩니다.
  };

  return (
    <div className="flex flex-col h-full gap-4 text-slate-200">
      
      {/* 1. 상단: 검색 조건 및 액션 버튼 영역 */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-wrap justify-between items-center shrink-0 gap-4">
        
        {/* 검색 조건들 */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-300">검색어</label>
          <input
            type="text"
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm 
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       placeholder:text-slate-500"
            placeholder="검색어를 입력하세요"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* 공통 버튼들 (조회, 저장 등) */}
        <div className="flex gap-2">
          <button 
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            조회
          </button>
          <button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </div>

      {/* 2. 하단: 메인 데이터 영역 (그리드/테이블) */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 p-4 overflow-auto flex flex-col min-h-0">
        <div className="text-sm text-slate-400 mb-3 font-medium">데이터 목록 (총 0건)</div>
        
        <div className="flex-1 overflow-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-800 text-slate-300 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">품목코드</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">품목명</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">규격</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">단위</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-700">비고</th>
              </tr>
            </thead>
            <tbody>
              {/* 데이터가 없을 때의 UI */}
              <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                  조회된 데이터가 없습니다.
                </td>
              </tr>
              {/* 실제 데이터가 들어올 경우 아래와 같이 반복(map) 렌더링 */}
              {/* <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-4 py-3">ITEM-001</td>
                <td className="px-4 py-3">테스트 품목</td>
                ...
              </tr> */}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}