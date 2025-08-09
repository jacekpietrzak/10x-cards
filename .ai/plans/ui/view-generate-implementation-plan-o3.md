/_
Plan implementacji widoku Generowania Fiszek
_/

# Plan implementacji widoku Generowania Fiszek

## 1. Przegląd

Widok **Generowanie fiszek** umożliwia użytkownikowi wklejenie obszernego tekstu (od 1000 do 10 000 znaków), wygenerowanie propozycji fiszek przy pomocy AI, a następnie selekcję (zaakceptowanie, edycję lub odrzucenie) przed zapisaniem ich w bazie danych. Celem widoku jest skrócenie czasu tworzenia fiszek oraz zapewnienie przejrzystego procesu rewizji.

## 2. Routing widoku

- Ścieżka: `/generate`
- Plik strony (App Router): `src/app/(auth)/generate/page.tsx`
- Widok wymaga autoryzacji; middleware przekierowuje nie­zalogowanych użytkowników do `/login`.

## 3. Struktura komponentów

```
GeneratePage
 ├── SourceTextForm
 │    ├── Textarea
 │    ├── CharCounter
 │    └── GenerateButton
 ├── LoadingSkeleton   (conditionally)
 ├── ProposalsSection  (renderowana po otrzymaniu odpowiedzi AI)
 │    ├── FlashcardProposalsList
 │    │     ├── FlashcardProposalItem × n
 │    │     │     ├── FrontBackCard / EditForm
 │    │     │     └── ActionButtons (Accept | Edit | Reject)
 │    └── EmptyState / ErrorAlert
 └── SaveBar (sticky bottom)
      ├── SaveAcceptedButton
      ├── SaveAllButton
      └── CancelButton
```

## 4. Szczegóły komponentów

### 4.1. `SourceTextForm`

- **Opis:** Formularz wejściowy tekstu źródłowego.
- **Elementy:** `<textarea>`, licznik znaków, komunikaty błędów, przycisk "Generuj fiszki".
- **Interakcje:**
  - `onChange` aktualizuje `sourceText` i licznik.
  - `onSubmit` (click/Enter) wywołuje `POST /generations`.
- **Walidacja:** 1000 ≤ `length(sourceText)` ≤ 10 000; trim; blokada przy wypełnieniu poza zakresem.
- **Typy:** `GenerateFlashcardsCommand`.
- **Propsy:** `onGenerate(command)`, `isLoading`.

### 4.2. `LoadingSkeleton`

- **Opis:** Placeholder widoku wyników podczas oczekiwania na odpowiedź AI.
- **Elementy:** Skeleton lines/cards (shadcn/ui `Skeleton`).
- **Propsy:** brak.

### 4.3. `ProposalsSection`

- **Opis:** Sekcja zawierająca listę propozycji lub komunikat o braku wyników / błędzie.
- **Walidacja wewnętrzna:** Sprawdza, czy istnieją propozycje; jeśli nie, renderuje pusty stan.
- **Propsy:** `proposals`, `onUpdate(proposal)`, `error`.

### 4.4. `FlashcardProposalsList`

- **Opis:** Kontener listy propozycji.
- **Elementy:** Mapuje `proposals` na `FlashcardProposalItem`.
- **Propsy:** `proposals`, `onUpdate`, `readonly` (gdy lista zapisana).

### 4.5. `FlashcardProposalItem`

- **Opis:** Pojedyncza propozycja fiszki.
- **Elementy:**
  - `FrontBackCard` – widok podglądu front/back.
  - `EditForm` – pola tekstowe do edycji (toggle).
  - `ActionButtons` – Accept / Edit / Reject (shadcn `Button` + `Icon`).
- **Interakcje:**
  - `Accept` ustawia `status = "accepted"`.
  - `Reject` ustawia `status = "rejected"`.
  - `Edit` włącza tryb edycji i zmienia `status = "edited"`.
- **Walidacja:** Front ≤ 200 znaków, Back ≤ 500 znaków.
- **Typy:** `FlashcardProposalViewModel`.
- **Propsy:** `proposal`, `onChange(proposal)`.

### 4.6. `SaveBar`

- **Opis:** Pasek akcji widoczny po wygenerowaniu propozycji, przyklejony do dołu.
- **Elementy:** przyciski "Zapisz zaakceptowane", "Zapisz wszystkie", "Anuluj".
- **Interakcje:**
  - `Zapisz zaakceptowane` filtruje `status in [accepted, edited]` i wywołuje `POST /flashcards`.
  - `Zapisz wszystkie` – akceptuje wszystkie `pending` -> `accepted` i wysyła.
  - `Anuluj` – czyści stan widoku.
