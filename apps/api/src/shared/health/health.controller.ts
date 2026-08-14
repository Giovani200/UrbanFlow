import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
    @Get()
    check(): { status: string } {
        return { status: "ok" };
    }
}