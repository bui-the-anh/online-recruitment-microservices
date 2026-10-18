import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import type { Request } from "express";
import { PUBLIC_ROUTE, REQUIRED_ROLES } from "./constants";
import { PrismaService } from "../prisma/prisma.service";

export interface AuthenticatedRequest extends Request {
  user: { sub: string; role: Role };
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException("Phiên đăng nhập đã hết hạn");
    }

    try {
      request.user = await this.jwt.verifyAsync<{ sub: string; role: Role }>(
        token,
      );
    } catch {
      throw new UnauthorizedException("Phiên đăng nhập đã hết hạn");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { role: true, accountStatus: true },
    });
    if (!user || user.accountStatus !== "ACTIVE" || user.role !== request.user.role) {
      throw new UnauthorizedException("Tài khoản không hoạt động hoặc không hợp lệ");
    }
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
    }
    return true;
  }
}
