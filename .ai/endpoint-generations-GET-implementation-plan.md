# API Endpoint Implementation Plan: GET /generations

## 1. Przegląd punktu końcowego

Endpoint `GET /generations` umożliwia pobranie listy żądań generacji flashcardów dla uwierzytelnionego użytkownika. Wspiera paginację i zwraca wyłącznie metadane generacji.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/generations?page={page}&limit={limit}`
- Parametry:
  - Wymagane:
    - Brak (użytkownik uwierzytelniony określa kontekst danych)
  - Opcjonalne:
    - `page`: numer strony (domyślnie 1)
    - `limit`: liczba rekordów na stronę (domyślnie 10, maksymalnie 100)
- Request Body: brak

## 3. Wykorzystywane typy

- `PaginationDto` (zdefiniowany w `src/lib/types.ts`)
- `GenerationDto` (nowy typ lub `Pick` istniejącego `Generation` z `src/db/database.types`) zawierający pola:
  - `id`, `model`, `generated_count`, `accepted_unedited_count`, `accepted_edited_count`,
    `source_text_hash`, `source_text_length`, `generation_duration`, `created_at`, `updated_at`
- `GenerationsListResponseDto` (nowy typ):
  ```ts
  interface GenerationsListResponseDto {
    data: GenerationDto[];
    pagination: PaginationDto;
  }
  ```

## 4. Przepływ danych

1. Klient wysyła GET z parametrami `page` i `limit`.
2. API route parsuje i waliduje parametry przy pomocy `zod`.
3. Tworzony jest serwerowy klient Supabase: `supabase = await createClient()`.
4. Pobierana jest sesja użytkownika: `const { data: { user } } = await supabase.auth.getUser()`.
5. Jeśli brak `user`, zwracamy 401 Unauthorized.
6. Wywoływana jest logika biznesowa w nowej funkcji serwisowej `listGenerations(user.id, page, limit)`:
   - Supabase `.from('generations')`
     - `.select('*', { count: 'exact' })`
     - `.eq('user_id', user.id)`
     - `.order('created_at', { ascending: false })`
     - `.range(offset, offset + limit - 1)`
   - Zwracana jest lista rekordów i całkowita liczba.
7. API formatuje odpowiedź jako `GenerationsListResponseDto` i zwraca z kodem 200.

## 5. Względy bezpieczeństwa

- Uwierzytelnianie: użycie `supabase.auth.getUser()` z `@supabase/ssr` (wyłącznie `getAll`/`setAll`).
- Autoryzacja: filtrowanie rekordów po `user_id` aby zwrócić jedynie dane bieżącego użytkownika.
- Walidacja parametru `page` i `limit` (liczby całkowite, zakres minimalny i maksymalny) w celu zapobieżenia nadużyciom.
- Ochrona przed SQL Injection przez użycie Supabase SDK.
- Rate limiting i CORS

## 6. Obsługa błędów

| Kod | Scenariusz                            | Odpowiedź                            |
| --- | ------------------------------------- | ------------------------------------ |
| 200 | Pomyślne pobranie listy generacji     | `GenerationsListResponseDto`         |
| 400 | Błędne parametry `page` lub `limit`   | `{ error: string }`                  |
| 401 | Brak ważnej sesji użytkownika         | `{ error: 'Unauthorized' }`          |
| 500 | Błąd serwera / błąd połączenia z bazą | `{ error: 'Internal server error' }` |

## 7. Rozważania dotyczące wydajności

- Limit `limit` ograniczony do rozsądnej wartości (np. 100) dla uniknięcia nadmiernych zapytań.
- Indeks na kolumnie `user_id` i `created_at` aby przyspieszyć filtrowanie i sortowanie.
- Paginacja po offset/range wspierana natywnie przez Supabase.

## 8. Kroki implementacji

1. **Definicja typów**
   - Dodać `GenerationDto` i `GenerationsListResponseDto` do `src/lib/types.ts`.
2. **Logika serwisowa**
   - W `src/lib/services/generation.service.ts` utworzyć funkcję:
     ```ts
     export async function listGenerations(
       userId: string,
       page: number,
       limit: number,
       supabase: SupabaseClient<Database>
     ): Promise<GenerationsListResponseDto> { ... }
     ```
3. **Walidacja parametrów**
   - W `src/app/api/generations/route.ts` dodać `GET` handler.
   - Użyć `z.object({ page: z.coerce.number().min(1).default(1), limit: z.coerce.number().min(1).max(100).default(10) })`.
4. **Implementacja GET handlera**
   - Importować `createClient` i `listGenerations`.
   - Parsować query params, uzyskać `user` przez `supabase.auth.getUser()`.
   - Wywołać `listGenerations(user.id, page, limit, supabase)`.
   - Zwrócić `NextResponse.json(result, { status: 200 })`.
