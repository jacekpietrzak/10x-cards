# Plan implementacji widoku: Sesja Nauki

## 1. Przegląd

Widok "Sesja Nauki" (`/session`) ma na celu umożliwienie użytkownikowi przeprowadzenia interaktywnej sesji powtórek fiszek. System, opierając się na algorytmie FSRS (Free Spaced Repetition Scheduler), wybiera fiszki, które są zaplanowane do powtórki na dany dzień. Użytkownik przegląda fiszki jedna po drugiej, oceniając swoją znajomość materiału, co pozwala na dynamiczne aktualizowanie harmonogramu przyszłych powtórek.

## 2. Routing widoku

Widok będzie dostępny pod chronioną ścieżką (wymagającą zalogowania):

- **Ścieżka:** `/session`
- **Plik:** `src/app/(auth)/session/page.tsx`

## 3. Struktura komponentów

Hierarchia komponentów dla widoku sesji nauki będzie następująca:

```
SessionPage (Container)
├── <LoadingSpinner /> (jeśli `sessionState` to 'loading')
├── <NoCardsToReview /> (jeśli `sessionState` to 'empty')
├── <SessionView /> (jeśli `sessionState` to 'active')
│   ├── <FlashcardViewer />
│   │   ├── <CardContent side="front" />
│   │   └── <CardContent side="back" />
│   └── <ReviewControls />
└── <SessionSummary /> (jeśli `sessionState` to 'finished')
```

## 4. Szczegóły komponentów

### `SessionPage` (Komponent kontenerowy)

- **Opis:** Główny komponent strony, który zarządza logiką i stanem całej sesji nauki. Odpowiada za pobieranie fiszek do powtórki, śledzenie postępów i renderowanie odpowiednich komponentów w zależności od stanu sesji.
- **Główne elementy:** Wykorzystuje customowy hook `useReviewSession` do zarządzania stanem. Renderuje warunkowo komponenty `LoadingSpinner`, `NoCardsToReview`, `SessionView` lub `SessionSummary`.
- **Obsługiwane zdarzenia:** Inicjuje pobieranie danych przy załadowaniu komponentu.
- **Typy:** `SessionViewModel` (zarządzany wewnątrz hooka `useReviewSession`).
- **Propsy:** Brak.

### `SessionView`

- **Opis:** Komponent grupujący widok aktywnej sesji, zawierający fiszkę i przyciski do oceny.
- **Główne elementy:** `div` jako kontener. Zawiera komponenty `FlashcardViewer` i `ReviewControls`.
- **Obsługiwane zdarzenia:** Przekazuje zdarzenia z `ReviewControls` (`onRate`) do `SessionPage`.
- **Typy:** `FlashcardDto`.
- **Propsy:**
  - `card: FlashcardDto` - aktualnie wyświetlana fiszka.
  - `isAnswerVisible: boolean` - flaga określająca, czy tył fiszki jest widoczny.
  - `onShowAnswer: () => void` - funkcja do wywołania po kliknięciu "Pokaż odpowiedź".
  - `onRate: (rating: FSRSGrade) => void` - funkcja do oceny fiszki.

### `FlashcardViewer`

- **Opis:** Wyświetla pojedynczą fiszkę (awers i rewers). Początkowo widoczny jest tylko awers.
- **Główne elementy:** Komponent `Card` z `shadcn/ui`. Dwa komponenty `CardContent` dla awersu i rewersu. Przycisk `Button` (`Pokaż odpowiedź`).
- **Obsługiwane interakcje:** Kliknięcie przycisku "Pokaż odpowiedź" odsłania rewers fiszki i przyciski oceny.
- **Typy:** `FlashcardDto`.
- **Propsy:**
  - `card: FlashcardDto`
  - `isAnswerVisible: boolean`
  - `onShowAnswer: () => void`

### `ReviewControls`

- **Opis:** Zestaw przycisków umożliwiających użytkownikowi ocenę, jak dobrze zna odpowiedź na fiszce.
- **Główne elementy:** Kontener `div` z czterema przyciskami `Button` z `shadcn/ui`: "Znowu", "Trudne", "Dobre", "Łatwe".
- **Obsługiwane interakcje:** Kliknięcie dowolnego przycisku wywołuje prop `onRate` z odpowiednią oceną (`FSRSGrade`).
- **Typy:** `FSRSGrade`.
- **Propsy:**
  - `onRate: (rating: FSRSGrade) => void`

