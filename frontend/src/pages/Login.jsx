import React, { useState } from "react";

export default function Login() {
  const [epCode, setEpCode] = useState("");
  const [passWord, setPassWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");


  const [count, setCount] = useState(0);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!epCode.trim() || !passWord) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 백엔드 붙이기 전이라 일단 형태만.
      // 나중에 Spring Boot에서 POST /api/auth/login 만들면 바로 연결됨.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epCode: epCode.trim(), passWord: passWord }),
      });
      
      // ✅ 실패면 본문을 text로 읽어서 에러 표시
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `로그인 실패 (${res.status})`);
      }

      // ✅ 성공일 때만 JSON 파싱
      const data = await res.json();

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userInfo", data.userInfo);
      window.location.href = "/";

      //alert("로그인 성공!");
    } catch (err) {
      setError(err?.message || "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={onSubmit} style={styles.card}>
        <div style={styles.title}>ERP 로그인</div>
        <div style={styles.sub}>아이디/비밀번호로 로그인하세요.</div>

        <label style={styles.label}>아이디</label>
        <input
          value={epCode}
          onChange={(e) => setEpCode(e.target.value)}
          style={styles.input}
          placeholder="login id"
          autoFocus
        />

        <label style={styles.label}>비밀번호</label>
        <input
          type="password"
          value={passWord}
          onChange={(e) => setPassWord(e.target.value)}
          style={styles.input}
          placeholder="password"
        />

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.button} disabled={isSubmitting}>
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>

        <div style={styles.hint}>
          다음 단계: Spring Boot(MyBatis)에서 <code>/api/auth/login</code> 구현
        </div>
      </form>
      
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f5f6f8",
    padding: 24,
  },
  card: {
    width: 380,
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: 800 },
  sub: { fontSize: 13, color: "#666", marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 700, marginTop: 6 },
  input: {
    height: 40,
    borderRadius: 10,
    border: "1px solid #ddd",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
  },

  button: {
    height: 42,
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "white",
    fontWeight: 800,
    marginTop: 8,
    cursor: "pointer",
  },
  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
    marginTop: 6,
  },
  hint: { fontSize: 12, color: "#888", marginTop: 8 },
};
