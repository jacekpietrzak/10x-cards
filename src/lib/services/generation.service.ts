import type { Database } from "../db/database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
    FlashcardProposalDto,
    GenerateFlashcardsCommand,
    GenerationCreateResponseDto,
} from "./types";

// Mock AI service for development - to be replaced with actual AI service
async function callAIService(text: string): Promise<FlashcardProposalDto[]> {
    // This is a mock implementation that will be replaced with the actual AI service
    // For now, we just create some dummy flashcards based on the text
    console.log("Calling mock AI service with text length:", text.length);

    // Create a deterministic but random-looking set of flashcard proposals
    const words = text.split(/\s+/).filter((w) => w.length > 3);

    // Generate between 3-7 flashcards
    const count = Math.min(5, Math.max(3, Math.floor(words.length / 200)));

    const proposals: FlashcardProposalDto[] = [];

    for (let i = 0; i < count; i++) {
        const randomIndex = (i * 19) % Math.max(1, words.length - 10);
        const front = `What is the meaning of "${words[randomIndex]}"?`;
        const back = `The term "${words[randomIndex]}" refers to ${
            words.slice(randomIndex + 1, randomIndex + 8).join(" ")
        }...`;

        proposals.push({
            front,
            back,
            source: "ai-full",
        });
    }

    return proposals;
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
                model: "mock-development-model", // To be replaced with actual AI model
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
                    model: "mock-development-model",
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
                    model: "mock-development-model",
                    source_text_hash: sourceTextHash,
                    source_text_length: command.source_text.length,
                });
        }

        throw error; // Re-throw to be caught by API handler
    }
}
