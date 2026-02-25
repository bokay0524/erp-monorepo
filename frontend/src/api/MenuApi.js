import ApiClient from "./ApiClient";

export async function fetchMenu() {
  return ApiClient("/api/menu"); // apiClient가 Authorization 자동 첨부
}
