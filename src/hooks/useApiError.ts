import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export function useApiError() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown, fallbackMessage: string) => {
    let errorMessage: string;

    if (err instanceof Response) {
      // Handle HTTP errors
      errorMessage = `Request failed: ${err.statusText}`;
    } else if (err instanceof Error) {
      // Handle standard errors
      errorMessage = err.message;
    } else if (typeof err === "object" && err !== null && "message" in err) {
      // Handle API error responses
      const apiError = err as ApiError;
      if (apiError.details) {
        // Handle validation errors
        errorMessage = Object.entries(apiError.details)
          .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
          .join("\n");
      } else {
        errorMessage = apiError.message;
      }
    } else {
      // Fallback error message
      errorMessage = fallbackMessage;
    }

    setError(errorMessage);
    toast.error(errorMessage);

    return errorMessage;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}
