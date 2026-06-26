"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const application = await core_1.NestFactory.create(app_module_1.AppModule);
    application.enableCors({
        origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
        credentials: true,
    });
    const port = process.env.API_PORT ?? 3001;
    await application.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map