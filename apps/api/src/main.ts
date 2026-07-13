import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
    const application = await NestFactory.create(AppModule);

    application.use(cookieParser());

    application.enableCors({
        origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
        credentials: true,
    });

    const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
    await application.listen(port);
}

void bootstrap();