# Plan implementacji widoku Moje fiszki

## 1. Przegląd

Widok "Moje fiszki" jest głównym interfejsem do zarządzania kolekcją fiszek użytkownika. Umożliwia przeglądanie zapisanych fiszek w formie listy z paginacją, edycję istniejących fiszek poprzez modal, usuwanie fiszek z potwierdzeniem oraz dodawanie nowych fiszek ręcznie. Widok obsługuje fiszki pochodzące z różnych źródeł: ręcznie utworzone, wygenerowane przez AI (niemodyfikowane) oraz wygenerowane przez AI i następnie edytowane.

## 2. Routing widoku

**Ścieżka:** `/flashcards`
**Typ:** Chroniona strona (wymaga uwierzytelnienia)
**Layout:** Główny layout aplikacji z nawigacją

## 3. Struktura komponentów

```
FlashcardsPage (src/app/(auth)/flashcards/page.tsx)
├── PageHeader
│   └── CreateFlashcardButton
├── FlashcardsList
│   └── FlashcardItem[] (dla każdej fiszki)
│       ├── FlashcardContent
│       └── FlashcardActions (Edit, Delete)
├── Pagination
├── LoadingSpinner
├── EmptyState
└── Modals
    ├── CreateFlashcardModal
    ├── EditFlashcardModal
    └── ConfirmDeleteModal
```

## 4. Szczegóły komponentów

### FlashcardsPage

- **Opis:** Główny komponent strony zarządzający stanem całego widoku i orkiestrujący komunikację między komponentami potomnymi
- **Główne elementy:** Container, nagłówek strony, lista fiszek, paginacja, modale
- **Obsługiwane interakcje:** Inicjalizacja strony, zarządzanie stanem modali, obsługa CRUD operacji
- **Obsługiwana walidacja:** Walidacja uprawnień użytkownika, sprawdzanie stanu ładowania
- **Typy:** FlashcardsPageState, PaginationDto, FlashcardDto[]
- **Propsy:** Brak (strona główna)

### FlashcardsList

- **Opis:** Komponent odpowiedzialny za renderowanie listy fiszek z obsługą stanów pustej listy i ładowania
- **Główne elementy:** Lista (ul/div), FlashcardItem dla każdej fiszki, EmptyState gdy brak fiszek
- **Obsługiwane interakcje:** Przekazywanie zdarzeń edycji i usuwania do komponentów nadrzędnych
- **Obsługiwana walidacja:** Sprawdzanie czy lista nie jest pusta
- **Typy:** FlashcardDto[], funkcje callback
- **Propsy:** `flashcards: FlashcardDto[]`, `onEdit: (flashcard: FlashcardDto) => void`, `onDelete: (flashcard: FlashcardDto) => void`, `loading: boolean`

### FlashcardItem

- **Opis:** Komponent reprezentujący pojedynczą fiszkę na liście z jej zawartością i akcjami
- **Główne elementy:** Card/div container, tekst przodu i tyłu fiszki, przyciski akcji (Edit, Delete), badge źródła
- **Obsługiwane interakcje:** Kliknięcie przycisku edycji, kliknięcie przycisku usuwania
- **Obsługiwana walidacja:** Sprawdzanie uprawnień do edycji/usuwania
- **Typy:** FlashcardDto, funkcje callback
- **Propsy:** `flashcard: FlashcardDto`, `onEdit: () => void`, `onDelete: () => void`

### CreateFlashcardModal

- **Opis:** Modal z formularzem do tworzenia nowej fiszki ręcznie
- **Główne elementy:** Modal overlay, formularz z polami "Przód" i "Tył", przyciski "Zapisz" i "Anuluj"
- **Obsługiwane interakcje:** Wypełnianie formularza, submit, anulowanie
- **Obsługiwana walidacja:** front max 200 znaków, back max 500 znaków, oba pola wymagane
- **Typy:** FlashcardCreateDto, funkcje callback, stan formularza
- **Propsy:** `isOpen: boolean`, `onClose: () => void`, `onSave: (flashcard: FlashcardCreateDto) => Promise<void>`

