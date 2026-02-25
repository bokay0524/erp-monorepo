/**
 * 앱 전체에서 로그인 사용자 정보를 들고 있는 전역 저장소
 * 
 * React에서 로그인 상태를 전역으로 공유하기 위한 프로세스(Context 사용)
 * localStorage에 토큰이 존재하면,
 * 웹, 앱 시작 시 /api/auth/me api를 호출하여 user 정보 취득
 * user를 전역 상태로 저장
 * 어디서든 useAuth()를 사용하면 user 정보를 이용 가능
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchMe } from "../api/AuthApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setLoading(false);
      return;
    }

    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem("accessToken"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}