### `NoCardsToReview`

- **Opis:** Prosty komponent informacyjny wyświetlany, gdy nie ma żadnych fiszek do powtórzenia na dany dzień.
- **Główne elementy:** Komponent `Card` z komunikatem, np. "Brak fiszek do powtórki na dzisiaj. Wróć jutro!" oraz przycisk `Link` z Next.js odsyłający do strony głównej.
- **Propsy:** Brak.

### `SessionSummary`

- **Opis:** Komponent wyświetlany po zakończeniu sesji, podsumowujący jej przebieg.
- **Główne elementy:** Komponent `Card` z informacją o liczbie powtórzonych fiszek i przyciskiem `Link` odsyłającym do strony głównej.
- **Propsy:**
  - `reviewedCount: number` - liczba fiszek powtórzonych w sesji.

## 5. Typy

### `FSRSGrade`

Nowy typ wyliczeniowy do reprezentowania ocen w algorytmie FSRS.

```typescript
// To be defined, e.g., in src/lib/types.ts
export type FSRSGrade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
```

### `SessionViewModel`

Typ opisujący stan widoku sesji, zarządzany przez hook `useReviewSession`.

```typescript
interface SessionViewModel {
  cardsToReview: FlashcardDto[];
  currentCardIndex: number;
  isAnswerVisible: boolean;
  sessionState: "loading" | "active" | "finished" | "empty" | "error";
  error: string | null;
}
```

- **`cardsToReview`**: Tablica fiszek do przejrzenia w bieżącej sesji.
- **`currentCardIndex`**: Indeks aktualnie wyświetlanej fiszki.
- **`isAnswerVisible`**: Flaga kontrolująca widoczność odpowiedzi.
- **`sessionState`**: Aktualny stan sesji.
- **`error`**: Komunikat błędu w przypadku problemów z API.

## 6. Zarządzanie stanem

Cała logika biznesowa i stan widoku zostaną zamknięte w customowym hooku `useReviewSession`.

### `useReviewSession`

- **Cel:** Abstrakcja logiki sesji nauki, w tym pobieranie danych, obsługa interakcji użytkownika i komunikacja z API.
- **Zwracane wartości i funkcje:**
  - `state: SessionViewModel` - aktualny stan sesji.
  - `currentCard: FlashcardDto | null` - obiekt bieżącej fiszki.
  - `startSession: () => void` - funkcja inicjująca sesję (pobiera fiszki).
  - `showAnswer: () => void` - funkcja pokazująca odpowiedź na fiszce.
  - `rateCard: (rating: FSRSGrade) => Promise<void>` - funkcja do oceny fiszki, która:
    1. Używa biblioteki FSRS do obliczenia nowego stanu fiszki.
    2. Wysyła zaktualizowane dane do API (`PUT /api/flashcards/{id}/review`).
    3. Przechodzi do następnej fiszki lub kończy sesję.

Hook będzie używał `useState` do zarządzania `SessionViewModel` i `useEffect` do uruchomienia `startSession` przy pierwszym renderowaniu.

## 7. Integracja API

### Krok 1: Modyfikacja Backendu

Przed rozpoczęciem prac frontendowych, należy zaktualizować backend, aby umożliwić filtrowanie fiszek po dacie `due`.

1. **Schema Update (`src/lib/schemas/flashcards.ts`)**: Dodaj pole do `flashcardsQueryParamsSchema`:
   ```typescript
   export const flashcardsQueryParamsSchema = z.object({
     // ... existing fields
     due_before: z.string().datetime().optional(),
   });
   ```
2. **Service Update (`src/lib/services/flashcards.service.ts`)**: Zaktualizuj funkcję `listFlashcards`:
   ```typescript
   export async function listFlashcards(...) {
       const { page, limit, sort, order, source, generation_id, due_before } = params; // Add due_before
       // ...
       if (due_before) {
           query = query.lte('due', due_before);
       }
       // ...
   }
   ```

### Krok 2: Wywołania API z Fronendu

- **`GET /api/flashcards`**

  - **Cel:** Pobranie listy fiszek do powtórki.
  - **Użycie:** Wywoływane w hooku `useReviewSession` przy inicjacji sesji.
  - **Query Params:** `due_before={new Date().toISOString()}&limit=50&sort=due&order=asc`
  - **Typ odpowiedzi:** `FlashcardsListResponseDto`

