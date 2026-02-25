/**
 * Frontend에서 Backend로 http 요청 시, 헤더에 자동으로 토큰 주입하는 프로세스 
 * 401이면 강제 로그아웃 처리
 * JSON 파싱 / 에러 처리
 * 
 * 모든 API 호출을 대신해주고, 토큰 자동 첨부 + 401 공통처리
 */
export default async function ApiClient(url, options = {}) {
  const token = localStorage.getItem("accessToken");

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // 401 공통 처리 (선택)
  if (res.status === 401) {
    // 토큰이 만료/무효면 로그아웃 처리
    localStorage.removeItem("accessToken");
    // 로그인 페이지로 보내기(원하면)
    // window.location.href = "/login";
  }

  const contentType = res.headers.get("content-type") || "";
  const data =
    contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.message || data?.error || JSON.stringify(data);
    throw new Error(msg);
  }

  return data;
}


// export async function ApiFetch(url, options = {}) {
//     const token = localStorage.getItem("accessToken");
  
//     const res = await fetch(url, {
//       ...options,
//       headers: {
//         "Content-Type": "application/json",
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//         ...(options.headers || {}),
//       },
//     });
  
//     if (res.status === 401) {
//       localStorage.removeItem("accessToken");
//       window.location.href = "/login";
//       return;
//     }
  
//     if (!res.ok) {
//       const text = await res.text();
//       throw new Error(text || "API Error");
//     }
  
//     return res.status === 204 ? null : res.json();
//   }
  