### EditFlashcardModal

- **Opis:** Modal z formularzem do edycji istniejącej fiszki
- **Główne elementy:** Modal overlay, pre-wypełniony formularz, przyciski "Zapisz" i "Anuluj"
- **Obsługiwane interakcje:** Modyfikacja pól, submit z aktualizacją, anulowanie
- **Obsługiwana walidacja:** front max 200 znaków, back max 500 znaków, oba pola wymagane
- **Typy:** FlashcardDto, FlashcardUpdateDto, funkcje callback
- **Propsy:** `isOpen: boolean`, `flashcard: FlashcardDto | null`, `onClose: () => void`, `onSave: (id: number, updates: FlashcardUpdateDto) => Promise<void>`

### ConfirmDeleteModal

- **Opis:** Modal potwierdzający usunięcie fiszki z wyświetleniem jej tytułu
- **Główne elementy:** Modal overlay, tekst potwierdzenia, przyciski "Usuń" i "Anuluj"
- **Obsługiwane interakcje:** Potwierdzenie usunięcia, anulowanie
- **Obsługiwana walidacja:** Sprawdzenie czy fiszka została wybrana
- **Typy:** FlashcardDto, funkcje callback
- **Propsy:** `isOpen: boolean`, `flashcard: FlashcardDto | null`, `onClose: () => void`, `onConfirm: (id: number) => Promise<void>`

### Pagination

- **Opis:** Komponent nawigacji po stronach listy fiszek
- **Główne elementy:** Przyciski Previous/Next, numery stron, informacja o aktualnej stronie
- **Obsługiwane interakcje:** Zmiana strony, przejście do pierwszej/ostatniej strony
- **Obsługiwana walidacja:** Sprawdzenie granic paginacji
- **Typy:** PaginationDto, funkcja callback
- **Propsy:** `pagination: PaginationDto`, `onPageChange: (page: number) => void`

## 5. Typy

### Istniejące typy (z src/lib/types.ts):

```typescript
// Używane bezpośrednio
FlashcardDto, FlashcardsListResponseDto, PaginationDto;
FlashcardCreateDto, FlashcardUpdateDto, Source;
```

### Nowe typy wymagane:

```typescript
// Stan strony fiszek
interface FlashcardsPageState {
  flashcards: FlashcardDto[];
  pagination: PaginationDto;
  loading: boolean;
  error: string | null;
}

// Stan modala tworzenia
interface CreateModalState {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
}

// Stan modala edycji
interface EditModalState {
  isOpen: boolean;
  flashcard: FlashcardDto | null;
  loading: boolean;
  error: string | null;
}

// Stan modala usuwania
interface DeleteModalState {
  isOpen: boolean;
  flashcard: FlashcardDto | null;
  loading: boolean;
}

// Formularz tworzenia fiszki
interface CreateFlashcardForm {
  front: string;
  back: string;
}

// Formularz edycji fiszki
interface EditFlashcardForm {
  front: string;
  back: string;
}

// Parametry zapytania dla listy fiszek
interface FlashcardsQueryParams {
  page: number;
  limit: number;
  sort?: string;
  order?: "asc" | "desc";
  source?: Source;
  generation_id?: number;
}
```

## 6. Zarządzanie stanem

### Custom Hook: useFlashcards

Centralny hook zarządzający stanem fiszek i operacjami CRUD:

