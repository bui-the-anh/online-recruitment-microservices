import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Unwrap Nest TCP / RpcException payloads into status + Vietnamese message. */
export function extractRpcError(error: unknown): {
  statusCode: number;
  message: string;
} {
  const candidates: unknown[] = [error];
  if (isRecord(error)) {
    if ("error" in error) candidates.push(error.error);
    if ("message" in error) candidates.push(error.message);
    if (typeof error.message === "string") {
      try {
        candidates.push(JSON.parse(error.message));
      } catch {
        /* plain string message */
      }
    }
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const statusCode =
      typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : typeof candidate.status === "number"
          ? candidate.status
          : undefined;
    const rawMessage = candidate.message;
    const message =
      typeof rawMessage === "string"
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.filter((item) => typeof item === "string").join(". ")
          : undefined;
    if (statusCode && message) {
      return { statusCode, message };
    }
    if (statusCode && typeof candidate.error === "string") {
      return { statusCode, message: candidate.error };
    }
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === "string"
        ? response
        : isRecord(response) && typeof response.message === "string"
          ? response.message
          : error.message;
    return { statusCode: error.getStatus(), message };
  }

  if (isRecord(error) && error.code === "P2002") {
    return {
      statusCode: 409,
      message: "Dữ liệu bị trùng hoặc xung đột",
    };
  }

  if (error instanceof Error && /[à-ỹđ]/i.test(error.message)) {
    return { statusCode: 500, message: error.message };
  }

  return {
    statusCode: 500,
    message: "Hệ thống đang gặp sự cố, vui lòng thử lại sau",
  };
}

export function toHttpException(error: unknown): HttpException {
  if (error instanceof HttpException) return error;
  const { statusCode, message } = extractRpcError(error);
  switch (statusCode) {
    case 400:
      return new BadRequestException(message);
    case 401:
      return new UnauthorizedException(message);
    case 403:
      return new ForbiddenException(message);
    case 404:
      return new NotFoundException(message);
    case 409:
      return new ConflictException(message);
    default:
      return new HttpException(message, statusCode);
  }
}