- **Propsy:** `onSave(type)`, `disabled`.

### 4.7. `ErrorAlert`

- **Opis:** Wyświetla błąd sieci/walidacji.
- **Propsy:** `message`, `onRetry?`.

## 5. Typy

```ts
// Rozszerzony model propozycji w widoku
type FlashcardProposalViewModel = {
  id: string; // UUID tymczasowy w UI
  front: string;
  back: string;
  source: "ai-full" | "ai-edited"; // zawsze "ai-full" na starcie
  status: "pending" | "accepted" | "edited" | "rejected";
  editedFront?: string; // lokalnie przechowywana edycja
  editedBack?: string;
};

interface GenerateState {
  sourceText: string;
  charCount: number;
  isGenerating: boolean;
  generationError?: string;
  generationId?: number;
  proposals: FlashcardProposalViewModel[];
  isSaving: boolean;
  saveError?: string;
}
```

## 6. Zarządzanie stanem

- Lokalny `useReducer` w `GeneratePage` do zarządzania złożonym stanem (`GenerateState`).
- Custom hook `useGenerateFlashcards` kapsułkuje logikę wywołania `POST /generations` i mapowania odpowiedzi na `FlashcardProposalViewModel`.
- Custom hook `useSaveFlashcards` obsługuje `POST /flashcards` wraz z optimistic UI (blokada przycisków + global toast).
- Reaktywność z `react-query` (TanStack Query) dla cachowania wyników zapisu.

## 7. Integracja API

| Akcja                 | Endpoint           | Metoda | Request Body Typ                       | Response Typ                  |
| --------------------- | ------------------ | ------ | -------------------------------------- | ----------------------------- |
| Generuj fiszki        | `/api/generations` | POST   | `GenerateFlashcardsCommand`            | `GenerationCreateResponseDto` |
| Zapisz fiszki (batch) | `/api/flashcards`  | POST   | `{ flashcards: FlashcardCreateDto[] }` | `FlashcardsListResponseDto`   |

- Przy generowaniu pobierz `generation_id` i `flashcards_proposals`.
- Przy zapisie buduj `FlashcardsCreateCommand` z zaakceptowanych/edytowanych pozycji, ustaw `generation_id`.

## 8. Interakcje użytkownika

1. Wklejenie tekstu → walidacja długości → aktywacja przycisku "Generuj fiszki".
2. Klik "Generuj" → skeleton + `isGenerating=true`.
3. Otrzymanie wyników → render listy propozycji + `SaveBar`.
4. Na każdym elemencie: Accept / Edit / Reject.
5. Klik "Zapisz ..." → wywołanie `POST /flashcards` → toast sukcesu / błąd.
6. Klik "Anuluj" → reset stanu do początkowego.

## 9. Warunki i walidacja

- **Formularz tekstu:** 1000 ≤ chars ≤ 10 000.
- **Propozycja:** Front ≤ 200, Back ≤ 500.
- **Zapisywanie:** musi istnieć ≥ 1 zaakceptowana/edited fiszka; w przeciwnym razie przycisk disabled.
- **Źródło:** `source` = `ai-full` lub `ai-edited` (po edycji).
- **generation_id:** wymagany dla zapisywanych fiszek (pobrany z odpowiedzi `/generations`).

## 10. Obsługa błędów

- **400** z `/generations` lub `/flashcards` → wyświetl w `ErrorAlert` z detalami.
- **500 / network** → komunikat "Wystąpił błąd serwera. Spróbuj ponownie." + przycisk "Ponów".
- Walidacja klienta blokuje wysyłkę niepoprawnych danych.

## 11. Kroki implementacji

1. **Routing:** dodaj stronę `src/app/(auth)/generate/page.tsx` + ochronę trasą.
2. **Typy:** dodaj `FlashcardProposalViewModel` w `src/lib/types/generation.ts`.
3. **Hooki:** zaimplementuj `useGenerateFlashcards` i `useSaveFlashcards` w `src/hooks/`.
4. **Komponenty UI:**
   - `SourceTextForm` (z shadcn/ui `Textarea`, `Button`).
   - `LoadingSkeleton`.
   - `FlashcardProposalsList` + `FlashcardProposalItem`.
   - `SaveBar`.
5. **Integracja API:** użyj `fetch` z `/api/...` lub abstrahuj w `src/lib/services/client.ts`.
6. **Walidacja:** skorzystaj z `zod` zarówno w hookach (po stronie klienta) jak i w serwisie.
7. **Stylowanie:** Tailwind + shadcn/ui; responsywność (mobile first, `md:` breakpoints).
8. **Toasty / feedback:** użyj shadcn/ui `Sonner`.