```typescript
const useFlashcards = () => {
  // Stan główny
  const [state, setState] = useState<FlashcardsPageState>({
    flashcards: [],
    pagination: { page: 1, limit: 10, total: 0 },
    loading: false,
    error: null
  });

  // Stany modali
  const [createModal, setCreateModal] = useState<CreateModalState>({
    isOpen: false,
    loading: false,
    error: null
  });

  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    flashcard: null,
    loading: false,
    error: null
  });

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    flashcard: null,
    loading: false
  });

  // Funkcje API
  const fetchFlashcards = async (params: FlashcardsQueryParams) => { ... };
  const createFlashcard = async (data: FlashcardCreateDto) => { ... };
  const updateFlashcard = async (id: number, data: FlashcardUpdateDto) => { ... };
  const deleteFlashcard = async (id: number) => { ... };

  return {
    state,
    createModal,
    editModal,
    deleteModal,
    actions: {
      fetchFlashcards,
      createFlashcard,
      updateFlashcard,
      deleteFlashcard,
      openCreateModal,
      closeCreateModal,
      openEditModal,
      closeEditModal,
      openDeleteModal,
      closeDeleteModal
    }
  };
};
```

### Strategia aktualizacji stanu

- **Optimistic updates** dla operacji edycji (błyskawiczne UI)
- **Refetch** po operacjach tworzenia i usuwania dla spójności
- **Loading states** dla wszystkich async operacji
- **Error states** z możliwością retry

## 7. Integracja API

### GET /api/flashcards

**Żądanie:** Query params z paginacją i filtrami
**Odpowiedź:** `FlashcardsListResponseDto`
**Użycie:** Pobieranie listy fiszek przy inicjalizacji i zmianie strony

### POST /api/flashcards

**Żądanie:** `{ flashcards: [FlashcardCreateDto] }`
**Odpowiedź:** `{ flashcards: FlashcardDto[] }`
**Użycie:** Tworzenie nowej fiszki ręcznie (source: "manual", generation_id: null)

### PUT /api/flashcards/{id}

**Żądanie:** `FlashcardUpdateDto` (partial update)
**Odpowiedź:** `FlashcardDto` (zaktualizowana fiszka)
**Użycie:** Edycja istniejącej fiszki (zmiana source na "ai-edited" jeśli była "ai-full")

### DELETE /api/flashcards/{id}

**Żądanie:** Brak body
**Odpowiedź:** `{ message: string }`
**Użycie:** Usuwanie fiszki po potwierdzeniu

## 8. Interakcje użytkownika

### Przeglądanie fiszek

- **Akcja:** Wejście na stronę `/flashcards`
- **Rezultat:** Automatyczne załadowanie pierwszej strony fiszek
- **Loading state:** Spinner podczas ładowania
- **Error state:** Komunikat błędu z opcją retry

### Dodawanie nowej fiszki

- **Akcja:** Klik przycisku "Dodaj fiszkę"
- **Rezultat:** Otwarcie CreateFlashcardModal
- **Submit:** Walidacja → API call → aktualizacja listy → zamknięcie modala
- **Cancel:** Zamknięcie modala bez zapisywania

### Edycja fiszki

- **Akcja:** Klik przycisku "Edytuj" przy fiszce
- **Rezultat:** Otwarcie EditFlashcardModal z pre-wypełnionymi danymi
- **Submit:** Walidacja → API call → optimistic update → zamknięcie modala
- **Cancel:** Zamknięcie modala, revert zmian jeśli optimistic update

### Usuwanie fiszki

- **Akcja:** Klik przycisku "Usuń" przy fiszce
- **Rezultat:** Otwarcie ConfirmDeleteModal z nazwą fiszki
- **Confirm:** API call → usunięcie z listy → zamknięcie modala
- **Cancel:** Zamknięcie modala bez usuwania

### Nawigacja stronami

- **Akcja:** Klik numeru strony lub Previous/Next
- **Rezultat:** Fetch nowej strony z API → aktualizacja listy i paginacji

## 9. Warunki i walidacja

### Walidacja formularzy (CreateFlashcardModal, EditFlashcardModal)

- **front:** Wymagane, max 200 znaków, min 1 znak
- **back:** Wymagane, max 500 znaków, min 1 znak
- **Komunikaty błędów:** Wyświetlane pod polami w czasie rzeczywistym
- **Blokada submit:** Przycisk "Zapisz" nieaktywny przy błędach walidacji

### Walidacja autoryzacji

- **Komponent:** Cała strona
- **Warunek:** Użytkownik musi być zalogowany
- **Rezultat:** Przekierowanie na stronę logowania jeśli brak sesji

