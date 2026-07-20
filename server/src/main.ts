import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = loadEnv(); // crash fast on invalid config

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Paystack webhook needs the raw body for HMAC verification
    bodyParser: true,
  });

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.useBodyParser("json", { limit: "256kb" });

  // Auth is a Bearer header (no cookies) -> no credentials, explicit origin allowlist.
  app.enableCors({
    origin: env.corsOrigins,
    credentials: false,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Authorization,Content-Type,x-paystack-signature",
  });

  // Route-level validation uses ZodBody; this guards any stray class-based DTOs.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`ScaleUp Africa API on :${env.PORT} (prefix /api/v1)`);
}

void bootstrap();
