# Plan implementacji widoku – Generowanie Fiszek

## 1. Przegląd

Widok "Generowanie Fiszek" stanowi centralny element aplikacji, umożliwiając użytkownikom transformację dostarczonego tekstu w zestaw propozycji fiszek przy użyciu AI. Użytkownik może przeglądać, edytować, akceptować lub odrzucać wygenerowane propozycje, a następnie zapisać wybrane fiszki w swojej kolekcji. Widok ten ma na celu maksymalne uproszczenie i przyspieszenie procesu tworzenia materiałów do nauki.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką i będzie wymagał autoryzacji użytkownika:

- **Ścieżka:** `/generate`

## 3. Struktura komponentów

Komponenty zostaną zorganizowane w hierarchiczną strukturę, aby zapewnić reużywalność i separację logiki.

```
/app/generate/page.tsx (GenerateView)
└── components/
    ├── flashcard-generation/
    │   ├── GenerationForm.tsx
    │   ├── ProposalsList.tsx
    │   ├── ProposalItem.tsx
    │   └── ProposalItemActions.tsx
    └── ui/ (komponenty shadcn/ui)
        ├── Textarea.tsx
        ├── Button.tsx
        ├── Card.tsx
        ├── Skeleton.tsx
        └── Toast.tsx (via Sonner)
```

## 4. Szczegóły komponentów

### `GenerateView` (Komponent strony)

- **Opis:** Główny kontener dla widoku `/generate`. Zarządza stanem całej strony za pomocą customowego hooka `useFlashcardGeneration` i renderuje podkomponenty: `GenerationForm` oraz `ProposalsList`.
- **Główne elementy:** `GenerationForm`, `ProposalsList`, `Toast` (do wyświetlania globalnych powiadomień).
- **Obsługiwane interakcje:** Brak bezpośrednich; stan i akcje są zarządzane przez hook i przekazywane do dzieci.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `useFlashcardGeneration`
- **Propsy:** Brak.

### `GenerationForm`

- **Opis:** Komponent formularza z polem tekstowym (`Textarea`) do wklejania tekstu źródłowego oraz przyciskiem do inicjowania generowania fiszek. Wyświetla aktualną liczbę znaków i komunikaty walidacyjne.
- **Główne elementy:** `shadcn/Textarea`, `shadcn/Button`, `<p>` do wyświetlania licznika znaków.
- **Obsługiwane interakcje:** Wprowadzanie tekstu, kliknięcie przycisku "Generuj".
- **Obsługiwana walidacja:**
  - Długość tekstu musi mieścić się w przedziale 1000-10000 znaków. Przycisk "Generuj" jest nieaktywny, jeśli warunek nie jest spełniony.
- **Typy:** `GenerateFlashcardsCommand`
- **Propsy:**
  - `sourceText: string`
  - `isLoading: boolean`
  - `onTextChange: (text: string) => void`
  - `onSubmit: () => void`

### `ProposalsList`

- **Opis:** Komponent wyświetlający listę wygenerowanych propozycji fiszek (`ProposalItem`) lub szkielet (`Skeleton`) w trakcie ładowania. Zawiera również przycisk "Zapisz zaakceptowane fiszki".
- **Główne elementy:** Mapa po `ProposalItem`, `shadcn/Button`, `shadcn/Skeleton`.
- **Obsługiwane interakcje:** Kliknięcie przycisku zapisu.
- **Obsługiwana walidacja:** Przycisk "Zapisz" jest nieaktywny, jeśli żadna propozycja nie ma statusu `accepted` lub `edited`.
- **Typy:** `FlashcardProposalViewModel[]`
- **Propsy:**
  - `proposals: FlashcardProposalViewModel[]`
  - `isLoading: boolean`
  - `onUpdate: (id: string, front: string, back: string) => void`
  - `onAccept: (id: string) => void`
  - `onReject: (id: string) => void`
  - `onSaveProposals: () => void`

### `ProposalItem`

- **Opis:** Reprezentuje pojedynczą propozycję fiszki na liście. Posiada dwa stany: widok (tylko do odczytu) i edycja (pola formularza). Zarządza swoim lokalnym stanem edycji.
- **Główne elementy:** `shadcn/Card`, `shadcn/Input` (w trybie edycji), `ProposalItemActions`.
- **Obsługiwane interakcje:** Przełączanie między trybem widoku a edycji.
- **Obsługiwana walidacja:** Pola `front` i `back` w trybie edycji nie mogą być puste.
- **Typy:** `FlashcardProposalViewModel`
- **Propsy:**
  - `proposal: FlashcardProposalViewModel`
  - `onUpdate: (id: string, front: string, back: string) => void`
  - `onAccept: (id:string) => void`
  - `onReject: (id: string) => void`

