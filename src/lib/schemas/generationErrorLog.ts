import { z } from "zod";

/**
 * Zod schema for validating query parameters of the
 * GET /generation-error-logs endpoint.
 *
 * The `userId` parameter is optional and must be a valid UUID string.
 * Pagination parameters allow for efficient data retrieval.
 * This endpoint is only accessible to administrators.
 */
export const GenerationErrorLogsQueryParamsSchema = z.object({
    userId: z.string().uuid().optional(),
    page: z.string()
        .regex(/^[1-9]\d*$/, "Page must be a positive integer")
        .transform(Number)
        .default("1"),
    limit: z.string()
        .regex(/^[1-9]\d*$/, "Limit must be a positive integer")
        .transform((val) => Math.min(Number(val), 1000)) // Cap at 1000 for performance
        .default("100"),
});

export type GenerationErrorLogsQueryParams = z.infer<
    typeof GenerationErrorLogsQueryParamsSchema
>;
