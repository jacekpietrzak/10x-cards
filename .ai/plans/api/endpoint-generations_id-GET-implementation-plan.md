# API Endpoint Implementation Plan: GET `/generations/{id}`

## 1. Przegląd punktu końcowego

Punkt końcowy służy do pobrania szczegółowych informacji o pojedynczej generacji flashcards wraz z listą powiązanych fiszek. Umożliwia autoryzowanym użytkownikom wgląd wyłącznie w zasoby, które do nich należą.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/generations/{id}`
- Parametry:
  - Wymagane:
    - `id` (ścieżka): `BIGINT` – identyfikator generacji
  - Opcjonalne: brak
- Request Body: brak

## 3. Wykorzystywane typy

- **GenerationResponseDto** (DTO odpowiedzi)
  - `id: number`
  - `user_id: string`
  - `model: string`
  - `generated_count: number`
  - `accepted_unedited_count?: number`
  - `accepted_edited_count?: number`
  - `source_text_hash: string`
  - `source_text_length: number`
  - `generation_duration: number`
  - `created_at: string`
  - `updated_at: string`
  - `flashcards: FlashcardResponseDto[]`
- **FlashcardResponseDto**
  - `id: number`
  - `front: string`
  - `back: string`
  - `source: 'ai-full' | 'ai-edited' | 'manual'`
  - `created_at: string`
  - `updated_at: string`
  - `generation_id: number | null`
  - `user_id: string`

## 4. Przepływ danych

1. Klient wysyła żądanie GET na `/api/generations/{id}` z ciasteczkami sesji.
2. Middleware Next.js (`src/middleware.ts`) weryfikuje obecność i ważność tokenu, odświeża sesję.
3. Kontroler w `src/app/api/generations/[id]/route.ts`:
   - Tworzy Supabase Server Client (`createSupabaseServerClient`).
   - Wywołuje `auth.getUser()` – 401, jeśli brak użytkownika.
   - Waliduje `id` parametr (Zod, integer > 0) – 400 przy błędzie.
   - Wykonuje zapytanie:
     ```typescript
     const { data, error } = await supabase
       .from("generations")
       .select(`*, flashcards(*)`)
       .eq("id", id)
       .eq("user_id", user.id)
       .single();
     ```
   - Jeśli `error` lub brak `data` – 404.
4. Zwraca `NextResponse.json(data, { status: 200 })`.

## 5. Względy bezpieczeństwa

- Autoryzacja przez Supabase SSR (`getAll`/`setAll`).
- Uwierzytelnienie i ochrona sesji w middleware.
- Autoryzacja zasobu: porównanie `generation.user_id` z `user.id`.
- Zabezpieczenie przed SQL Injection dzięki Supabase Query Builder.
- Brak wycieków wrażliwych danych – zwracanie wyłącznie pól DTO.

## 6. Obsługa błędów

| Scenariusz                                           | Kod | Opis                                 |
| ---------------------------------------------------- | --- | ------------------------------------ |
| Nieprawidłowe `id` (nie całkowite/liczba)            | 400 | Zwraca szczegóły błędu walidacji     |
| Brak sesji / niezalogowany użytkownik                | 401 | `{ error: 'Unauthorized' }`          |
| Autoryzacja niepowodzenie (cudzego rekordu)          | 403 | `{ error: 'Forbidden' }`             |
| Generacja nie istnieje lub nie należy do użytkownika | 404 | `{ error: 'Generation not found' }`  |
| Błąd serwera / połączenia z DB                       | 500 | `{ error: 'Internal server error' }` |

## 7. Rozważania dotyczące wydajności

- Jedno zapytanie SQL z `select('*', flashcards(*))` usprawni pobieranie.
- Indeks na `generations(id, user_id)` zapewnia szybkie filtrowanie.
- PageSize i limit: brak, bo pojedynczy zasób.
- Ewentualne cache'owanie na poziomie CDN lub aplikacji (Cache-Control).

## 8. Kroki implementacji

1. **Utworzenie pliku routingu**
   - `src/app/api/generations/[id]/route.ts`
2. **Zaimplementowanie obsługi `GET`**
   - Import `createSupabaseServerClient` i `NextResponse`, `NextRequest`.
   - Walidacja `id` parametru (Zod Schema).
   - Autoryzacja (supabase.auth.getUser).
   - Zapytanie do Supabase z `.select(...).eq(...).single()`.
   - Obsługa błędów zgodnie z tabelą.