### `ProposalItemActions`

- **Opis:** Komponent zawierający przyciski akcji dla pojedynczej propozycji (Akceptuj, Edytuj, Odrzuć, Zapisz/Anuluj w trybie edycji).
- **Główne elementy:** `shadcn/Button`.
- **Obsługiwane interakcje:** Kliknięcie poszczególnych przycisków akcji.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:**
  - `isEditing: boolean`
  - `status: 'pending' | 'accepted' | 'rejected' | 'edited'`
  - `onEdit: () => void`
  - `onCancel: () => void`
  - `onSave: () => void`
  - `onAccept: () => void`
  - `onReject: () => void`

## 5. Typy

Do implementacji widoku wymagane będą istniejące typy DTO oraz nowy typ ViewModel.

- **`FlashcardProposalDto` (istniejący):** Reprezentuje propozycję fiszki otrzymaną z API.
  ```typescript
  export interface FlashcardProposalDto {
    id?: string; // DTO z serwera nie ma ID, ale jest opcjonalne
    front: string;
    back: string;
    source: "ai-full" | "ai-edited";
  }
  ```
- **`FlashcardProposalViewModel` (nowy):** Rozszerza DTO o stan UI potrzebny do renderowania i interakcji.
  ```typescript
  export interface FlashcardProposalViewModel extends FlashcardProposalDto {
    id: string; // Unikalny identyfikator po stronie klienta (np. z nanoid)
    status: "pending" | "accepted" | "rejected" | "edited";
  }
  ```
- **`GenerateFlashcardsCommand` (istniejący):** Obiekt wysyłany do `POST /api/generations`.
- **`GenerationCreateResponseDto` (istniejący):** Odpowiedź z `POST /api/generations`.
- **`FlashcardsCreateCommand` (istniejący):** Obiekt wysyłany do `POST /api/flashcards`.

## 6. Zarządzanie stanem

Logika biznesowa i stan widoku zostaną scentralizowane w customowym hooku `useFlashcardGeneration`, co uprości zarządzanie i testowanie.

- **`useFlashcardGeneration`**:
  - **Cel:** Hermetyzacja logiki związanej z generowaniem, modyfikacją i zapisywaniem fiszek.
  - **Zarządzany stan:**
    - `sourceText: string`: Tekst wprowadzany przez użytkownika.
    - `proposals: FlashcardProposalViewModel[]`: Lista propozycji fiszek.
    - `generationId: number | null`: ID bieżącej sesji generowania.
    - `status: 'idle' | 'loading' | 'success' | 'error'`: Ogólny stan procesu.
    - `error: string | null`: Komunikat o błędzie.
  - **Użycie:** `const { state, actions } = useFlashcardGeneration();`
  - **Dostępne akcje:**
    - `handleTextChange(text: string)`
    - `generateFlashcards()`: Wywołuje API generowania.
    - `updateProposal(id: string, front: string, back: string)`
    - `acceptProposal(id: string)`
    - `rejectProposal(id: string)`
    - `saveAcceptedFlashcards()`: Wywołuje API zapisu.

## 7. Integracja API

Integracja będzie obejmować dwa główne wywołania API.

1.  **Generowanie propozycji:**
    - **Endpoint:** `POST /api/generations`
    - **Akcja:** Użytkownik klika "Generuj fiszki".
    - **Request Body:** `GenerateFlashcardsCommand` (`{ source_text: string }`)
    - **Response Body:** `GenerationCreateResponseDto` (`{ generation_id, flashcards_proposals, generated_count }`)
    - **Obsługa:** Hook `useFlashcardGeneration` zapisuje `generation_id` i mapuje `flashcards_proposals` na `FlashcardProposalViewModel[]`.

2.  **Zapisywanie zaakceptowanych fiszek:**
    - **Endpoint:** `POST /api/flashcards`
    - **Akcja:** Użytkownik klika "Zapisz zaakceptowane fiszki".
    - **Request Body:** `FlashcardsCreateCommand` (`{ flashcards: FlashcardCreateDto[] }`)
    - **Logika:** Hook filtruje propozycje ze statusem `accepted` lub `edited`, mapuje je do formatu `FlashcardCreateDto`, ustawiając `source` (`ai-full` lub `ai-edited`) i `generation_id`.
    - **Response Body:** `{ flashcards: Flashcard[] }`

