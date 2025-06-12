# API Endpoint Implementation Plan: DELETE /flashcards/{id}

## 1. Przegląd punktu końcowego

Usuwa pojedynczą fiszkę przypisaną do uwierzytelnionego użytkownika na podstawie jej identyfikatora.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Ścieżka: `/api/flashcards/{id}`
- Parametry ścieżki:
  - **id** (number, wymagane): identyfikator fiszki do usunięcia
- Body żądania: brak (n/a)

> Typy wejściowe:
>
> - `id: number` (ścieżka)
> - Brak DTO dla ciała (DELETE nie wymaga payload)

## 3. Szczegóły odpowiedzi

- **200 OK**
  - Body: `{ message: string }`
  - DTO: `DeleteFlashcardResponseDto` (np. `{ message: "Flashcard deleted successfully." }`)
- **401 Unauthorized**
  - Body: `{ error: string }` (np. `{ error: "Unauthorized" }`)
- **404 Not Found**
  - Body: `{ error: string }` (np. `{ error: "Flashcard not found" }`)
- **500 Internal Server Error**
  - Body: `{ error: string }` (np. `{ error: "Internal server error" }`)

## 4. Przepływ danych

1. **Autoryzacja**: middleware Next.js korzysta z `createServerClient` (`@supabase/ssr`) do weryfikacji sesji i pobrania `user.id`.
2. **Parsowanie i walidacja**: pobranie parametru `id` z URL; próba konwersji na `number`; w razie błędu zwrócenie 400.
3. **Weryfikacja istnienia**: zapytanie do Supabase:
   ```ts
   const { data } = await supabase
     .from("flashcards")
     .select("id")
     .eq("id", id)
     .eq("user_id", user.id)
     .single();
   ```
4. **Obsługa braku rekordu**: jeśli `data` jest puste, zwrócić 404.
5. **Usunięcie rekordu**:
   ```ts
   await supabase.from("flashcards").delete().eq("id", id);
   ```
6. **Odpowiedź**: zwrócenie 200 z `{ message: 'Flashcard deleted successfully.' }`.

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie**: tylko uwierzytelniony użytkownik może wywołać endpoint.
- **Autoryzacja**: usunięcie tylko własnych fiszek (`user_id` musi pasować).
- **CSRF**: Next.js API + ciasteczka SameSite zapewniają ochronę.
- **SQL Injection**: zapytania przez Supabase parametrów zabezpieczają.

## 6. Obsługa błędów

| Kod | Warunek                                                  | Odpowiedź                            |
| --- | -------------------------------------------------------- | ------------------------------------ |
| 400 | Niepoprawny `id` (np. NaN)                               | `{ error: 'Invalid flashcard ID' }`  |
| 401 | Brak sesji / nieautoryzowany użytkownik                  | `{ error: 'Unauthorized' }`          |
| 404 | Brak fiszki o podanym `id` lub nie należy do użytkownika | `{ error: 'Flashcard not found' }`   |
| 500 | Błąd po stronie serwera (np. timeout, błąd Supabase)     | `{ error: 'Internal server error' }` |

## 7. Wydajność

- Operacja skaluje się liniowo z liczbą wierszy, ale działa na kluczu głównym (`id`) – bardzo szybka.
- Zapewniony index na `flashcards.id` i `flashcards.user_id`.
- Brak konieczności ładowania dodatknych relacji.
- Możliwość soft-delete w przyszłości (zachowanie historii).

## 8. Kroki implementacji

1. **Utworzyć plik**: `src/app/api/flashcards/[id]/route.ts`.
2. **Importy i konfiguracja**:
   - `createServerClient` z `@supabase/ssr`
   - `NextResponse`, `NextRequest` z `next/server`
3. **Funkcja handler**:
   - Wywołanie `createServerClient` z `cookies.getAll()` i `setAll()`.
   - Parsowanie parametru `id` z `request.nextUrl.pathname` lub z `params`.
4. **Walidacja**: użyć guard clause do sprawdzenia poprawności `id`.
5. **Pobranie sesji**: `supabase.auth.getUser()` zaraz po inicjalizacji klienta.
6. **Sprawdzenie własności**: zapytanie o `flashcards` z `user_id`.
7. **Usunięcie dane**: wywołać `.delete().eq('id', id)`.
8. **Zwrócenie odpowiedzi**: `return NextResponse.json({ message: 'Flashcard deleted successfully.' })`.
