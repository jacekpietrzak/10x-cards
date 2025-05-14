type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: Error;
}

export class LoggerService {
    private static instance: LoggerService;
    private readonly environment: string;

    private constructor() {
        this.environment = process.env.NODE_ENV || "development";
    }

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    public debug(message: string, context?: Record<string, unknown>): void {
        this.log("debug", message, context);
    }

    public info(message: string, context?: Record<string, unknown>): void {
        this.log("info", message, context);
    }

    public warn(message: string, context?: Record<string, unknown>): void {
        this.log("warn", message, context);
    }

    public error(
        message: string,
        error?: Error,
        context?: Record<string, unknown>,
    ): void {
        this.log("error", message, context, error);
    }

    private log(
        level: LogLevel,
        message: string,
        context?: Record<string, unknown>,
        error?: Error,
    ): void {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: this.sanitizeContext(context),
            error: error ? this.sanitizeError(error) : undefined,
        };

        // In development, log to console with colors
        if (this.environment === "development") {
            this.logToConsole(entry);
            return;
        }

        // In production, we could send logs to a service like Sentry, DataDog, etc.
        // For now, we'll just use console.log with a structured format
        console.log(JSON.stringify(entry));
    }

    private sanitizeContext(
        context?: Record<string, unknown>,
    ): Record<string, unknown> | undefined {
        if (!context) {
            return undefined;
        }

        // Remove sensitive data
        const sanitized = { ...context };
        const sensitiveKeys = [
            "password",
            "token",
            "apiKey",
            "secret",
            "authorization",
        ];

        for (const key of Object.keys(sanitized)) {
            if (
                sensitiveKeys.some((sk) =>
                    key.toLowerCase().includes(sk.toLowerCase())
                )
            ) {
                sanitized[key] = "[REDACTED]";
            }
        }

        return sanitized;
    }

    private sanitizeError(error: Error): Error {
        // Create a new error object with sanitized stack trace
        const sanitizedError = new Error(error.message);
        sanitizedError.name = error.name;
        sanitizedError.stack = error.stack;

        return sanitizedError;
    }

    private logToConsole(entry: LogEntry): void {
        const colors = {
            debug: "\x1b[34m", // Blue
            info: "\x1b[32m", // Green
            warn: "\x1b[33m", // Yellow
            error: "\x1b[31m", // Red
            reset: "\x1b[0m", // Reset
        };

        const color = colors[entry.level];
        const prefix = `${color}[${entry.level.toUpperCase()}]\x1b[0m`;

        console.log(`${prefix} ${entry.timestamp} - ${entry.message}`);

        if (entry.context) {
            console.log("Context:", entry.context);
        }

        if (entry.error) {
            console.error("Error:", entry.error);
            if (entry.error.stack) {
                console.error("Stack trace:", entry.error.stack);
            }
        }
    }
}
