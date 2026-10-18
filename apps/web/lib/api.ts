import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

type RetryableRequest = InternalAxiosRequestConfig & { hasRetried?: boolean };
type ErrorResponse = {
  error?: { message?: string } | string;
  message?: string | string[];
};

export function formatApiError(error: unknown): string {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    const payload = error.response?.data;
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : payload?.error?.message ?? payload?.message;
    const translated = Array.isArray(message) ? message.join(". ") : message;
    if (translated && /[à-ỹđ]/i.test(translated)) return translated;
    if (error.code === "ERR_NETWORK") {
      return "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
    }
    return "Yêu cầu chưa được xử lý. Vui lòng thử lại.";
  }
  if (error instanceof Error && /[à-ỹđ]/i.test(error.message)) {
    return error.message;
  }
  return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let refreshInFlight: Promise<void> | undefined;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const request = error.config as RetryableRequest | undefined;
    const path = request?.url ?? "";
    const isAuthRequest = /\/auth\/(login|register|refresh|logout)/.test(path);
    if (
      error.response?.status !== 401 ||
      !request ||
      request.hasRetried ||
      isAuthRequest
    ) {
      return Promise.reject(new Error(formatApiError(error)));
    }

    request.hasRetried = true;
    refreshInFlight ??= api
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = undefined;
      });

    try {
      await refreshInFlight;
      return await api(request);
    } catch (refreshError) {
      return Promise.reject(new Error(formatApiError(refreshError)));
    }
  },
);
