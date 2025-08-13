# Plan wdrożenia endpointu REST API: POST /flashcards

## 1. Przegląd punktu końcowego

Endpoint umożliwia tworzenie jednej lub wielu fiszek (ręcznie lub na podstawie generacji AI) w bazie danych Supabase. Użytkownik musi być uwierzytelniony.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- URL: `/api/flashcards`
- Nagłówki:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` lub cookie-based auth
- Body:
  ```json
  {
    "flashcards": [
      {
        "front": "Question 1",
        "back": "Answer 1",
        "source": "manual",
        "generation_id": null
      },
      {
        "front": "Question 2",
        "back": "Answer 2",
        "source": "ai-full",
        "generation_id": 123
      }
    ]
  }
  ```
- Walidacja pól (inline Zod-schema w `route.ts`):
  - `front`: string, max 200 znaków
  - `back`: string, max 500 znaków
  - `source`: enum ["ai-full", "ai-edited", "manual"]
  - `generation_id`: `null` dla `manual`, wymagane dla `ai-full` i `ai-edited`

### Wykorzystywane typy wejściowe

- `FlashcardCreateDto` (`@/lib/types`)
- `FlashcardsCreateCommand` (`@/lib/types`)

## 3. Szczegóły odpowiedzi

- Status: `201 Created`
- Body:
  ```json
  {
  "flashcards": [
    { "id": <number>, "front": "<string>", "back": "<string>", "source": "<string>", "generation_id": <number | null> },
    ...
  ]
  }
  ```

### Wykorzystywane typy wyjściowe

- `FlashcardDto` (`@/lib/types`)

## 4. Przepływ danych

1. Klient wysyła POST `/api/flashcards`.
2. W `src/app/api/flashcards/route.ts`:
   - Import `createClient`, `DEFAULT_USER_ID` z `@/utils/supabase/server`.
   - Definicja inline Zod-schema i walidacja przez `safeParse(body)`.
   - Jeśli walidacja nieudana → `NextResponse.json({ error }, { status: 400 })`.
3. Przy udanej walidacji:
   - `const supabase = await createClient()`
   - `const result = await createFlashcards(command, DEFAULT_USER_ID, supabase)`
4. W `src/lib/services/flashcards.service.ts`:

   ```typescript
   export async function createFlashcards(
     command: FlashcardsCreateCommand,
     userId: string,
     supabase: SupabaseClient<Database>,
   ): Promise<{ flashcards: FlashcardDto[] }> {
     try {
       const toInsert = command.flashcards.map((f) => ({
         ...f,
         user_id: userId,
       }));
       const { data, error } = await supabase
         .from("flashcards")
         .insert(toInsert)
         .select("id, front, back, source, generation_id");

       if (error || !data) {
         console.error("Error inserting flashcards:", error);
         throw new Error(error?.message || "Insert failed");
       }
       return { flashcards: data };
     } catch (err) {
       console.error("Error in createFlashcards:", err);
       throw err;
     }
   }
   ```

5. W route handlerze:
   - W `try` → `NextResponse.json(result, { status: 201 })`.
   - W `catch` → `console.error(...)`, `NextResponse.json({ error: 'An error occurred while creating flashcards.' }, { status: 500 })`.

## 5. Względy bezpieczeństwa

- Uwierzytelnianie: SSR client z `@supabase/ssr` (cookies).
- Autoryzacja: operacje ograniczone do zasobu `user_id`.
- Walidacja: Zod (w tym refine dla `generation_id`).
- SQL Injection: Supabase SDK.
- Batch size limit (`maxItems = 100`) w serwisie.

## 6. Obsługa błędów

- `400 Bad Request`: błędy walidacji Zod.
- `401 Unauthorized`: brak lub nieważna sesja.
- `500 Internal Server Error`: błędy serwerowe/bazy.
- Logi: `console.error`, integracja z Sentry/pino.

## 7. Wydajność

- Bulk insert zamiast pojedynczych INSERT.
- Ograniczenie liczby flashcards w jednym żądaniu.
- Monitorowanie czasu odpowiedzi Supabase.
- Opcjonalne cache przy odczytach.

## 8. Kroki implementacji

1. W `src/app/api/flashcards/route.ts`:
   - Dodaj inline Zod-schema i walidację (`safeParse`).
   - Import `createClient`, `DEFAULT_USER_ID`.
   - Implementuj handler (400, try→service, 201, catch→500).
2. Utwórz `src/lib/services/flashcards.service.ts`:
   - Eksportuj `createFlashcards`.
3. Importuj i użyj `createFlashcards` w route.ts.
