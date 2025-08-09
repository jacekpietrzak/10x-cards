# Plan implementacji widoku „Moje fiszki”

## 1. Przegląd

Widok „Moje fiszki” (`/flashcards`) umożliwia zalogowanemu użytkownikowi wyświetlanie, filtrowanie, paginację, ręczne dodawanie, edycję i usuwanie własnych fiszek. Stanowi centralny punkt zarządzania materiałem do nauki i integruje się z endpointami REST Supabase opisanymi w backendzie.

## 2. Routing widoku

- **Ścieżka:** `/flashcards`
- **Rodzaj strony:** SSR/ISR Next .js App Router (folder `src/app/(auth)/flashcards/page.tsx`).
- **Ochrona:** Middleware sprawdzające sesję Supabase – przekierowanie do `/login` przy braku autoryzacji.

## 3. Struktura komponentów

```
FlashcardsPage
 ├─ FlashcardsToolbar
 │   ├─ FlashcardsFilters
 │   └─ Button „Dodaj fiszkę”
 ├─ FlashcardsTable
 │   ├─ FlashcardRow × N
 │   │   └─ FlashcardActions (Edytuj / Usuń)
 │   └─ EmptyState / LoadingState
 ├─ PaginationControls
 ├─ FlashcardEditModal (wspólne dla tworzenia + edycji)
 └─ FlashcardDeleteConfirmDialog
```

## 4. Szczegóły komponentów

### FlashcardsPage

- **Opis:** Kontener strony; odpowiada za pobieranie danych przez `useFlashcards`, przechowuje stan filtrów, paginacji oraz otwieranie modali.
- **Główne elementy:** `FlashcardsToolbar`, `FlashcardsTable`, `PaginationControls`, modale.
- **Interakcje:** Zmiana filtrów/paginacji, otwarcie modali.
- **Walidacja:** N/A (delegowana do podrzędnych komponentów i hooków).
- **Typy:** `FlashcardsQueryParams`, `FlashcardsListResponseDto`.
- **Propsy:** brak (strona najwyższego poziomu).

### FlashcardsToolbar

- **Opis:** Pasek akcji nad tabelą – filtr „source”, ewentualnie sortowanie oraz przycisk „Dodaj fiszkę”.
- **Elementy:** `Select` (źródło: manual/ai-full/ai-edited), przycisk.
- **Interakcje:** `onFilterChange`, `onAddClick`.
- **Walidacja:** upewnienie się, że wybrany filtr jest jedną z wartości `Source`.
- **Typy:** `{ source?: Source }`.
- **Propsy:** `{ filters, onChange, onAdd }`.

### FlashcardsFilters

- **Opis:** Zestaw filtrów wewnątrz `FlashcardsToolbar` (source, generationId – opcjonalnie).
- **Elementy:** `Select`, `Input`.
- **Interakcje:** `onSubmit` (debounced lub natychmiastowe).

### FlashcardsTable

- **Opis:** Renderuje tabelę z fiszkami, puste/ładowanie w zależności od stanu.
- **Elementy:** Nagłówki kolumn, lista `FlashcardRow`.
- **Interakcje:** kliknięcie w wiersz (wejście w edycję), akcje z `FlashcardActions`.
- **Walidacja:** brak.
- **Propsy:** `{ data: FlashcardDto[], onEdit(id), onDelete(id) }`.

### FlashcardRow

- **Opis:** Pojedyncza fiszka w tabeli.
- **Elementy:** teksty front/back, tag source, daty, `FlashcardActions`.
- **Interakcje:** klik/najechanie.

### FlashcardActions

- **Opis:** Ikony/przyciski edycji i usuwania.
- **Interakcje:** `onEdit`, `onDelete`.

### FlashcardEditModal

- **Opis:** Modal do tworzenia lub edycji fiszki z formularzem.
- **Elementy:** `Input` front/back, `Select` source, opcjonalne pole `generation_id`.
- **Interakcje:** `onSubmit`, `onCancel`.
- **Walidacja:**
  - `front ≤ 200 znaków`
  - `back ≤ 500 znaków`
  - Reguła zależna `generation_id` vs `source`.
- **Typy:** `FlashcardFormValues`.
- **Propsy:** `{ mode: "create" | "edit", initialValues?, onSuccess }`.

### FlashcardDeleteConfirmDialog

- **Opis:** Potwierdzenie usunięcia.
- **Interakcje:** `onConfirm`, `onCancel`.
- **Propsy:** `{ flashcardId, onConfirm }`.

### PaginationControls

- **Opis:** Nawigacja stron; wykorzystuje `limit`, `total`, `page`.
- **Interakcje:** `onPageChange`.
- **Typy:** `PaginationDto`.

