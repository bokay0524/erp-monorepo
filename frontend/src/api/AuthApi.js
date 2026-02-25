/**
 * 인증 관련 API 함수 모음
 * apiClient를 이용해서 인증 관련 api 호출 파일 
 *
 */
import ApiClient from "./ApiClient";

/**
 * fetchMe() : /api/auth/me api 호출
 */
export function fetchMe() {
  return ApiClient("/api/auth/me");
}
