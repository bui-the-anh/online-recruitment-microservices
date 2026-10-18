import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";

const statusMessages: Record<number, { code: string; message: string }> = {
  400: { code: "DU_LIEU_KHONG_HOP_LE", message: "Dữ liệu yêu cầu không hợp lệ" },
  401: { code: "CHUA_XAC_THUC", message: "Vui lòng đăng nhập để tiếp tục" },
  403: { code: "KHONG_DU_QUYEN", message: "Bạn không có quyền thực hiện thao tác này" },
  404: { code: "KHONG_TIM_THAY", message: "Không tìm thấy dữ liệu yêu cầu" },
  409: { code: "XUNG_DOT_DU_LIEU", message: "Dữ liệu bị trùng hoặc xung đột" },
  429: { code: "QUA_NHIEU_YEU_CAU", message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" },
  500: { code: "LOI_HE_THONG", message: "Hệ thống đang gặp sự cố, vui lòng thử lại sau" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function vietnameseMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return /[à-ỹđ]/i.test(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    const messages = value
      .map(vietnameseMessage)
      .filter((message): message is string => Boolean(message));
    return messages.length ? messages.join(". ") : undefined;
  }
  if (isRecord(value) && "message" in value) {
    return vietnameseMessage(value.message);
  }
  return undefined;
}

@Catch()
export class VietnameseHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const remoteStatus =
      isRecord(exception) && typeof exception.statusCode === "number"
        ? exception.statusCode
        : isRecord(exception) && typeof exception.status === "number"
          ? exception.status
          : undefined;
    const prismaStatus =
      isRecord(exception) && exception.code === "P2002"
        ? 409
        : isRecord(exception) && exception.code === "P2025"
          ? 404
          : undefined;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : remoteStatus ?? prismaStatus ?? 500;
    const fallback = statusMessages[status] ?? {
      code: "YEU_CAU_KHONG_HOP_LE",
      message: "Không thể xử lý yêu cầu này",
    };
    const source =
      exception instanceof HttpException
        ? exception.getResponse()
        : isRecord(exception)
          ? exception
          : undefined;
    const message = vietnameseMessage(source) ?? fallback.message;

    response.status(status).json({
      success: false,
      error: { code: fallback.code, message },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
