import { SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PUBLIC_ROUTE, REQUIRED_ROLES } from "./constants";

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const Roles = (...roles: Role[]) => SetMetadata(REQUIRED_ROLES, roles);
