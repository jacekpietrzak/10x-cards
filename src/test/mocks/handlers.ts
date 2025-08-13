import { http, HttpResponse } from "msw";

interface CreateFlashcardData {
  front: string;
  back: string;
  [key: string]: unknown; // dla dodatkowych pól
}

export const handlers = [
  http.get("/api/flashcards", () => {
    return HttpResponse.json([
      {
        id: "1",
        front: "Test Question",
        back: "Test Answer",
        state: 0,
        due: new Date().toISOString(),
        stability: 2.5,
        difficulty: 0.3,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),

  http.post("/api/flashcards", async ({ request }) => {
    const body = (await request.json()) as CreateFlashcardData;
    return HttpResponse.json({
      ...body,
      id: "2",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  http.post("/api/generations", () => {
    return HttpResponse.json({
      id: "1",
      flashcards: [
        { front: "Generated Question 1", back: "Generated Answer 1" },
        { front: "Generated Question 2", back: "Generated Answer 2" },
      ],
    });
  }),
];
