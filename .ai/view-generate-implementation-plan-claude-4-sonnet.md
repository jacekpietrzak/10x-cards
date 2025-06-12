# Plan implementacji widoku generowania fiszek

## 1. Przegląd

Widok generowania fiszek umożliwia użytkownikom wklejenie tekstu źródłowego i automatyczne wygenerowanie propozycji fiszek przy użyciu sztucznej inteligencji. Użytkownicy mogą następnie przeglądać, edytować i selektywnie zapisywać wygenerowane propozycje do swojej kolekcji fiszek. Widok jest kluczowym elementem aplikacji 10x-cards, realizując główny cel produktu - przyspieszenie procesu tworzenia fiszek edukacyjnych.

## 2. Routing widoku

**Ścieżka:** `/generate`

Widok będzie dostępny pod adresem `/generate` i wymagać będzie autoryzacji użytkownika (middleware sprawdzający sesję).

## 3. Struktura komponentów

```
src/app/generate/
├── page.tsx                    # Główna strona widoku
└── components/
    ├── GenerateView.tsx        # Główny kontener widoku
    ├── TextInputForm.tsx       # Formularz wprowadzania tekstu
    ├── FlashcardProposalsList.tsx  # Lista propozycji fiszek
    ├── FlashcardProposal.tsx   # Pojedyncza propozycja fiszki
    ├── ActionsPanel.tsx        # Panel akcji masowych
    └── LoadingState.tsx        # Komponent stanu ładowania
```

## 4. Szczegóły komponentów

### GenerateView

- **Opis komponentu:** Główny kontener widoku zarządzający całym stanem procesu generowania fiszek. Koordynuje przepływ między formularzem wprowadzania tekstu, generowaniem propozycji i ich zapisywaniem.
- **Główne elementy:** Container div, TextInputForm, conditional rendering dla LoadingState, FlashcardProposalsList w zależności od aktualnego stanu procesu.
- **Obsługiwane interakcje:**
  - Inicjalizacja widoku
  - Obsługa zmiany stanu między krokami procesu
  - Koordinacja komunikacji między komponentami potomnymi
- **Obsługiwana walidacja:**
  - Sprawdzenie autoryzacji użytkownika
  - Walidacja dostępności API
  - Ogólna walidacja stanu aplikacji
- **Typy:** `GenerationViewState`, `FlashcardProposalViewModel[]`, `ApiError`
- **Propsy:** Brak (główny komponent widoku)

### TextInputForm

- **Opis komponentu:** Formularz do wprowadzania tekstu źródłowego z walidacją długości i przyciskiem generowania. Zawiera licznik znaków i komunikaty walidacyjne.
- **Główne elementy:**
  - Textarea (shadcn/ui) dla wprowadzania tekstu
  - Label z instrukcjami
  - CharacterCounter pokazujący aktualne/wymagane znaki
  - Button (shadcn/ui) do generowania
  - ErrorMessage dla błędów walidacji
- **Obsługiwane interakcje:**
  - onChange tekstu z live walidacją
  - onSubmit wywołujący generowanie
  - Paste handling z automatyczną walidacją
- **Obsługiwana walidacja:**
  - Minimalna długość tekstu: 1000 znaków
  - Maksymalna długość tekstu: 10000 znaków
  - Walidacja czy pole nie jest puste
  - Real-time feedback podczas wpisywania
- **Typy:** `GenerateFlashcardsCommand`, `TextValidationState`, `FormErrors`
- **Propsy:**
  ```typescript
  interface TextInputFormProps {
    onGenerate: (command: GenerateFlashcardsCommand) => Promise<void>;
    isLoading: boolean;
    error?: string;
    initialValue?: string;
  }
  ```

### FlashcardProposal

- **Opis komponentu:** Pojedyncza propozycja fiszki z możliwością edycji przodu i tyłu, zaznaczania do zapisu oraz odrzucania. Zawiera inline walidację edytowanych pól.
- **Główne elementy:**
  - Card (shadcn/ui) jako kontener
  - Checkbox do selekcji
  - EditableText dla przodu fiszki
  - EditableText dla tyłu fiszki
  - ActionButtons (Edit, Reject, Undo)
  - ValidationMessages pod polami
- **Obsługiwane interakcje:**
  - onToggleSelect - zmiana stanu selekcji
  - onEdit - włączenie/wyłączenie trybu edycji
  - onSave - zapisanie zmian
  - onReject - odrzucenie propozycji
  - onUndo - cofnięcie zmian
