import { useCallback, useState } from "react";
import { useApiError } from "./useApiError";
import { toast } from "sonner";

interface RequestConfig extends RequestInit {
    maxRetries?: number;
    retryDelay?: number;
}

interface ApiRequestState<T> {
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: string | null;
}

export function useApiRequest<T>() {
    const [state, setState] = useState<ApiRequestState<T>>({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
    });

    const { handleError, clearError } = useApiError();

    const request = useCallback(
        async (url: string, config: RequestConfig = {}) => {
            const {
                maxRetries = 3,
                retryDelay = 1000,
                ...fetchConfig
            } = config;

            setState((prev) => ({ ...prev, isLoading: true, isError: false }));
            clearError();

            let attempt = 0;
            let lastError: unknown;

            while (attempt < maxRetries) {
                try {
                    const response = await fetch(url, fetchConfig);
                    const data = await response.json();

                    if (!response.ok) {
                        throw data;
                    }

                    setState({
                        data,
                        isLoading: false,
                        isError: false,
                        error: null,
                    });

                    return { data, response };
                } catch (err) {
                    lastError = err;
                    attempt++;

                    if (attempt < maxRetries) {
                        // Only show retry toast if we're going to retry
                        const remainingAttempts = maxRetries - attempt;
                        const message = `Request failed. Retrying in ${
                            retryDelay / 1000
                        }s... (${remainingAttempts} ${
                            remainingAttempts === 1 ? "attempt" : "attempts"
                        } remaining)`;

                        toast.error(message);
                        await new Promise((resolve) =>
                            setTimeout(resolve, retryDelay)
                        );
                    }
                }
            }

            // If we get here, all retries failed
            const errorMessage = handleError(
                lastError,
                "Request failed after multiple attempts. Please try again.",
            );

            setState({
                data: null,
                isLoading: false,
                isError: true,
                error: errorMessage,
            });

            throw lastError;
        },
        [handleError, clearError],
    );

    return {
        ...state,
        request,
    };
}
