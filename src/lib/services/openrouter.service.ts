import {
  ApiResponse,
  apiResponseSchema,
  ModelParameters,
  modelParametersSchema,
  OpenRouterError,
  RequestPayload,
  requestPayloadSchema,
} from "./openrouter.types";
import { LoggerService } from "./logger.service";

export class OpenRouterService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;
  private readonly logger: LoggerService;

  private currentSystemMessage: string = "";
  private currentUserMessage: string = "";
  private currentResponseFormat?: Record<string, unknown>;
  private currentModelName: string = "openai/gpt-4o-mini";
  private currentModelParameters: ModelParameters = {
    temperature: 0.7,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  constructor(config: {
    apiKey: string;
    apiUrl?: string;
    timeout?: number;
    maxRetries?: number;
    defaultModel?: string;
    defaultModelParameters?: ModelParameters;
  }) {
    if (!config.apiKey) {
      throw new OpenRouterError("API key is required", "MISSING_API_KEY");
    }

    this.logger = LoggerService.getInstance();
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || "https://openrouter.ai/api/v1";
    this.defaultTimeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;

    if (config.defaultModel) {
      this.currentModelName = config.defaultModel;
    }

    if (config.defaultModelParameters) {
      const validatedParams = modelParametersSchema.safeParse(
        config.defaultModelParameters,
      );
      if (!validatedParams.success) {
        const error = new OpenRouterError(
          "Invalid model parameters",
          "VALIDATION_ERROR",
        );
        this.logger.error("Model parameters validation failed", error, {
          parameters: config.defaultModelParameters,
          issues: validatedParams.error.issues,
        });
        throw error;
      }
      this.currentModelParameters = {
        ...this.currentModelParameters,
        ...validatedParams.data,
      };
    }

    this.logger.info("OpenRouter service initialized", {
      apiUrl: this.apiUrl,
      defaultModel: this.currentModelName,
      timeout: this.defaultTimeout,
      maxRetries: this.maxRetries,
    });
  }

  // Public methods for configuration
  public setSystemMessage(message: string): void {
    if (!message.trim()) {
      const error = new OpenRouterError(
        "System message cannot be empty",
        "VALIDATION_ERROR",
      );
      this.logger.error("Empty system message", error);
      throw error;
    }
    this.currentSystemMessage = message;
    this.logger.debug("System message set", { length: message.length });
  }

  public setUserMessage(message: string): void {
    if (!message.trim()) {
      const error = new OpenRouterError(
        "User message cannot be empty",
        "VALIDATION_ERROR",
      );
      this.logger.error("Empty user message", error);
      throw error;
    }
    this.currentUserMessage = message;
    this.logger.debug("User message set", { length: message.length });
  }

  public setResponseFormat(schema: Record<string, unknown>): void {
    this.currentResponseFormat = schema;
    this.logger.debug("Response format set", { schema });
  }

  public setModel(name: string, parameters?: ModelParameters): void {
    if (!name.trim()) {
      const error = new OpenRouterError(
        "Model name cannot be empty",
        "VALIDATION_ERROR",
      );
      this.logger.error("Empty model name", error);
      throw error;
    }
    this.currentModelName = name;

    if (parameters) {
      const validatedParams = modelParametersSchema.safeParse(parameters);
      if (!validatedParams.success) {
        const error = new OpenRouterError(
          "Invalid model parameters",
          "VALIDATION_ERROR",
        );
        this.logger.error("Model parameters validation failed", error, {
          parameters,
          issues: validatedParams.error.issues,
        });
        throw error;
      }
      this.currentModelParameters = {
        ...this.currentModelParameters,
        ...validatedParams.data,
      };
    }

    this.logger.info("Model configuration updated", {
      model: name,
      parameters: this.currentModelParameters,
    });
  }

  public async sendChatMessage<T = unknown>(userMessage: string): Promise<T> {
    this.logger.info("Sending chat message", {
      messageLength: userMessage.length,
      model: this.currentModelName,
    });

    this.setUserMessage(userMessage);

    const payload = this.buildRequestPayload();
    const validatedPayload = requestPayloadSchema.safeParse(payload);

    if (!validatedPayload.success) {
      const error = new OpenRouterError(
        "Invalid request payload",
        "VALIDATION_ERROR",
      );
      this.logger.error("Request payload validation failed", error, {
        issues: validatedPayload.error.issues,
      });
      throw error;
    }

    const response = await this.executeRequest(validatedPayload.data);
    const validatedResponse = apiResponseSchema.safeParse(response);

    if (!validatedResponse.success) {
      const error = new OpenRouterError(
        "Invalid API response format",
        "VALIDATION_ERROR",
      );
      this.logger.error("API response validation failed", error, {
        issues: validatedResponse.error.issues,
      });
      throw error;
    }

    if (!validatedResponse.data.choices?.[0]?.message?.content) {
      const error = new OpenRouterError(
        "Invalid response format from API",
        "INVALID_RESPONSE",
      );
      this.logger.error("Missing content in API response", error, {
        response: validatedResponse.data,
      });
      throw error;
    }

    try {
      const content = validatedResponse.data.choices[0].message.content;
      if (this.currentResponseFormat) {
        const parsedContent = JSON.parse(content);
        this.logger.debug("Parsed JSON response", {
          contentLength: content.length,
        });
        return parsedContent as T;
      }
      this.logger.debug("Returning text response", {
        contentLength: content.length,
      });
      return content as T;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Response parsing error", error, {
          content: validatedResponse.data.choices[0].message.content,
        });
      }
      throw new OpenRouterError("Failed to parse API response", "PARSE_ERROR");
    }
  }

  private buildRequestPayload(): RequestPayload {
    const messages = [];

    if (this.currentSystemMessage) {
      messages.push({
        role: "system" as const,
        content: this.currentSystemMessage,
      });
    }

    if (!this.currentUserMessage) {
      const error = new OpenRouterError(
        "User message is required",
        "MISSING_USER_MESSAGE",
      );
      this.logger.error("Missing user message", error);
      throw error;
    }

    messages.push({
      role: "user" as const,
      content: this.currentUserMessage,
    });

    const payload: RequestPayload = {
      messages,
      model: this.currentModelName,
      ...this.currentModelParameters,
    };

    if (this.currentResponseFormat) {
      payload.response_format = {
        type: "json_schema",
        json_schema: this.currentResponseFormat,
      };
    }

    this.logger.debug("Built request payload", {
      modelName: this.currentModelName,
      messagesCount: messages.length,
      hasResponseFormat: !!this.currentResponseFormat,
    });

    return payload;
  }

  private async executeRequest(
    requestPayload: RequestPayload,
    retryCount = 0,
  ): Promise<ApiResponse> {
    try {
      this.logger.debug("Executing API request", {
        retryCount,
        endpoint: `${this.apiUrl}/chat/completions`,
      });

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://10xcards.com",
          "X-Title": "10xCards",
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new OpenRouterError(
          errorData.error?.message || `HTTP error ${response.status}`,
          "API_ERROR",
          response.status,
        );
        this.logger.error("API request failed", error, {
          status: response.status,
          errorData,
        });
        throw error;
      }

      const data = await response.json();
      this.logger.debug("API request successful", {
        status: response.status,
        hasChoices: !!data.choices?.length,
      });
      return data as ApiResponse;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        retryCount < this.maxRetries
      ) {
        this.logger.warn("Request timeout, retrying", {
          retryCount,
          timeout: this.defaultTimeout,
        });
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeRequest(requestPayload, retryCount + 1);
      }

      if (error instanceof OpenRouterError) {
        throw error;
      }

      const wrappedError = new OpenRouterError(
        error instanceof Error ? error.message : "Unknown error occurred",
        "REQUEST_ERROR",
      );
      this.logger.error(
        "Request failed",
        error instanceof Error ? error : undefined,
        {
          retryCount,
        },
      );
      throw wrappedError;
    }
  }
}