- **Obsługiwana walidacja:**
  - Przód fiszki: maksymalnie 200 znaków, pole wymagane
  - Tył fiszki: maksymalnie 500 znaków, pole wymagane
  - Sprawdzenie czy wprowadzono zmiany przed zapisem
  - Walidacja w czasie rzeczywistym podczas edycji
- **Typy:** `FlashcardProposalViewModel`, `ValidationErrors`, `EditMode`
- **Propsy:**
  ```typescript
  interface FlashcardProposalProps {
    proposal: FlashcardProposalViewModel;
    onUpdate: (
      id: string,
      updates: Partial<FlashcardProposalViewModel>
    ) => void;
    onToggleSelect: (id: string) => void;
    isSelected: boolean;
  }
  ```

### FlashcardProposalsList

- **Opis komponentu:** Lista wszystkich wygenerowanych propozycji fiszek z funkcjonalnością selekcji masowej i zarządzania grupowego. Zawiera podsumowanie stanu selekcji.
- **Główne elementy:**
  - Container dla listy
  - Header z opcjami "Select All" / "Deselect All"
  - SelectionSummary pokazujące liczbę wybranych elementów
  - Mapa komponentów FlashcardProposal
  - ActionsPanel na dole listy
- **Obsługiwane interakcje:**
  - onSelectAll - zaznaczenie wszystkich propozycji
  - onDeselectAll - odznaczenie wszystkich propozycji
  - onUpdateProposal - aktualizacja pojedynczej propozycji
  - onBulkAction - akcje masowe
- **Obsługiwana walidacja:**
  - Sprawdzenie czy lista nie jest pusta
  - Walidacja czy przynajmniej jedna propozycja jest wybrana do zapisu
  - Sprawdzenie poprawności wszystkich wybranych propozycji
- **Typy:** `FlashcardProposalViewModel[]`, `SelectionState`, `BulkActionType`
- **Propsy:**
  ```typescript
  interface FlashcardProposalsListProps {
    proposals: FlashcardProposalViewModel[];
    onUpdateProposal: (
      id: string,
      updates: Partial<FlashcardProposalViewModel>
    ) => void;
    onSaveSelected: () => Promise<void>;
    onSaveAll: () => Promise<void>;
    isLoading: boolean;
  }
  ```

### ActionsPanel

- **Opis komponentu:** Panel z przyciskami akcji masowych umożliwiający zapisanie wszystkich lub tylko wybranych propozycji. Pokazuje liczbę wybranych elementów i pozwala na szybkie akcje.
- **Główne elementy:**
  - Container z przyciskami
  - Button "Zapisz wszystkie" (shadcn/ui)
  - Button "Zapisz wybrane" (shadcn/ui)
  - SelectionCounter pokazujący liczbę wybranych
  - LoadingSpinner podczas zapisywania
- **Obsługiwane interakcje:**
  - onSaveAll - zapisanie wszystkich poprawnych propozycji
  - onSaveSelected - zapisanie tylko wybranych propozycji
  - onClear - wyczyszczenie selekcji
- **Obsługiwana walidacja:**
  - Sprawdzenie czy są propozycje do zapisania
  - Walidacja czy wybrane propozycje są poprawne
  - Blokowanie akcji podczas procesu zapisywania
- **Typy:** `ActionsPanelState`, `SaveMode`, `SelectionSummary`
- **Propsy:**
  ```typescript
  interface ActionsPanelProps {
    selectedCount: number;
    totalCount: number;
    onSaveAll: () => Promise<void>;
    onSaveSelected: () => Promise<void>;
    isLoading: boolean;
    disabled: boolean;
  }
  ```

## 5. Typy

### FlashcardProposalViewModel

```typescript
interface FlashcardProposalViewModel {
  id: string; // temporary client-side ID
  front: string;
  back: string;
  source: "ai-full" | "ai-edited";
  isSelected: boolean;
  isEdited: boolean;
  isRejected: boolean;
  originalFront: string; // do undo functionality
  originalBack: string;
  validationErrors?: {
    front?: string;
    back?: string;
  };
}
```

### GenerationViewState

