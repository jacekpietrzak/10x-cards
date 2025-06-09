# API Endpoint Implementation Plan: GET `/flashcards/{id}`

## 1. Przegląd punktu końcowego

Pobranie szczegółów pojedynczej fiszki (`FlashcardDto`) dla uwierzytelnionego użytkownika na podstawie jej identyfikatora.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Ścieżka: `/flashcards/{id}`
- Autoryzacja: sesja Supabase SSR (ciasteczka HTTP-only)
- Parametry ścieżki:
  - `id` (string w URL, wymagana): identyfikator fiszki, musi być liczbą całkowitą > 0
- Request Body: brak

## 3. Wykorzystywane typy

- `FlashcardDto` (z `src/lib/types.ts`)

## 4. Szczegóły odpowiedzi

- 200 OK
  ```json
  {
    "id": number,
    "front": string,
    "back": string,
    "source": "ai-full" | "ai-edited" | "manual",
    "generation_id": number | null,
    "created_at": string,   // ISO timestamp
    "updated_at": string    // ISO timestamp
  }
  ```
- 400 Bad Request – niepoprawny `id` (np. nie-number, ≤ 0)
- 401 Unauthorized – brak lub niepoprawna sesja
- 404 Not Found – brak fiszki o podanym `id` lub nie należy do bieżącego użytkownika
- 500 Internal Server Error – nieoczekiwany błąd serwera lub bazy danych

## 5. Przepływ danych

1. **Route Handler**: utworzyć plik `src/app/api/flashcards/[id]/route.ts` z funkcją:
   ```ts
   export async function GET(
     request: Request,
     { params }: { params: { id: string } }
   ) { ... }
   ```
2. **Walidacja parametru**:
   - Zod schema:
     ```ts
     const paramsSchema = z.object({
       id: z
         .string()
         .regex(/^[1-9]\d*$/, "Invalid flashcard id")
         .transform(Number),
     });
     ```
   - Jeśli `safeParse` zwróci błąd → 400
3. **Uwierzytelnienie**:
   - `const supabase = await createClient();`
   - `const { data: { user } } = await supabase.auth.getUser();`
   - Brak `user` → 401
4. **Wywołanie serwisu**:
   ```ts
   import { getFlashcardById } from "@/lib/services/flashcards.service";
   const flashcard = await getFlashcardById(validatedId, user.id, supabase);
   ```
5. **Serwis** (`src/lib/services/flashcards.service.ts`):

   ```ts
   export async function getFlashcardById(
     id: number,
     userId: string,
     supabase: SupabaseClient<Database>
   ): Promise<FlashcardDto | null> {
     const { data, error } = await supabase
       .from("flashcards")
       .select("id, front, back, source, generation_id, created_at, updated_at")
       .eq("id", id)
       .eq("user_id", userId)
       .single();

     if (error) {
       if (error.code === "PGRST116") return null;
       throw error;
     }
     return data;
   }
   ```

6. **Odpowiedź**:
   - `flashcard === null` → NextResponse.json({ error: "Not found" }, { status: 404 })
   - w przeciwnym razie → NextResponse.json(flashcard, { status: 200 })

## 6. Względy bezpieczeństwa

- Autoryzacja: wyniki filtrowane po `user_id` (użytkownik widzi tylko swoje fiszki)
- SQL Injection: zapytania przez klienta Supabase + walidacja `id`
- Ograniczenia CORS i rate limiting (w middleware/globalnej konfiguracji)

## 7. Obsługa błędów

| Scenariusz                                  | Kod stanu | Treść odpowiedzi                   |
| ------------------------------------------- | --------- | ---------------------------------- |
| Parametr `id` nieprawidłowy                 | 400       | `{ error: [...] }`                 |
| Brak sesji / użytkownika                    | 401       | `{ error: "Unauthorized" }`        |
| Fiszka nie istnieje lub nie należy do usera | 404       | `{ error: "Flashcard not found" }` |
| Błąd serwisowy / baza danych                | 500       | `{ error: "Server error" }`        |

## 8. Rozważania dotyczące wydajności

- Proste lookup po kluczu głównym + indeks na `id` i `user_id` → szybkie O(log N)
- Brak paginacji (pojedynczy rekord)
- Możliwość dodania cache HTTP (Cache-Control headers) jeśli endpoint będzie często wywoływany

## 9. Kroki implementacji

1. Utworzyć Zod schema parametrów w `src/lib/schemas/flashcardsParams.ts`
2. Dodać funkcję `getFlashcardById` do `src/lib/services/flashcards.service.ts`
3. Utworzyć folder i plik dynamicznego route’a:
   - `src/app/api/flashcards/[id]/route.ts`
4. W route:
   - Importować `createClient`, Zod schema, `getFlashcardById`
   - Walidować `params.id` → 400
   - Uzyskiwać `user` → 401
   - Wywoływać serwis → 404 lub 200
   - Złapać nieoczekiwane wyjątki → 500
5. Dodać testy jednostkowe dla serwisu i integracyjne dla endpointa
6. Dodać e2e test uwierzytelnienia i scenariuszy błędów
7. Zaktualizować dokumentację API i dodać przykład wywołania
8. PR z konwencją Conventional Commits: `feat(flashcards): add GET /flashcards/{id} endpoint`