- **`PUT /api/flashcards/{id}/review`**
  - **Cel:** Zapisanie wyniku powtórki dla danej fiszki.
  - **Użycie:** Wywoływane w funkcji `rateCard` w `useReviewSession`.
  - **Typ żądania:** `FlashcardReviewDto`
  - **Typ odpowiedzi:** `FlashcardDto` (zaktualizowana fiszka)

## 8. Interakcje użytkownika

1. **Wejście na stronę `/session`**: Aplikacja pokazuje `LoadingSpinner` i wywołuje `GET /api/flashcards`.
2. **Brak fiszek**: Jeśli API zwraca pustą listę, wyświetlany jest komponent `NoCardsToReview`.
3. **Są fiszki**: Wyświetlany jest `FlashcardViewer` z awersem pierwszej fiszki.
4. **Kliknięcie "Pokaż odpowiedź"**: Rewers fiszki staje się widoczny, a pod fiszką pojawiają się przyciski `ReviewControls`.
5. **Kliknięcie przycisku oceny**:
   - Przyciski stają się nieaktywne.
   - Wywoływane jest `PUT /api/flashcards/{id}/review`.
   - Po pomyślnej odpowiedzi API, ładowana jest kolejna fiszka.
   - Jeśli to ostatnia fiszka, wyświetlany jest `SessionSummary`.
6. **Zakończenie sesji**: Wyświetlany jest `SessionSummary` z podsumowaniem.

## 9. Warunki i walidacja

- **Uwierzytelnienie:** Widok jest dostępny tylko dla zalogowanych użytkowników. Routing (`(auth)` layout) i middleware zapewniają ochronę ścieżki.
- **Stan interfejsu:** Przyciski do oceny (`ReviewControls`) są widoczne dopiero po odsłonięciu odpowiedzi. Są one nieaktywne podczas przetwarzania żądania API.

## 10. Obsługa błędów

- **Błąd pobierania fiszek (`GET`):** Stan sesji zmienia się na `error`. `SessionPage` wyświetla komunikat o błędzie z prośbą o odświeżenie strony.
- **Błąd zapisu oceny (`PUT`):** Wyświetlany jest komunikat błędu (np. za pomocą `sonner` toast) informujący o niepowodzeniu zapisu. Użytkownik może ponowić próbę oceny tej samej fiszki. Aplikacja nie przechodzi do kolejnej fiszki.
- **Brak biblioteki FSRS**: Aplikacja musi mieć zintegrowaną bibliotekę `fsrs.js` lub podobną, aby móc obliczać nowe stany fiszek. Logika w `useReviewSession` powinna to uwzględniać.

## 11. Kroki implementacji

1. **Backend:** Zaimplementować zmiany w `flashcards.ts` i `flashcards.service.ts` w celu dodania filtrowania po `due_before`.
2. **Struktura plików:** Stworzyć plik `src/app/(auth)/session/page.tsx` oraz pliki dla nowych komponentów w `src/components/session/`, np. `SessionView.tsx`, `FlashcardViewer.tsx`, `ReviewControls.tsx`, itd.
3. **Typy:** Dodać typ `FSRSGrade` i `SessionViewModel` (lub podobne) do `src/lib/types.ts`.
4. **Instalacja biblioteki FSRS:** Wybrać i zainstalować bibliotekę do obsługi algorytmu powtórek, np. `ts-fsrs` lub `fsrs.js`.
5. **Custom Hook:** Zaimplementować logikę w `src/hooks/useReviewSession.ts`. Wymaga to integracji z biblioteką FSRS.
6. **Komponenty UI:** Zbudować komponenty `SessionPage`, `SessionView`, `FlashcardViewer`, `ReviewControls`, `NoCardsToReview` i `SessionSummary`, wykorzystując komponenty `shadcn/ui`.
7. **Połączenie logiki z UI:** Zintegrować hook `useReviewSession` z komponentem `SessionPage` w celu zarządzania stanem i renderowania odpowiednich widoków.
8. **Stylowanie:** Dopracować wygląd widoku, dbając o RWD i dostępność (wysoki kontrast, obsługa klawiatury).
