import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { extractRpcError } from "./rpc-error";

const statusMessages: Record<number, { code: string; message: string }> = {
  400: { code: "DU_LIEU_KHONG_HOP_LE", message: "Dữ liệu yêu cầu không hợp lệ" },
  401: { code: "CHUA_XAC_THUC", message: "Vui lòng đăng nhập để tiếp tục" },
  403: { code: "KHONG_DU_QUYEN", message: "Bạn không có quyền thực hiện thao tác này" },
  404: { code: "KHONG_TIM_THAY", message: "Không tìm thấy dữ liệu yêu cầu" },
  409: { code: "XUNG_DOT_DU_LIEU", message: "Dữ liệu bị trùng hoặc xung đột" },
  429: { code: "QUA_NHIEU_YEU_CAU", message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" },
  500: { code: "LOI_HE_THONG", message: "Hệ thống đang gặp sự cố, vui lòng thử lại sau" },
};

@Catch()
export class VietnameseHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : extractRpcError(exception).statusCode;

    const fallback = statusMessages[status] ?? {
      code: "YEU_CAU_KHONG_HOP_LE",
      message: "Không thể xử lý yêu cầu này",
    };

    let message = fallback.message;
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === "string" && /[à-ỹđ]/i.test(body)) {
        message = body;
      } else if (
        typeof body === "object" &&
        body !== null &&
        "message" in body
      ) {
        const nested = (body as { message: unknown }).message;
        if (typeof nested === "string" && /[à-ỹđ]/i.test(nested)) {
          message = nested;
        } else if (Array.isArray(nested)) {
          const joined = nested
            .filter((item): item is string => typeof item === "string")
            .join(". ");
          if (/[à-ỹđ]/i.test(joined)) message = joined;
        }
      }
    } else {
      const remote = extractRpcError(exception);
      if (/[à-ỹđ]/i.test(remote.message)) message = remote.message;
    }

    response.status(status).json({
      success: false,
      error: { code: fallback.code, message },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
