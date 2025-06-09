# API Endpoint Implementation Plan: GET `/generations`

## 1. Przegląd punktu końcowego

Endpoint umożliwia uwierzytelnionemu użytkownikowi pobranie listy jego zapytań generacyjnych z opcjonalnym paginowaniem.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Ścieżka: `/api/generations`
- Parametry zapytania:
  - Wymagane: brak
  - Opcjonalne:
    - `page` (number, domyślnie 1) – numer strony
    - `limit` (number, domyślnie 10) – liczba rekordów na stronę
- Body: brak

## 3. Wykorzystywane typy

- `PaginationDto` (src/lib/types.ts)
- `Generation` (Database row: kolumny z tabeli `generations`)
- **Nowe DTO** (do dodania w `src/lib/types.ts`):

  ```typescript
  export type GenerationDto = Pick<
    Generation,
    | "id"
    | "model"
    | "generated_count"
    | "accepted_unedited_count"
    | "accepted_edited_count"
    | "source_text_hash"
    | "source_text_length"
    | "generation_duration"
    | "created_at"
    | "updated_at"
  >;

  export interface GenerationsListResponseDto {
    data: GenerationDto[];
    pagination: PaginationDto;
  }
  ```

## 4. Przepływ danych

1. Middleware/Utility `createServerClient` z `@supabase/ssr` tworzy klienta Supabase i odczytuje ciasteczka (`getAll`/`setAll`).
2. W `route.ts` API:
   - Parsowanie i walidacja parametrów `page` i `limit` za pomocą Zod.
   - Wywołanie `supabase.auth.getUser()` w celu uwierzytelnienia.
   - Jeśli brak użytkownika, zwrócenie 401.
   - Wywołanie serwisu `getGenerationsList(userId, page, limit)`:
     - Budowa zapytania do `supabase.from('generations')`
     - Filtrowanie po `user_id`
     - Ustawienie zakresu: `.range((page-1)*limit, page*limit - 1)`
   - Mapowanie wyniku na `GenerationDto[]`.
   - Zwrócenie obiektu `GenerationsListResponseDto` z kodem 200.

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie**: obowiązkowe wywołanie `supabase.auth.getUser()`; zwrócenie 401, jeśli nie jest uwierzytelniony.
- **Autoryzacja**: pobieranie wyłącznie rekordów należących do `user_id` z tokenu.
- **Walidacja**: użycie Zod do zapobiegania atakom typu injection w `page` i `limit`.

## 6. Obsługa błędów

- 400 Bad Request: niepoprawne parametry `page`/`limit` (walidacja Zod).
- 401 Unauthorized: brak sesji użytkownika.
- 500 Internal Server Error: błąd komunikacji z bazą danych lub nieprzewidziane wyjątki.

## 7. Rozważania dotyczące wydajności

- Paginacja po indeksowanym kluczu głównym (`id`) zapewnia skalowalność.
- W razie potrzeby cache'owanie na poziomie CDN/serwera dla wysoko obciążonych endpointów.

## 8. Kroki implementacji

1. W `src/lib/types.ts` dodać `GenerationDto` i `GenerationsListResponseDto`.
2. Utworzyć serwis w `src/lib/services/generations.service.ts`:
   - Funkcja `getGenerationsList(userId: string, page: number, limit: number): Promise<GenerationsListResponseDto>`.
3. Utworzyć plik API w `src/app/api/generations/route.ts`:
   - Importować Zod, `createServerClient`, serwis.
   - Zaimplementować logikę GET zgodnie z przepływem danych.
4. Dodać testy jednostkowe i integracyjne:
   - Walidacja query parameters.
   - Autoryzacja (brak i z prawidłowym tokenem).
   - Paginacja.
5. Uruchomić linter (`eslint --fix`) i formatter (`prettier --write`).
6. Dodać wpis w dokumentacji Swagger/OpenAPI oraz w README projektu.
7. Przeprowadzić code review i testy end-to-end.
8. Wdrożyć na środowisko staging, zweryfikować logi i metryki.
