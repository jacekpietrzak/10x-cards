# API Endpoint Implementation Plan: PUT /flashcards/{id}/review

## 1. Przegląd punktu końcowego

Ten punkt końcowy umożliwia aktualizację stanu fiszki w oparciu o algorytm FSRS (Free Spaced Repetition Scheduler) po sesji powtórkowej. Aktualizuje on parametry takie jak `stability` i `difficulty`, a także ustala nową datę kolejnej powtórki (`due`). Endpoint jest zabezpieczony i wymaga, aby użytkownik był właścicielem modyfikowanej fiszki.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PUT`
- **Struktura URL**: `/api/flashcards/{id}/review`
- **Parametry ścieżki**:
  - **Wymagane**: `id` (BIGINT) - Identyfikator fiszki.
- **Request Body**: Obiekt JSON z danymi do aktualizacji.
  ```json
  {
    "stability": 2.5,
    "difficulty": 7.0,
    "due": "2024-09-15T10:00:00Z",
    "lapses": 0,
    "state": 2,
    "last_review": "2024-09-12T09:30:00Z"
  }
  ```

## 3. Wykorzystywane typy

Do implementacji tego punktu końcowego konieczne będzie zdefiniowanie i aktualizacja następujących typów w `src/lib/types.ts`:

1.  **FlashcardReviewDto** (Nowy): Definiuje strukturę ciała żądania.
    ```typescript
    export interface FlashcardReviewDto {
      stability: number;
      difficulty: number;
      due: string; // ISO 8601 date string
      lapses: number;
      state: number;
      last_review: string; // ISO 8601 date string
    }
    ```
2.  **Flashcard** (Aktualizacja): Należy dodać nowe, opcjonalne pola, aby odzwierciedlić zmiany w bazie danych.
    ```typescript
    export type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];
    // Ten typ zostanie zaktualizowany automatycznie po regeneracji typów Supabase
    ```
3.  **FlashcardDto** (Aktualizacja): Należy rozszerzyć o nowe pola FSRS, aby były one zwracane w odpowiedzi.
    ```typescript
    export type FlashcardDto = Pick<
      Flashcard,
      | "id"
      // ... istniejące pola
      | "updated_at"
      | "stability"
      | "difficulty"
      | "due"
      | "lapses"
      | "state"
      | "last_review"
    >;
    ```

## 4. Szczegóły odpowiedzi

- **Pomyślna odpowiedź (`200 OK`)**: Zwraca pełny, zaktualizowany obiekt fiszki w formacie `FlashcardDto`.
  ```json
  {
    "id": 123,
    "front": "What is REST?",
    "back": "Representational State Transfer.",
    "source": "manual",
    "generation_id": null,
    "created_at": "2024-07-01T12:00:00Z",
    "updated_at": "2024-09-12T09:30:05Z",
    "stability": 2.5,
    "difficulty": 7.0,
    "due": "2024-09-15T10:00:00Z",
    "lapses": 0,
    "state": 2,
    "last_review": "2024-09-12T09:30:00Z"
  }
  ```
- **Odpowiedzi błędów**: Zobacz sekcję "Obsługa błędów".

## 5. Przepływ danych

1.  Żądanie `PUT` trafia do handlera API w `src/app/api/flashcards/[id]/review/route.ts`.
2.  Middleware Next.js i Supabase weryfikuje token JWT i autentykuje użytkownika.
3.  Handler API pobiera `id` z parametrów URL oraz ciało żądania.
4.  Dane wejściowe są walidowane przy użyciu schematu Zod zdefiniowanego w `src/lib/schemas/flashcards.ts`.
5.  Handler wywołuje funkcję `updateFlashcardReview(id, userId, reviewData)` z serwisu `src/lib/services/flashcards.service.ts`.
6.  Serwis konstruuje i wykonuje zapytanie `UPDATE` do bazy Supabase, aktualizując fiszkę, której `id` oraz `user_id` pasują do podanych.
7.  Baza danych zwraca zaktualizowany rekord.
8.  Serwis zwraca zaktualizowany obiekt fiszki do handlera.
9.  Handler API formatuje odpowiedź `200 OK` z obiektem fiszki lub odpowiedź błędu (np. `404`) i wysyła ją do klienta.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Każde żądanie musi zawierać ważny token JWT. Proces jest zarządzany przez middleware Supabase.
- **Autoryzacja**: Logika w serwisie musi bezwzględnie weryfikować, czy `user_id` zalogowanego użytkownika jest zgodne z `user_id` przypisanym do fiszki. Zapytanie `UPDATE` musi zawierać warunek `WHERE user_id = :userId`, aby zapobiec modyfikacji cudzych danych (IDOR).
- **Walidacja danych**: Wszystkie dane wejściowe z ciała żądania muszą być walidowane przy użyciu Zod, aby zapewnić ich poprawność (typ, format, zakres) i zapobiec błędom oraz potencjalnym atakom.

## 7. Rozważania dotyczące wydajności

- Operacja jest pojedynczym zapytaniem `UPDATE` do bazy danych, targetującym rekord po kluczu głównym (`id`) oraz indeksowanym kluczu obcym (`user_id`).
- Wpływ na wydajność jest minimalny i nie przewiduje się wąskich gardeł przy typowym obciążeniu.

## 8. Etapy wdrożenia

1.  **Migracja bazy danych**:
    - Utwórz nowy plik migracji Supabase (`supabase/migrations/YYYYMMDDHHMMSS_add_fsrs_to_flashcards.sql`).
    - Dodaj następujące, nullowalne kolumny do tabeli `flashcards`:
      - `stability` (REAL)
      - `difficulty` (REAL)
      - `due` (TIMESTAMPTZ)
      - `lapses` (INTEGER)
      - `state` (INTEGER)
      - `last_review` (TIMESTAMPTZ)
2.  **Aktualizacja typów bazy danych**:
    - Po zastosowaniu migracji, wygeneruj na nowo typy TypeScript dla bazy danych za pomocą komendy Supabase CLI: `supabase gen types typescript --project-id <project-id> > src/db/database.types.ts`.
3.  **Aktualizacja typów w aplikacji**:
    - Zmodyfikuj `FlashcardDto` w `src/lib/types.ts`, dodając nowe pola FSRS.
    - Dodaj nowy interfejs `FlashcardReviewDto` w `src/lib/types.ts`.
4.  **Stworzenie schematu walidacji Zod**:
    - W pliku `src/lib/schemas/flashcards.ts` dodaj nowy schemat `flashcardReviewSchema` do walidacji danych wejściowych z `FlashcardReviewDto`.
5.  **Rozbudowa serwisu `flashcards.service.ts`**:
    - Zaimplementuj nową, asynchroniczną funkcję `updateFlashcardReview(id: number, userId: string, data: FlashcardReviewDto)`.
    - Funkcja powinna wykonać zapytanie `update` z Supabase Client, uwzględniając `id` i `userId` w klauzuli `eq`.
    - W przypadku braku rekordu do aktualizacji, funkcja powinna rzucać błąd (np. `new Error("Flashcard not found")`).
6.  **Implementacja API Route**:
    - Stwórz plik `src/app/api/flashcards/[id]/review/route.ts`.
    - Zaimplementuj w nim funkcję `export async function PUT(request: NextRequest, { params }: { params: { id: string } })`.
    - Wewnątrz funkcji:
      - Utwórz klienta Supabase (`createSupabaseServerClient`).
      - Pobierz sesję użytkownika (`supabase.auth.getUser()`).
      - Sprawdź, czy `params.id` jest liczbą.
      - Zwaliduj ciało żądania (`request.json()`) za pomocą `flashcardReviewSchema`.
      - Wywołaj serwis `updateFlashcardReview`.
      - Obsłuż błędy (z walidacji i serwisu), zwracając odpowiednie kody statusu.
      - W przypadku sukcesu, zwróć `NextResponse.json(updatedFlashcard, { status: 200 })`.
