import { Catch, HttpException } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  ArgumentsHost,
  RpcExceptionFilter,
} from "@nestjs/common/interfaces";
import { Observable, throwError } from "rxjs";

@Catch(HttpException)
export class HttpToRpcExceptionFilter implements RpcExceptionFilter<HttpException> {
  catch(
    exception: HttpException,
    _host: ArgumentsHost,
  ): Observable<never> {
    const response = exception.getResponse();
    const message =
      typeof response === "string"
        ? response
        : "message" in response && typeof response.message === "string"
          ? response.message
          : "Yêu cầu không hợp lệ";
    return throwError(
      () =>
        new RpcException({
          statusCode: exception.getStatus(),
          message,
        }),
    );
  }
}
