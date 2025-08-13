# API Endpoint Implementation Plan: GET `/flashcards`

## 1. Przegląd punktu końcowego

Pobranie spakowanej, filtrowalnej i sortowalnej listy fiszek dla uwierzytelnionego użytkownika.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Ścieżka: `/flashcards`
- Autoryzacja: Sesja Supabase SSR (ciasteczka HTTP-only)
- Parametry zapytania:
  - `page` (number, domyślnie 1)
  - `limit` (number, domyślnie 10, maksymalnie 100)
  - `sort` (string, opcjonalnie, dozwolone: `created_at`, `front`, `back`, `source`, `updated_at`, domyślnie `created_at`)
  - `order` (string, opcjonalnie, `asc` | `desc`, domyślnie `asc`)
  - `source` (string, opcjonalnie, `ai-full` | `ai-edited` | `manual`)
  - `generation_id` (number, opcjonalnie)

- Walidacja parametrów:
  - Użyć Zod w `src/lib/schemas/flashcards.ts`
  - `page`, `limit`: integer ≥ 1
  - `sort`: enum dozwolonych pól
  - `order`: `asc` | `desc`
  - `source`: enum `ai-full`, `ai-edited`, `manual`
  - `generation_id`: integer ≥ 1

## 3. Szczegóły odpowiedzi

- 200 OK
  ```json
  {
    "data": FlashcardDto[],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number
    }
  }
  ```
- 400 Bad Request – niewłaściwe parametry zapytania
- 401 Unauthorized – brak lub niepoprawna sesja
- 500 Internal Server Error – błąd serwera lub bazy danych

### Wykorzystywane typy (z `src/lib/types.ts`)

- `FlashcardDto`
- `PaginationDto`
- `FlashcardsListResponseDto`

## 4. Przepływ danych

1. **Route Handler**: `src/app/api/flashcards/route.ts` (App Router)
2. Utworzenie klienta: `createSupabaseServerClient()` (z `@supabase/ssr` + `next/headers`)
3. Pobranie i weryfikacja użytkownika: `supabase.auth.getUser()` → jeśli brak, zwróć 401
4. Parsowanie `request.nextUrl.searchParams` i walidacja Zod → w razie błędu zwróć 400
5. Wywołanie serwisu: `flashcards.service.listFlashcards(user.id, params)`
   - Budowa zapytania do Supabase:
     - `.from('flashcards')`
     - `.select('*', { count: 'exact' })`
     - `.eq('user_id', user.id)`
     - `.filter('source', 'eq', source)` (opcjonalnie)
     - `.eq('generation_id', generation_id)` (opcjonalnie)
     - `.order(sort, { ascending: order === 'asc' })`
     - `.range(offset, offset + limit - 1)`
6. Otrzymanie `data` i `count` → przygotowanie obiektu `FlashcardsListResponseDto`
7. Zwrot odpowiedzi: `NextResponse.json({ data, pagination }, { status: 200 })`

## 5. Względy bezpieczeństwa

- Uwierzytelnienie przez Supabase SSR (zachowanie sesji via `getAll` i `setAll`)
- Autoryzacja: ograniczenie zapytań do rekordu `flashcards` z `user_id` bieżącego użytkownika
- Weryfikacja i sanitizacja parametrów zapytania (Zod)
- Ochrona przed SQL injection dzięki klientowi Supabase
- Rate limiting i CORS

## 6. Obsługa błędów

- **400 Bad Request**: niepoprawne lub brakujące parametry zapytania
- **401 Unauthorized**: brak sesji lub nieprawidłowy token
- **500 Internal Server Error**: nieoczekiwany błąd w serwisie lub bazie danych
- **200 OK**: nawet jeśli brak fiszek, zwracamy pustą listę z `pagination.total: 0`

## 7. Rozważania dotyczące wydajności

- Indeksy bazodanowe na `user_id` i `created_at`
- Offset pagination vs. cursor pagination (dla dużych zbiorów danych rozważyć keyset pagination)
- Cache warstwy CDN lub pamięć podręczna w aplikacji
- Unikanie kosztownych zliczeń przy dużych tabelach (opcjonalne ograniczenie `count`)

## 8. Kroki implementacji

1. **Schemat walidacji**: utworzyć Zod schema w `src/lib/schemas/flashcards.ts`
2. **Warstwa serwisowa**: dodać `listFlashcards` w `src/lib/services/flashcards.ts`
3. **Endpoint**: utworzyć `src/app/api/flashcards/route.ts` z handlerem GET
4. W handlerze:
   - Import `createSupabaseServerClient`
   - Pobranie i walidacja sesji użytkownika
   - Parsowanie i walidacja parametrów (Zod)
   - Wywołanie serwisu i przygotowanie DTO
   - Zwrócenie odpowiedzi JSON
