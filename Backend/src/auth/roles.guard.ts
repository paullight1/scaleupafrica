import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./decorators";
import { RolesService } from "./roles.service";
import type { AppRoleName, AuthUser } from "./types";

/**
 * Runs AFTER SupabaseJwtGuard. If a route declares `@Roles(...)`, requires the
 * verified user to hold one of them (403 FORBIDDEN otherwise).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RolesService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AppRoleName[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    if (!user) throw forbidden();
    if (!(await this.roles.hasAny(user.id, required))) throw forbidden();
    return true;
  }
}

function forbidden(): ForbiddenException {
  return new ForbiddenException({
    error: { code: "FORBIDDEN", message: "You don't have access to this resource." },
  });
}