```typescript
interface GenerationViewState {
  step: "input" | "generating" | "reviewing" | "saving" | "completed";
  sourceText: string;
  characterCount: number;
  generationId?: number;
  proposals: FlashcardProposalViewModel[];
  selectedProposalIds: Set<string>;
  errors: {
    generation?: string;
    saving?: string;
    validation?: string;
  };
  isLoading: boolean;
  saveMode?: "all" | "selected";
}
```

### TextValidationState

```typescript
interface TextValidationState {
  isValid: boolean;
  characterCount: number;
  errors: {
    tooShort?: boolean;
    tooLong?: boolean;
    empty?: boolean;
  };
}
```

### GenerationApiResponse

```typescript
interface GenerationApiResponse {
  generation_id: number;
  flashcards_proposals: FlashcardProposalDto[];
  generated_count: number;
}
```

## 6. Zarządzanie stanem

Widok będzie używać kombinacji lokalnego stanu React (`useState`) oraz custom hooka `useGeneration` do zarządzania złożonym stanem procesu generowania.

### Custom Hook: useGeneration

```typescript
const useGeneration = () => {
  const [state, setState] = useState<GenerationViewState>(initialState);

  const generateFlashcards = async (command: GenerateFlashcardsCommand) => {
    // Logika generowania z obsługą błędów
  };

  const saveFlashcards = async (mode: "all" | "selected") => {
    // Logika zapisywania z walidacją
  };

  const updateProposal = (
    id: string,
    updates: Partial<FlashcardProposalViewModel>
  ) => {
    // Aktualizacja pojedynczej propozycji
  };

  return {
    state,
    generateFlashcards,
    saveFlashcards,
    updateProposal,
    // inne pomocnicze funkcje
  };
};
```

Stan będzie zarządzany centralnie w komponencie `GenerateView` i przekazywany w dół przez props do komponentów potomnych.

## 7. Integracja API

### POST /api/generations

**Typ żądania:** `GenerateFlashcardsCommand`

```typescript
{
  source_text: string; // 1000-10000 znaków
}
```

**Typ odpowiedzi:** `GenerationCreateResponseDto`

```typescript
{
  generation_id: number;
  flashcards_proposals: FlashcardProposalDto[];
  generated_count: number;
}
```

### POST /api/flashcards

**Typ żądania:** `FlashcardsCreateCommand`

```typescript
{
  flashcards: FlashcardCreateDto[];
}
```

**Typ odpowiedzi:** Tablica utworzonych `FlashcardDto`

### Obsługa błędów API:

- 400: Błędy walidacji - wyświetlenie komunikatów pod formularzem
- 500: Błędy serwera - ogólny komunikat o błędzie z możliwością ponowienia
- Network errors: Komunikat o problemach z połączeniem

## 8. Interakcje użytkownika

### Wprowadzanie tekstu:

1. Użytkownik wkleja/wpisuje tekst w textarea
2. Real-time walidacja długości z wizualnym feedbackiem
3. Licznik znaków aktualizuje się na bieżąco
4. Przycisk "Generuj" aktywuje się gdy tekst spełnia wymagania

### Generowanie propozycji:

1. Kliknięcie "Generuj" → loading state z skeleton
2. Wywołanie API → obsługa błędów lub sukcesu
3. Wyświetlenie listy propozycji z domyślną selekcją wszystkich

### Zarządzanie propozycjami:

1. Kliknięcie checkbox → toggle selekcji
2. Dwuklik na tekst → włączenie trybu edycji
3. Edycja → real-time walidacja → zapisanie/anulowanie
4. Przycisk "Odrzuć" → usunięcie z listy

### Zapisywanie:

1. "Zapisz wszystkie" → walidacja → API call → komunikat sukcesu
2. "Zapisz wybrane" → sprawdzenie selekcji → API call → komunikat sukcesu

## 9. Warunki i walidacja

### Walidacja tekstu źródłowego (TextInputForm):

- **Minimalna długość:** 1000 znaków - komunikat "Tekst musi mieć co najmniej 1000 znaków"
- **Maksymalna długość:** 10000 znaków - komunikat "Tekst nie może przekraczać 10000 znaków"
- **Pole wymagane:** Nie może być puste - komunikat "Pole tekstowe jest wymagane"
- **Wpływ na UI:** Dezaktywacja przycisku "Generuj" gdy walidacja nie przechodzi

### Walidacja propozycji fiszek (FlashcardProposal):

