import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SupabaseJwtGuard, jwtVerifierProvider } from "./supabase-jwt.guard";
import { RolesGuard } from "./roles.guard";
import { RolesService } from "./roles.service";

/**
 * Registers the JWT guard globally (order matters: JWT first, then Roles) plus the
 * RolesService. `@Public()` opts out of the JWT guard; `@Roles()` engages RolesGuard.
 */
@Global()
@Module({
  providers: [
    jwtVerifierProvider,
    RolesService,
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [RolesService],
})
export class AuthModule {}
