# API Endpoint Implementation Plan: PUT /flashcards/{id}

## 1. Przegląd punktu końcowego

Edytuje istniejącą fiszkę użytkownika. Wymaga uwierzytelnienia oraz autoryzacji, działa na ścieżce `/flashcards/{id}` i umożliwia aktualizację pól `front`, `back`, `source` oraz `generation_id`.

## 2. Szczegóły żądania

- Metoda HTTP: PUT
- Ścieżka URL: `/flashcards/{id}`
- Nagłówki:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Parametry:
  - Wymagane:
    - `id` (path param, typ: number) – identyfikator fiszki
  - Body (JSON) – model `FlashcardUpdateDto`:
    - `front?: string` (max 200 znaków)
    - `back?: string` (max 500 znaków)
    - `source?: "ai-full" | "ai-edited" | "manual"`
    - `generation_id?: number | null`
- Zasady walidacji:
  - Przynajmniej jedno z pól musi być obecne
  - Ograniczenia długości dla `front` i `back`
  - `source` musi należeć do dozwolonych wartości
  - Gdy `source = "manual"`, `generation_id` musi być `null`

## 3. Szczegóły odpowiedzi

- 200 OK  
  Zwraca zaktualizowany obiekt `FlashcardDto`:
  ```json
  {
    "id": 123,
    "front": "Przykładowe pytanie",
    "back": "Przykładowa odpowiedź",
    "source": "manual",
    "generation_id": null,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-02T10:00:00Z"
  }
  ```
- 400 Bad Request – błędy walidacji (szczegóły w ciele odpowiedzi)
- 401 Unauthorized – brak lub nieważny token
- 404 Not Found – nie znaleziono fiszki o podanym `id`
- 500 Internal Server Error – nieoczekiwany błąd na serwerze

## 4. Przepływ danych

1. Middleware Next.js (SSR) z Supabase (`createServerClient`) weryfikuje sesję i pobiera `user_id`.
2. Handler `PUT` w `src/app/api/flashcards/[id]/route.ts`:
   - Odczyt `id` z `request.nextUrl`.
   - Parsowanie i walidacja ciała żądania za pomocą Zod (`flashcardUpdateSchema`).
   - Wywołanie `flashcards.service.updateFlashcard(id, dto, userId)`.
3. Metoda `updateFlashcard` w `src/lib/services/flashcards.service.ts`:
   - Sprawdzenie istnienia fiszki i zgodności `user_id`.
   - Wykonanie zapytania do Supabase:
     ```ts
     supabase
       .from("flashcards")
       .update(dto)
       .eq("id", id)
       .eq("user_id", userId)
       .select("*")
       .single();
     ```
   - Obsługa błędów DB i zwrócenie wyniku.
4. Handler zwraca `NextResponse.json(result, { status: 200 })`.

## 5. Względy bezpieczeństwa

- Autentykacja w middleware – przekazanie tylko uwierzytelnionym.
- Autoryzacja – aktualizację może wykonać wyłącznie właściciel fiszki.
- White-listing pól w DTO.
- Sanitizacja i walidacja wejścia przez Zod.

## 6. Obsługa błędów

- Błędy walidacji Zod → 400 + szczegóły.
- Brak sesji → 401.
- Brak fiszki lub niepoprawny właściciel → 404.
- Błędy po stronie DB → 500 z logowaniem (np. Sentry).

## 7. Wydajność

- Indeks na kolumnach `id` i `user_id`.
- Minimalizacja liczby kolumn w `SELECT`.

## 8. Kroki implementacji

1. Zdefiniować `flashcardUpdateSchema` w `src/lib/schemas/flashcardSchemas.ts` (Zod).
2. Utworzyć plik `src/app/api/flashcards/[id]/route.ts` i zaimplementować handler PUT.
3. W handlerze:
   - `const supabase = await createSupabaseServerClient();`
   - Walidacja ciała żądania.
   - Wywołanie `flashcards.service.updateFlashcard`.
   - Zwrócenie odpowiedzi.
4. Rozbudować `flashcards.service` o metodę `updateFlashcard`.
