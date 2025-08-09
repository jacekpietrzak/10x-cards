# API Endpoint Implementation Plan: GET /generation-error-logs

## 1. Przegląd punktu końcowego

Ten endpoint umożliwia wyłącznie administratorowi pobranie dzienników błędów generowania fiszek AI.

- Administrator może pobrać logi dla wszystkich użytkowników lub, opcjonalnie, przefiltrować według `userId`.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Ścieżka URL: `/generation-error-logs`
- Nagłówki:
  - `Authorization: Bearer <token>` (wymagane)
- Parametry zapytania:
  - `userId` (string, uuid, opcjonalne) – filtruje logi dla wskazanego userId; dostępne wyłącznie dla admina; jeśli niepodane, zwraca logi wszystkich użytkowników.

## 3. Wykorzystywane typy

- GenerationErrorLogDto (z `src/lib/types.ts`):
  ```ts
  export type GenerationErrorLogDto = {
    id: number;
    error_code: string;
    error_message: string;
    model: string;
    source_text_hash: string;
    source_text_length: number;
    created_at: string;
    user_id: string;
  };
  ```
- (Zod) QueryParamsSchema:
  ```ts
  import { z } from "zod";
  export const QueryParamsSchema = z.object({
    userId: z.string().uuid().optional(),
  });
  ```

## 4. Przepływ danych

1. Next.js App Router API route `src/app/api/generation-error-logs/route.ts` otrzymuje żądanie.
2. Tworzymy Supabase Server Client z `createSupabaseServerClient()` (Supabase SSR, cookies).
3. Wywołujemy `supabase.auth.getUser()` i pobieramy `user.id` oraz `user.user_metadata.role`.
4. Parsujemy i walidujemy query params z Zod.
5. Autoryzacja:
   - Jeśli requester nie jest admin → zwracamy 403 Forbidden.
6. Decydujemy o zasięgu:
   - Jeśli `userId` przekazane → filterUserId = podane userId.
   - Jeśli `userId` nie przekazane → brak filtra, pobieramy wszystkie logi.
7. Wywołujemy `generationErrorLogService.getErrorLogs(filterUserId?)`:
   - W serwisie budujemy zapytanie:
     ```ts
     let query = supabase
       .from("generation_error_logs")
       .select("*")
       .order("created_at", { ascending: false });
     if (filterUserId) query = query.eq("user_id", filterUserId);
     ```
8. Wynik zwracamy w `NextResponse.json(logs, { status: 200 })`.

## 5. Względy bezpieczeństwa

- Uwierzytelnianie: jedynie ważny JWT z Supabase Auth.
- Autoryzacja: wyłącznie użytkownik z rolą admin może uzyskać dostęp do tego endpointu.
- SQL Injection: używamy supabase-js, który zabezpiecza zapytania.
- Rate limiting (opcjonalnie): w warstwie infra lub middleware.

## 6. Obsługa błędów

| Kod | Warunek                                            | Odpowiedź                                 |
| --- | -------------------------------------------------- | ----------------------------------------- |
| 400 | Niepoprawny format `userId` (nie-UUID)             | JSON `{ error: 'Invalid userId' }`        |
| 401 | Brak lub nieprawidłowy token uwierzytelniający     | JSON `{ error: 'Unauthorized' }`          |
| 403 | Użytkownik bez roli admin próbujący uzyskać dostęp | JSON `{ error: 'Forbidden' }`             |
| 500 | Błąd wewnętrzny serwera / błąd Supabase            | JSON `{ error: 'Internal Server Error' }` |

## 7. Wydajność

- Indeks na kolumnie `user_id` w tabeli `generation_error_logs`.
- Stronicowanie (future): query param `page`, `limit` z domyślnym `limit = 100`.
- Pobieramy tylko potrzebne kolumny (można rozważyć `.select('id, error_code, ...')`).

## 8. Kroki implementacji

1. Utworzyć Zod schema `QueryParamsSchema` w `src/lib/schemas/generationErrorLog.ts`.
2. Dodać serwis `src/lib/services/generationErrorLog.service.ts` z metodą `getErrorLogs(filterUserId?)`.
3. Utworzyć App Router API folder `src/app/api/generation-error-logs/route.ts`.
4. W `route.ts`:
   - Zaimportować `createSupabaseServerClient` z `@supabase/ssr`, schema i serwis.
   - Wywołać `supabase.auth.getUser()`, sprawdzić czy `user.user_metadata.role === 'admin'`, w przeciwnym razie zwrócić 403.
   - Walidować query param `userId` schemą Zod.
   - Przekazać `filterUserId` (jeśli jest) do serwisu.
   - Zwrócić rezultat poprzez `NextResponse.json`.
5. Zaktualizować `tsconfig.json` / `src/lib/types/env.d.ts` jeśli potrzebne.
6. (Opcjonalnie) Dodać restrykcje RLS w Supabase, by tylko admin mógł odczytywać wszystkie wiersze.
