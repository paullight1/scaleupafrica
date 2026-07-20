import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./decorators";
import { SupabaseJwtVerifier } from "./jwt-verifier";
import { ENV, type Env } from "../config/env";

export const JWT_VERIFIER = "JWT_VERIFIER";

/**
 * Global guard. `@Public()` opts routes out. Reads `Authorization: Bearer <token>`,
 * verifies it, and attaches `req.user = { id, email }`. Failures return a stable 401
 * body `{ error: { code: "UNAUTHENTICATED", ... } }` — never leaks verify detail.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(JWT_VERIFIER) private readonly verifier: SupabaseJwtVerifier,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers?.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw unauth();

    try {
      req.user = await this.verifier.verify(token);
    } catch {
      throw unauth();
    }
    return true;
  }
}

function unauth(): UnauthorizedException {
  return new UnauthorizedException({
    error: { code: "UNAUTHENTICATED", message: "Authentication required." },
  });
}

/** Factory used by AuthModule to build the verifier from env. */
export const jwtVerifierProvider = {
  provide: JWT_VERIFIER,
  useFactory: (env: Env) =>
    new SupabaseJwtVerifier({ supabaseUrl: env.SUPABASE_URL, jwtSecret: env.SUPABASE_JWT_SECRET }),
  inject: [ENV],
};
