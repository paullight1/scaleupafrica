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
    bodyParser: true,
  });

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.useBodyParser("json", { limit: "256kb" });

  // Auth uses Bearer headers, not cookies: no credentialed cross-origin requests.
  app.enableCors({
    origin: env.corsOrigins,
    credentials: false,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    allowedHeaders: "Authorization,Content-Type",
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`Cresciva API on :${env.PORT} (prefix /api/v1)`);
}

void bootstrap();
