# Plan implementacji widoku "Moje fiszki"

## 1. Przegląd

Widok "Moje fiszki" (`/flashcards`) jest centralnym miejscem do zarządzania wszystkimi zapisanymi fiszkami użytkownika. Umożliwia on przeglądanie listy fiszek, dodawanie nowych, edytowanie istniejących oraz ich usuwanie. Widok ten integruje się z backendem w celu zapewnienia, że wszystkie operacje są trwałe i bezpieczne, a interfejs użytkownika jest intuicyjny i zgodny z nowoczesnymi standardami, wykorzystując bibliotekę `shadcn/ui`.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką w aplikacji:

- **Ścieżka:** `/flashcards`

## 3. Struktura komponentów

Hierarchia komponentów dla widoku "Moje fiszki" została zaprojektowana w celu zapewnienia modułowości i reużywalności.

```
<FlashcardsPage> (src/app/(auth)/flashcards/page.tsx)
|
|-- <FlashcardsToolbar> (src/components/flashcards/FlashcardsToolbar.tsx)
|   |-- <Button> (Add New Flashcard)
|
|-- <FlashcardsDataTable> (src/components/flashcards/FlashcardsDataTable.tsx)
|   |-- <Table> (wyświetla listę fiszek)
|   |-- <DataTablePagination> (komponent do paginacji)
|   |-- <DataTableRowActions> (menu kontekstowe dla wiersza)
|       |-- <Button> (Edit)
|       |-- <Button> (Delete)
|
|-- <FlashcardFormModal> (src/components/flashcards/FlashcardFormModal.tsx)
|   |-- <Dialog>
|   |   |-- <FlashcardForm>
|   |       |-- <Input> (dla "Front")
|   |       |-- <Textarea> (dla "Back")
|   |       |-- <Button> (Save)
|   |       |-- <Button> (Cancel)
|
|-- <DeleteConfirmationDialog> (src/components/flashcards/DeleteConfirmationDialog.tsx)
    |-- <AlertDialog>
    |   |-- <Button> (Confirm Delete)
    |   |-- <Button> (Cancel)
```

## 4. Szczegóły komponentów

### FlashcardsPage

- **Opis komponentu:** Główny kontener strony `/flashcards`. Odpowiedzialny za pobieranie danych, zarządzanie stanem (lista fiszek, paginacja, stan modali) oraz komunikację między komponentami podrzędnymi.
- **Główne elementy:** `div` jako kontener dla `FlashcardsToolbar` i `FlashcardsDataTable`, a także `FlashcardFormModal` i `DeleteConfirmationDialog`.
- **Obsługiwane interakcje:** Inicjalizacja pobierania danych, obsługa zmiany strony w paginacji, otwieranie modala edycji/tworzenia fiszki oraz dialogu potwierdzenia usunięcia.
- **Typy:** `FlashcardDto`, `PaginationDto`, `FlashcardViewModel`.
- **Propsy:** Brak (komponent routingu).

### FlashcardsToolbar

- **Opis komponentu:** Pasek narzędzi umieszczony nad tabelą fiszek, zawierający główne akcje dla widoku, takie jak dodawanie nowej fiszki.
- **Główne elementy:** Komponent `Button` z `shadcn/ui` do otwierania modala tworzenia fiszki.
- **Obsługiwane interakcje:** Kliknięcie przycisku "Dodaj fiszkę".
- **Typy:** Brak.
- **Propsy:**
  - `onAddNew: () => void;` // Funkcja wywoływana po kliknięciu przycisku dodawania.

### FlashcardsDataTable

- **Opis komponentu:** Komponent wyświetlający fiszki w formie tabeli danych (`DataTable` z `shadcn/ui`). Zarządza definicją kolumn, paginacją i akcjami dla poszczególnych wierszy.
- **Główne elementy:** Komponenty `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` z `shadcn/ui`. Wykorzystuje `DataTablePagination` i `DataTableRowActions`.
- **Obsługiwane interakcje:** Wyświetlanie danych, sortowanie, paginacja, wywoływanie akcji edycji/usunięcia z `DataTableRowActions`.
- **Typy:** `FlashcardDto`.
- **Propsy:**
  - `data: FlashcardDto[];`
  - `pagination: PaginationDto;`
  - `onEdit: (flashcard: FlashcardDto) => void;`
  - `onDelete: (flashcardId: number) => void;`
  - `onPageChange: (page: number, limit: number) => void;`

### FlashcardFormModal

