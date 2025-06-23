import type { Database } from "@/db/database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
    FlashcardProposalDto,
    GenerateFlashcardsCommand,
    GenerationCreateResponseDto,
    GenerationDetailDto,
    GenerationsListResponseDto,
} from "@/lib/types";
import { OpenRouterService } from "./openrouter.service";

const SYSTEM_MESSAGE =
    `You are a flashcard generation assistant. Your task is to create high-quality flashcards from the provided text.
Each flashcard should follow these rules:
1. Front side should be a clear, concise question (max 200 characters)
2. Back side should contain a comprehensive answer (max 500 characters)
3. Focus on key concepts, definitions, and relationships
4. Avoid overly simple or trivial content
5. Ensure questions are specific and unambiguous
6. Answers should be complete and self-contained

Generate between 3-7 flashcards depending on the text length and complexity. Return in the same language as the provided text.
Format your response as a JSON array of flashcard objects with "front" and "back" properties.`;

const openRouter = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "openai/gpt-4o-mini",
});

async function callAIService(text: string): Promise<FlashcardProposalDto[]> {
    try {
        openRouter.setSystemMessage(SYSTEM_MESSAGE);
        openRouter.setResponseFormat({
            name: "flashcards",
            schema: {
                type: "object",
                properties: {
                    flashcards: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                front: { type: "string" },
                                back: { type: "string" },
                            },
                            required: ["front", "back"],
                        },
                    },
                },
                required: ["flashcards"],
            },
        });

        const aiResponse = await openRouter.sendChatMessage<{
            flashcards: Array<{ front: string; back: string }>;
        }>(text);
        const response = aiResponse.flashcards;

        console.log("Call AI response", aiResponse);

        return response.map((card) => ({
            front: card.front,
            back: card.back,
            source: "ai-full" as const,
        }));
    } catch (error) {
        console.error("Error calling AI service:", error);
        throw new Error("Failed to generate flashcards");
    }
}

/**
 * Generates flashcard proposals from source text using AI
 * @param command The command containing the source text
 * @param userId The ID of the user making the request
 * @param supabase Supabase client for database operations
 * @returns Generation response with flashcard proposals
 */
export async function generateFlashcards(
    command: GenerateFlashcardsCommand,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<GenerationCreateResponseDto> {
    try {
        const startTime = Date.now();

        // Create a hash of the source text using MD5
        const sourceTextHash = crypto
            .createHash("md5")
            .update(command.source_text)
            .digest("hex");

        // Call the AI service to generate flashcard proposals
        const flashcardProposals = await callAIService(command.source_text);

        // Calculate generation duration
        const endTime = Date.now();
        const generationDuration = endTime - startTime;

        // Insert generation metadata into the database
        const { data: generationData, error: generationError } = await supabase
            .from("generations")
            .insert({
                user_id: userId,
                source_text_hash: sourceTextHash,
                source_text_length: command.source_text.length,
                model: "openai/gpt-4o-mini",
                generated_count: flashcardProposals.length,
                generation_duration: generationDuration,
            })
            .select("id")
            .single();

        if (generationError) {
            // Log error and throw to be caught by the API handler
            console.error("Error inserting generation:", generationError);

            // Log error in generation_error_logs table
            await supabase
                .from("generation_error_logs")
                .insert({
                    user_id: userId,
                    error_code: "DB_INSERT_ERROR",
                    error_message: generationError.message,
                    model: "openai/gpt-4o-mini",
                    source_text_hash: sourceTextHash,
                    source_text_length: command.source_text.length,
                });

            throw new Error(
                `Failed to insert generation: ${generationError.message}`,
            );
        }

        // Return the generation response
        return {
            generation_id: generationData.id,
            flashcards_proposals: flashcardProposals,
            generated_count: flashcardProposals.length,
        };
    } catch (error: unknown) {
        // Handle AI service or other errors
        console.error("Error in flashcard generation:", error);

        // Create a hash of the source text for error logging
        const sourceTextHash = crypto
            .createHash("md5")
            .update(command.source_text)
            .digest("hex");

        // Log error in generation_error_logs table
        if (error instanceof Error) {
            await supabase
                .from("generation_error_logs")
                .insert({
                    user_id: userId,
                    error_code: "AI_SERVICE_ERROR",
                    error_message: error.message,
                    model: "openai/gpt-4o-mini",
                    source_text_hash: sourceTextHash,
                    source_text_length: command.source_text.length,
                });
        }

        throw error; // Re-throw to be caught by API handler
    }
}

/**
 * Retrieves a paginated list of generations for a specific user
 * @param userId The ID of the user whose generations to retrieve
 * @param page Page number (1-based)
 * @param limit Number of items per page
 * @param supabase Supabase client for database operations
 * @returns Paginated list of generations with metadata
 */
export async function listGenerations(
    userId: string,
    page: number,
    limit: number,
    supabase: SupabaseClient<Database>,
): Promise<GenerationsListResponseDto> {
    try {
        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Query generations with count for pagination
        const { data, error, count } = await supabase
            .from("generations")
            .select(
                `
                id,
                model,
                generated_count,
                accepted_unedited_count,
                accepted_edited_count,
                source_text_hash,
                source_text_length,
                generation_duration,
                created_at,
                updated_at
            `,
                { count: "exact" },
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching generations:", error);
            throw new Error(`Failed to fetch generations: ${error.message}`);
        }

        // Return formatted response with pagination metadata
        return {
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
            },
        };
    } catch (error: unknown) {
        console.error("Error in listGenerations:", error);
        throw error; // Re-throw to be caught by API handler
    }
}

/**
 * Retrieves a specific generation by ID for a user, including associated flashcards
 * @param generationId The ID of the generation to retrieve
 * @param userId The ID of the user who owns the generation
 * @param supabase Supabase client for database operations
 * @returns Generation detail with flashcards or null if not found
 */
export async function getGenerationById(
    generationId: number,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<GenerationDetailDto | null> {
    try {
        // Query generation with associated flashcards
        const { data, error } = await supabase
            .from("generations")
            .select(`
                *,
                flashcards (
                    id,
                    front,
                    back,
                    source,
                    generation_id,
                    created_at,
                    updated_at,
                    stability,
                    difficulty,
                    due,
                    lapses,
                    state,
                    last_review
                )
            `)
            .eq("id", generationId)
            .eq("user_id", userId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // No results found - generation doesn't exist or doesn't belong to user
                return null;
            }
            console.error("Database error in getGenerationById:", error);
            throw new Error(`Failed to fetch generation: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        // Return the generation with flashcards
        return {
            ...data,
            flashcards: data.flashcards || [],
        };
    } catch (error: unknown) {
        console.error("Error in getGenerationById:", error);
        throw error; // Re-throw to be caught by API handler
    }
}