## 5. Typy

| Nazwa                   | Pola                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `FlashcardsQueryParams` | `page: number; limit: number; sort?: string; order?: "asc"                                                | "desc"; source?: Source; generation_id?: number` |
| `FlashcardFormValues`   | `front: string; back: string; source: Source; generation_id: number                                       | null`                                            |
| `UseFlashcardsReturn`   | `{ data: FlashcardDto[]; pagination: PaginationDto; loading: boolean; error?: string; refetch(params?) }` |

## 6. Zarządzanie stanem

- **React state + useReducer** w `FlashcardsPage` dla parametrów zapytania.
- **Globalny stan:** niepotrzebny; każdy użytkownik pracuje na własnym zestawie fiszek.
- **Hooki:**
  - `useFlashcards(params)` – fetch + cache + refetch.
  - `useFlashcardForm(initial?)` – obsługa formularza i walidacji (Zod + react-hook-form).
  - `useDisclosure()` – zarządzanie modalami.

## 7. Integracja API

| Akcja         | Endpoint               | Metoda | Typ żądania                             | Typ odpowiedzi                   | Wywołanie frontend                   |
| ------------- | ---------------------- | ------ | --------------------------------------- | -------------------------------- | ------------------------------------ |
| Pobierz listę | `/api/flashcards`      | GET    | `FlashcardsQueryParams`                 | `FlashcardsListResponseDto`      | `useFlashcards` we `FlashcardsPage`  |
| Utwórz fiszkę | `/api/flashcards`      | POST   | `{ flashcards: FlashcardFormValues[] }` | `{ flashcards: FlashcardDto[] }` | `FlashcardEditModal` w trybie create |
| Edytuj fiszkę | `/api/flashcards/{id}` | PUT    | `Partial<FlashcardFormValues>`          | `FlashcardDto`                   | `FlashcardEditModal` w trybie edit   |
| Usuń fiszkę   | `/api/flashcards/{id}` | DELETE | –                                       | `DeleteFlashcardResponseDto`     | `FlashcardDeleteConfirmDialog`       |

## 8. Interakcje użytkownika

1. **Wyświetlenie listy** – nawigacja do `/flashcards` → fetch listy.
2. **Filtrowanie** – zmiana selektora source → refetch z nowymi parametrami.
3. **Paginacja** – wybór kolejnej strony → aktualizacja `page`.
4. **Dodawanie** – klik „Dodaj fiszkę” → otwarcie modalu → walidacja → POST → refetch.
5. **Edycja** – klik w wiersz lub ikonę → modal w trybie edit → PUT → refetch.
6. **Usuwanie** – klik ikony kosza → dialog potwierdzenia → DELETE → optymistyczne usunięcie z UI lub refetch.

## 9. Warunki i walidacja

- Walidacja danych formularza z Zod (front/back długość, reguła `generation_id`).
- Wymuszenie autoryzacji (middleware + obsługa 401 w hookach API).
- Weryfikacja parametrów query przed wysłaniem (np. `limit ≤ 100`).

## 10. Obsługa błędów

- **401** – redirect do `/login`.
- **400** – wyświetlenie szczegółów walidacji w formularzu lub toast.
- **404** – toast „Fiszka nie istnieje” (przy edycji/usuwaniu równoległym).
- **500 / inne** – toast ogólny + logowanie do Sentry.
- Retry w `useFlashcards` przy błędach sieciowych z ekspotencjalnym backoffem.

## 11. Kroki implementacji

1. **Routing & Middleware** – utworzenie strony `src/app/(auth)/flashcards/page.tsx` + ochrona.
2. **Typy & DTO** – dodać `FlashcardsQueryParams`, `FlashcardFormValues` w `src/lib/types/flashcards.ts`.
3. **Hook `useFlashcards`** – fetch GET `/api/flashcards` z parametrami + SWR.
4. **Hook `useFlashcardForm`** – integracja `react-hook-form` + Zod.
5. **Komponenty podstawowe** – `FlashcardsToolbar`, `FlashcardsTable`, `PaginationControls`.
6. **Modal edycji** – `FlashcardEditModal` z obsługą create/edit.
7. **Dialog usunięcia** – `FlashcardDeleteConfirmDialog`.
8. **Integracja akcji** – połączenie modali i hooków w `FlashcardsPage`.
9. **Stylowanie** – Tailwind + shadcn/ui (Tabela, Modal, Dialog, Inputs, Select).
10. **Testy jednostkowe** – utilsy hooków + walidacja Zod.
11. **Testy e2e (Playwright)** – scenariusze dodania, edycji i usunięcia.
12. **Dokumentacja** – aktualizacja README + storybook przykładowych komponentów.