- **Opis komponentu:** Modal (okno dialogowe) zawierający formularz do tworzenia lub edycji fiszki.
- **Główne elementy:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` z `shadcn/ui`. Wewnątrz znajduje się formularz (`FlashcardForm`) z polami `Input` i `Textarea`.
- **Obsługiwane interakcje:** Wprowadzanie tekstu, walidacja na żywo, obsługa zapisu i anulowania.
- **Obsługiwana walidacja:**
  - `front`: Pole wymagane, maksymalnie 200 znaków.
  - `back`: Pole wymagane, maksymalnie 500 znaków.
- **Typy:** `FlashcardViewModel`, `FlashcardCreateDto`, `FlashcardUpdateDto`.
- **Propsy:**
  - `isOpen: boolean;`
  - `onClose: () => void;`
  - `onSubmit: (data: FlashcardCreateDto | FlashcardUpdateDto, id?: number) => void;`
  - `initialData: FlashcardViewModel | null;`

### DeleteConfirmationDialog

- **Opis komponentu:** Dialog (`AlertDialog`) wyświetlany w celu uzyskania od użytkownika potwierdzenia operacji usunięcia fiszki.
- **Główne elementy:** `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` z `shadcn/ui`.
- **Obsługiwane interakcje:** Potwierdzenie lub anulowanie usunięcia.
- **Typy:** Brak.
- **Propsy:**
  - `isOpen: boolean;`
  - `onClose: () => void;`
  - `onConfirm: () => void;`

## 5. Typy

W celu obsługi stanu widoku i formularzy, oprócz istniejących typów DTO, wprowadzony zostanie nowy typ `ViewModel`.

- **`FlashcardViewModel`**: Reprezentuje dane fiszki w formularzu edycji. Jest to uproszczona wersja `FlashcardDto`, zawierająca tylko pola edytowalne przez użytkownika.
  ```typescript
  export interface FlashcardViewModel {
    id?: number;
    front: string;
    back: string;
  }
  ```

Pozostałe typy (`FlashcardDto`, `PaginationDto`, `FlashcardCreateDto`, `FlashcardUpdateDto`) będą importowane bezpośrednio z `src/lib/types.ts`.

## 6. Zarządzanie stanem

Zarządzanie stanem zostanie zrealizowane przy użyciu haków `useState` i `useEffect` w komponencie `FlashcardsPage`.

- `flashcards`: `useState<FlashcardDto[]>([])` - przechowuje listę fiszek.
- `pagination`: `useState<PaginationDto>({ page: 1, limit: 10, total: 0 })` - przechowuje stan paginacji.
- `isLoading`: `useState<boolean>(true)` - flag do zarządzania stanem ładowania danych.
- `error`: `useState<string | null>(null)` - przechowuje komunikaty o błędach.
- `editingFlashcard`: `useState<FlashcardViewModel | null>(null)` - przechowuje dane fiszki do edycji lub `null` przy tworzeniu nowej.
- `isModalOpen`: `useState<boolean>(false)` - zarządza widocznością modala edycji/tworzenia.
- `deletingFlashcardId`: `useState<number | null>(null)` - przechowuje ID fiszki do usunięcia, co kontroluje widoczność dialogu potwierdzenia.

Nie ma potrzeby tworzenia dedykowanego custom hooka, ponieważ logika jest scentralizowana w komponencie `FlashcardsPage`.

## 7. Integracja API

Komponent `FlashcardsPage` będzie odpowiedzialny za wszystkie wywołania API przy użyciu `fetch`.

- **Pobieranie listy fiszek:**

  - **Akcja:** `useEffect` przy montowaniu komponentu oraz przy zmianie paginacji.
  - **Endpoint:** `GET /api/flashcards?page={page}&limit={limit}`
  - **Typ odpowiedzi:** `FlashcardsListResponseDto`

- **Tworzenie nowej fiszki:**

  - **Akcja:** `onSubmit` z `FlashcardFormModal`, gdy `initialData` jest `null`.
  - **Endpoint:** `POST /api/flashcards`
  - **Typ żądania:** `FlashcardsCreateCommand` (zawierający `flashcards: [FlashcardCreateDto]`)
  - **Typ odpowiedzi:** `{ flashcards: FlashcardDto[] }`

- **Aktualizacja fiszki:**

  - **Akcja:** `onSubmit` z `FlashcardFormModal`, gdy `initialData` nie jest `null`.
  - **Endpoint:** `PUT /api/flashcards/{id}`
  - **Typ żądania:** `FlashcardUpdateDto`
  - **Typ odpowiedzi:** `FlashcardDto`

- **Usuwanie fiszki:**
  - **Akcja:** `onConfirm` z `DeleteConfirmationDialog`.
  - **Endpoint:** `DELETE /api/flashcards/{id}`
  - **Typ odpowiedzi:** `DeleteFlashcardResponseDto`

## 8. Interakcje użytkownika

- **Wyświetlanie listy:** Użytkownik widzi tabelę ze swoimi fiszkami po wejściu na `/flashcards`.
- **Dodawanie fiszki:** Użytkownik klika "Dodaj fiszkę", co otwiera pusty modal. Po wypełnieniu i zapisaniu, lista jest odświeżana.
- **Edycja fiszki:** Użytkownik klika "Edytuj" w menu wiersza, co otwiera modal z danymi fiszki. Po zapisaniu zmian, lista jest odświeżana.
- **Usuwanie fiszki:** Użytkownik klika "Usuń", co otwiera dialog potwierdzenia. Po potwierdzeniu, fiszka znika z listy.
- **Paginacja:** Użytkownik używa przycisków paginacji, co powoduje pobranie i wyświetlenie nowej strony danych.

## 9. Warunki i walidacja

- **Formularz (`FlashcardForm`):**

  - Walidacja `front` (wymagane, max 200 znaków) i `back` (wymagane, max 500 znaków) będzie realizowana za pomocą `react-hook-form` i `zod`.
  - Przycisk "Zapisz" będzie nieaktywny, dopóki formularz nie zostanie poprawnie wypełniony.
  - Komunikaty o błędach będą wyświetlane pod odpowiednimi polami.

- **Przyciski akcji:**
  - Przyciski "Edytuj" i "Usuń" są dostępne dla każdego wiersza w tabeli.

## 10. Obsługa błędów

- **Błędy ładowania danych:** Jeśli `GET /api/flashcards` zwróci błąd, zostanie wyświetlony komunikat o błędzie zamiast tabeli.
- **Błędy zapisu (POST/PUT):** Jeśli operacja zapisu się nie powiedzie, użytkownik zobaczy powiadomienie (np. `Toast` z `shadcn/ui`) z informacją o błędzie, a modal pozostanie otwarty.
- **Błędy usuwania (DELETE):** W przypadku błędu, dialog potwierdzenia zostanie zamknięty, a użytkownik zobaczy powiadomienie o niepowodzeniu operacji.
- **Brak fiszek:** Jeśli użytkownik nie ma żadnych fiszek, tabela wyświetli komunikat "Nie znaleziono fiszek. Dodaj swoją pierwszą fiszkę!".

## 11. Kroki implementacji

1.  **Struktura plików:** Utworzenie folderu `src/app/(auth)/flashcards` z plikiem `page.tsx`. Stworzenie folderu `src/components/flashcards` na wszystkie nowe komponenty.
2.  **Komponent `FlashcardsPage`:** Zaimplementowanie logiki pobierania danych z `GET /api/flashcards` i podstawowego zarządzania stanem (`useState`, `useEffect`).
3.  **Komponent `FlashcardsDataTable`:** Stworzenie komponentu tabeli przy użyciu `shadcn/ui/table`. Zdefiniowanie kolumn (`front`, `back`, `created_at`, `actions`). Zintegrowanie z `FlashcardsPage` do wyświetlania danych.
4.  **Komponent `FlashcardsToolbar`:** Dodanie paska narzędzi z przyciskiem "Dodaj fiszkę".
5.  **Modal i formularz (`FlashcardFormModal`):**
    - Zbudowanie modala przy użyciu `shadcn/ui/dialog`.
    - Stworzenie formularza (`FlashcardForm`) z `react-hook-form` i integracja z `zod` dla walidacji.
    - Podłączenie logiki otwierania modala z `FlashcardsPage` (zarówno dla tworzenia, jak i edycji).
6.  **Dialog usuwania (`DeleteConfirmationDialog`):** Stworzenie dialogu potwierdzenia przy użyciu `shadcn/ui/alert-dialog`. Podłączenie logiki otwierania po kliknięciu "Usuń".
7.  **Integracja API (CRUD):**
    - Implementacja funkcji `handleSave` w `FlashcardsPage` do obsługi `POST` i `PUT`.
    - Implementacja funkcji `handleDelete` do obsługi `DELETE`.
    - Po każdej udanej operacji (create, update, delete), ponowne pobranie danych z serwera w celu odświeżenia widoku.
8.  **Obsługa stanu i błędów:** Dodanie obsługi stanu ładowania (np. wyświetlanie spinnera) oraz wyświetlanie komunikatów o błędach i sukcesie przy użyciu `shadcn/ui/toast`.
9.  **Stylowanie i UX:** Dopracowanie wyglądu, responsywności oraz dostępności (np. focus management w modalach).
10. **Testowanie:** Ręczne przetestowanie wszystkich ścieżek użytkownika (tworzenie, edycja, usuwanie, paginacja, obsługa błędów).
