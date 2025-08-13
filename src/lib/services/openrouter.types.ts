import { z } from "zod";

// Zod schemas for validation
export const modelParametersSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
});

export const messageSchema = z.object({
  role: z.enum(["system", "user"]),
  content: z.string().min(1),
});

export const requestPayloadSchema = z.object({
  messages: z.array(messageSchema).min(1),
  model: z.string().min(1),
  response_format: z
    .object({
      type: z.literal("json_schema"),
      json_schema: z.record(z.unknown()),
    })
    .optional(),
  temperature: modelParametersSchema.shape.temperature,
  top_p: modelParametersSchema.shape.top_p,
  frequency_penalty: modelParametersSchema.shape.frequency_penalty,
  presence_penalty: modelParametersSchema.shape.presence_penalty,
});

export const apiResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
          role: z.string(),
        }),
      }),
    )
    .min(1),
});

// Type exports
export type ModelParameters = z.infer<typeof modelParametersSchema>;
export type RequestPayload = z.infer<typeof requestPayloadSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}