## 8. Interakcje użytkownika

- **Wprowadzanie tekstu:** Użytkownik wpisuje tekst w `Textarea`. Interfejs na bieżąco aktualizuje licznik znaków.
- **Generowanie fiszek:** Kliknięcie "Generuj" blokuje formularz, wyświetla wskaźnik ładowania (`Skeleton`) i po zakończeniu operacji renderuje listę propozycji.
- **Akceptacja propozycji:** Kliknięcie "Akceptuj" zmienia styl wizualny elementu i jego status na `accepted`.
- **Odrzucenie propozycji:** Kliknięcie "Odrzuć" wizualnie "wyszarza" element i zmienia jego status na `rejected`.
- **Edycja propozycji:** Kliknięcie "Edytuj" przełącza element w tryb edycji z polami `Input`. Zapisanie zmian aktualizuje treść i zmienia status na `edited`.
- **Zapisywanie fiszek:** Kliknięcie "Zapisz zaakceptowane" wysyła odpowiednie propozycje do API i po sukcesie wyświetla komunikat `Toast`.

## 9. Warunki i walidacja

- **`GenerationForm`:** Przycisk "Generuj" jest aktywny tylko gdy `sourceText.length` jest w zakresie 1000-10000. Komunikat inline informuje użytkownika o wymaganiach.
- **`ProposalsList`:** Przycisk "Zapisz" jest aktywny tylko wtedy, gdy co najmniej jedna propozycja ma status `accepted` lub `edited`.
- **`ProposalItem`:** Podczas edycji, przycisk zapisu zmian jest aktywny tylko wtedy, gdy oba pola (`front`, `back`) nie są puste.

## 10. Obsługa błędów

- **Błędy walidacji (klient):** Komunikaty wyświetlane są inline, blisko pól, których dotyczą (np. pod `Textarea`).
- **Błędy API (`POST /generations`):** W przypadku błędu (np. z serwisu AI), pod formularzem wyświetlany jest globalny komunikat o błędzie, a w `Toast` pojawia się szczegółowa informacja.
- **Błędy API (`POST /flashcards`):** Błędy zapisu (np. błąd walidacji po stronie serwera) są komunikowane za pomocą `Toast`.
- **Przypadki brzegowe:**
  - Brak propozycji od AI: Wyświetlany jest komunikat "AI nie wygenerowało żadnych propozycji dla podanego tekstu. Spróbuj z innym fragmentem."
  - Utrata sesji: Middleware `auth` powinno przekierować na stronę logowania.

## 11. Kroki implementacji

1.  **Struktura plików:** Utwórz pliki dla nowych komponentów w katalogu `src/components/flashcard-generation/` oraz plik strony `/app/generate/page.tsx`.
2.  **Typy:** Zdefiniuj typ `FlashcardProposalViewModel` w `src/lib/types.ts`.
3.  **Komponenty UI (bottom-up):**
    - Zaimplementuj `ProposalItemActions`, `ProposalItem`, `ProposalsList` i `GenerationForm`, używając komponentów `shadcn/ui`. Na tym etapie przekaż statyczne dane (propsy).
4.  **Custom Hook:** Stwórz hook `useFlashcardGeneration`, implementując logikę zarządzania stanem (użyj `useReducer` dla złożoności) i puste funkcje dla akcji API.
5.  **Połączenie komponentów i hooka:**
    - W `GenerateView` użyj hooka `useFlashcardGeneration`.
    - Połącz stan i akcje z hooka z propsami komponentów potomnych.
6.  **Integracja API:**
    - Zaimplementuj logikę wywołań `fetch` do endpointów `/api/generations` i `/api/flashcards` wewnątrz akcji hooka `useFlashcardGeneration`.
    - Dodaj obsługę stanów ładowania.
7.  **Obsługa błędów i powiadomień:** Zintegruj system powiadomień (np. `sonner`) do wyświetlania komunikatów o sukcesie i błędach operacji API.
8.  **Stylowanie i UX:** Dopracuj stylowanie, animacje (np. pojawianie się listy), responsywność oraz komunikaty dla użytkownika.
9.  **Testowanie:** Przeprowadź manualne testy wszystkich historyjek użytkownika (US-003, US-004) i przypadków brzegowych.