### Walidacja operacji CRUD

- **Edit/Delete:** Sprawdzenie czy fiszka należy do użytkownika (obsługiwane przez API)
- **Create:** Sprawdzenie czy źródło to "manual" i generation_id to null
- **Rezultat:** Komunikaty błędów z API wyświetlane w modalach

### Walidacja stanu UI

- **Pusta lista:** Wyświetlenie EmptyState z komunikatem i przyciskiem dodania
- **Loading:** Wyświetlenie LoadingSpinner zamiast listy
- **Error:** Wyświetlenie komunikatu błędu z przyciskiem retry
- **Paginacja:** Ukrycie gdy total <= limit

## 10. Obsługa błędów

### Błędy sieciowe

- **Scenariusz:** Brak połączenia z API
- **Obsługa:** Toast notification + opcja retry
- **UI:** Przycisk "Spróbuj ponownie"

### Błędy walidacji (400)

- **Scenariusz:** Nieprawidłowe dane w formularzu
- **Obsługa:** Wyświetlenie szczegółowych błędów pod polami
- **UI:** Czerwone obramowanie pól + komunikaty błędów

### Błędy autoryzacji (401)

- **Scenariusz:** Wygaśnięta sesja
- **Obsługa:** Automatyczne przekierowanie na stronę logowania
- **UI:** Toast "Sesja wygasła, zaloguj się ponownie"

### Błędy nie znaleziono (404)

- **Scenariusz:** Fiszka została usunięta przez inny proces
- **Obsługa:** Odświeżenie listy + komunikat
- **UI:** Toast "Fiszka nie istnieje, lista została odświeżona"

### Błędy serwera (500)

- **Scenariusz:** Błąd po stronie serwera
- **Obsługa:** Komunikat ogólny + opcja retry
- **UI:** Toast "Wystąpił błąd serwera, spróbuj ponownie"

### Timeout

- **Scenariusz:** Długi czas odpowiedzi API
- **Obsługa:** Loading state + timeout po 30s
- **UI:** Komunikat "Operacja trwa dłużej niż oczekiwano"

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

- Utworzenie `src/app/(auth)/flashcards/page.tsx`
- Utworzenie `src/components/flashcard-management/` directory
- Przygotowanie typów w `src/lib/types/flashcards.ts`

### Krok 2: Implementacja custom hook useFlashcards

- Stan główny i stany modali
- Funkcje API calls z error handling
- Funkcje zarządzania modalami
- Logika optimistic updates

### Krok 3: Implementacja komponentów UI (bottom-up)

- `FlashcardItem` - podstawowy element listy
- `FlashcardsList` - lista z obsługą stanów
- `Pagination` - nawigacja po stronach
- `EmptyState` i `LoadingSpinner` - stany pomocnicze

### Krok 4: Implementacja modali

- `CreateFlashcardModal` - formularz + walidacja
- `EditFlashcardModal` - formularz z pre-fill
- `ConfirmDeleteModal` - potwierdzenie

### Krok 5: Integracja głównej strony

- `FlashcardsPage` - połączenie wszystkich komponentów
- Integration z useFlashcards hook
- Obsługa error boundaries

### Krok 6: Stylowanie i responsywność

- Tailwind classes dla wszystkich komponentów
- Mobile-first approach
- Dark mode support (jeśli wymagany)
- Accessibility (ARIA labels, keyboard navigation)

### Krok 7: Testy i optymalizacja

- Unit testy dla hook i komponentów
- Integration testy dla CRUD operacji
- Performance optimization (memo, callback optimization)
- Error scenarios testing

### Krok 8: Dodanie do nawigacji

- Link w głównej nawigacji aplikacji
- Breadcrumbs jeśli wymagane
- Meta tags dla SEO

### Krok 9: Code review i refaktoring

- Sprawdzenie zgodności z coding standards
- Optymalizacja importów i bundling
- Dokumentacja komponentów
- Finalne testy end-to-end
