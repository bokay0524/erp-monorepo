/**
 * 로그인한 사람만 들어올 수 있는 페이지를 만들기 위한 문
 * user 정보 없으면 /login 으로 이동
 * user 정보 있으면 정상적으로 페이지 렌더
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}