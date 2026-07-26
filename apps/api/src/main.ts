import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
    const application = await NestFactory.create<NestExpressApplication>(AppModule);

    application.set("trust proxy", Number(process.env.TRUSTED_PROXY_HOPS ?? 1));

    application.use(helmet());

    application.use(cookieParser());

    application.enableCors({
        origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
        credentials: true,
    });

    const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
    await application.listen(port);
}

void bootstrap();