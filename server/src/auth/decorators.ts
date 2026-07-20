import {
  SetMetadata,
  createParamDecorator,
  type ExecutionContext,
} from "@nestjs/common";
import type { AuthUser, AppRoleName } from "./types";

/** Opt a route out of the global JWT guard (public endpoint). */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Require one of the listed roles (RolesGuard runs after the JWT guard). */
export const ROLES_KEY = "roles";
export const Roles = (...roles: AppRoleName[]) => SetMetadata(ROLES_KEY, roles);

/** Inject the verified `req.user` (never trust a body/query for identity). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);