- **Przód fiszki:** Maksymalnie 200 znaków, pole wymagane
- **Tył fiszki:** Maksymalnie 500 znaków, pole wymagane
- **Wpływ na UI:** Czerwone obramowanie pól z błędami, komunikaty pod polami, blokowanie możliwości zapisu niepoprawnych propozycji

### Walidacja akcji masowych (ActionsPanel):

- **Zapisz wybrane:** Przynajmniej jedna propozycja musi być wybrana
- **Wszystkie propozycje:** Muszą być poprawne według walidacji API
- **Wpływ na UI:** Dezaktywacja przycisków gdy warunki nie są spełnione

## 10. Obsługa błędów

### Błędy generowania (API /generations):

- **Błędy walidacji (400):** Wyświetlenie konkretnych komunikatów pod formularzem
- **Błędy serwera (500):** Komunikat "Wystąpił problem z generowaniem fiszek. Spróbuj ponownie."
- **Błędy sieci:** "Sprawdź połączenie internetowe i spróbuj ponownie"
- **Timeout:** "Generowanie trwa dłużej niż zwykle. Spróbuj ponownie."

### Błędy zapisywania (API /flashcards):

- **Błędy walidacji:** Wyświetlenie błędów przy konkretnych fiszkach
- **Błędy serwera:** "Nie udało się zapisać fiszek. Spróbuj ponownie."
- **Częściowy sukces:** Komunikat o liczbie zapisanych vs. błędnych fiszek

### Obsługa błędów krytycznych:

- **Brak autoryzacji:** Przekierowanie do strony logowania
- **Błędy aplikacji:** Fallback UI z opcją powrotu do głównej strony

### Mechanizmy recovery:

- Przyciski "Spróbuj ponownie" przy błędach
- Zapisywanie draftu tekstu w localStorage
- Możliwość kontynuacji po błędach sieciowych

## 11. Kroki implementacji

1. **Przygotowanie struktury plików**

   - Utworzenie katalogu `src/app/generate/`
   - Dodanie pliku `page.tsx` z podstawowym layoutem
   - Utworzenie katalogu `components/` dla komponentów widoku

2. **Implementacja typów i interfejsów**

   - Dodanie nowych typów do `src/lib/types.ts`
   - Utworzenie `FlashcardProposalViewModel` i `GenerationViewState`
   - Definicja interfejsów props dla wszystkich komponentów

3. **Utworzenie custom hooka useGeneration**

   - Implementacja stanu procesu generowania
   - Dodanie funkcji `generateFlashcards` z obsługą API
   - Implementacja `saveFlashcards` z walidacją
   - Dodanie funkcji pomocniczych do zarządzania stanem

4. **Implementacja TextInputForm**

   - Komponent textarea z walidacją real-time
   - Licznik znaków z wizualnym feedbackiem
   - Integracja z useGeneration hook
   - Dodanie obsługi błędów i stanów ładowania

5. **Utworzenie FlashcardProposal**

   - Komponent karty pojedynczej propozycji
   - Implementacja trybu edycji z walidacją
   - Dodanie funkcjonalności selekcji i odrzucania
   - Integracja z shadcn/ui komponentami

6. **Implementacja FlashcardProposalsList**

   - Kontener dla listy propozycji
   - Funkcjonalność selekcji masowej
   - Licznik i podsumowanie wybranych elementów
   - Integracja z ActionsPanel

7. **Utworzenie ActionsPanel**

   - Przyciski akcji masowych
   - Logika zapisywania wybranych/wszystkich
   - Obsługa stanów ładowania i błędów
   - Walidacja dostępności akcji

8. **Implementacja GenerateView**

   - Główny kontener z zarządzaniem stanem
   - Integracja wszystkich komponentów potomnych
   - Obsługa przepływu między krokami procesu
   - Dodanie loading states i error boundaries

9. **Dodanie styli i responsywności**

   - Stylowanie komponentów z Tailwind CSS
   - Implementacja responsywnego layoutu
   - Dodanie animacji i transitions
   - Testowanie na różnych urządzeniach

10. **Testowanie i optymalizacja**

    - Testy jednostkowe komponentów
    - Testy integracyjne przepływu użytkownika
    - Optymalizacja wydajności
    - Validacja accessibility requirements

11. **Finalizacja i dokumentacja**
    - Code review i refaktoring
    - Dodanie dokumentacji komponentów
    - Przygotowanie do merge z główną gałęzią
    - Testy end-to-end na środowisku staging
