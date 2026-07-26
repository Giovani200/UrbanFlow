import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

interface ErrorResponseBody {
    statusCode: number;
    error: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();
        const body = this.toErrorResponseBody(exception);

        if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(body.error, exception instanceof Error ? exception.stack : String(exception));
        } else {
            this.logger.warn(`${body.statusCode} ${body.error} ${this.detailsOf(exception)}`);
        }

        response.status(body.statusCode).json(body);
    }

    private toErrorResponseBody(exception: unknown): ErrorResponseBody {
        if (!(exception instanceof HttpException)) {
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: "INTERNAL_ERROR" };
        }

        const statusCode = exception.getStatus();
        const payload = exception.getResponse();

        if (typeof payload === "string") {
            return { statusCode, error: payload };
        }

        const message = (payload as Record<string, unknown>).message;
        if (typeof message === "string") {
            return { statusCode, error: message };
        }

        return {
            statusCode,
            error: statusCode >= HttpStatus.INTERNAL_SERVER_ERROR ? "INTERNAL_ERROR" : "INVALID_REQUEST",
        };
    }

    private detailsOf(exception: unknown): string {
        if (exception instanceof HttpException) {
            return JSON.stringify(exception.getResponse());
        }
        return String(exception);
    }
}
