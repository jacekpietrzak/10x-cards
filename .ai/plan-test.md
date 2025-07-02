### **1. Cele testowania**

Głównym celem testów jest zapewnienie wysokiej jakości, niezawodności i bezpieczeństwa aplikacji 10xCards. Cele szczegółowe to:

- Weryfikacja poprawności działania kluczowych funkcjonalności: autentykacji użytkowników, generowania fiszek przez AI, zarządzania fiszkami oraz przeprowadzania sesji nauki.
- Zapewnienie integralności i bezpieczeństwa danych użytkowników, w szczególności poprzez weryfikację polityk RLS w Supabase.
- Upewnienie się, że interfejs użytkownika jest spójny, responsywny i działa zgodnie z oczekiwaniami na różnych urządzeniach.
- Wczesne wykrywanie błędów i regresji w procesie deweloperskim, aby zminimalizować ich wpływ na użytkowników końcowych.
- Zbudowanie zaufania do stabilności aplikacji przed każdym wdrożeniem na produkcję.

### **2. Zakres testów**

#### **Funkcjonalności objęte testami:**

- **Moduł autentykacji:** Rejestracja, logowanie, wylogowywanie, resetowanie hasła, ochrona tras prywatnych.
- **Generowanie fiszek:** Przesyłanie tekstu, interakcja z API OpenRouter, obsługa stanu ładowania, błędów oraz wyświetlanie wygenerowanych fiszek.
- **Zarządzanie fiszkami (CRUD):** Tworzenie, odczyt, aktualizacja i usuwanie pojedynczych fiszek i całych zestawów.
- **Sesja nauki:** Rozpoczynanie sesji, mechanizm przeglądania fiszek, ocenianie odpowiedzi (logika FSRS), podsumowanie sesji.
- **API Backendu:** Walidacja danych wejściowych, logika biznesowa w serwisach, poprawność odpowiedzi oraz obsługa błędów dla wszystkich endpointów.
- **Komponenty UI:** Poprawność renderowania i interaktywność podstawowych komponentów z biblioteki `shadcn/ui` oraz komponentów aplikacyjnych.

#### **Funkcjonalności wyłączone z zakresu testów:**

- Testowanie wewnętrznej logiki usług firm trzecich (np. algorytmów modeli AI w OpenRouter, wewnętrznych mechanizmów Supabase). Testowana będzie wyłącznie integracja z tymi usługami.
- Testy wydajnościowe i obciążeniowe (mogą zostać dodane w przyszłości).
- Szczegółowe testy kompatybilności na wszystkich istniejących przeglądarkach (skupimy się na najnowszych wersjach Chrome, Firefox, Safari).

### **3. Typy testów**

- **Testy jednostkowe (Unit Tests):**

  - **Narzędzia:** Vitest, React Testing Library, @testing-library/jest-dom, @testing-library/user-event, happy-dom.
  - **Cel:** Weryfikacja małych, izolowanych fragmentów kodu z realistycznymi interakcjami użytkownika.
  - **Przykłady:** Funkcje pomocnicze (`/lib/utils.ts`), customowe hooki (`/hooks`), schematy walidacji Zod (`/lib/schemas`), pojedyncze komponenty UI bez logiki biznesowej.
  - **Dodatkowe narzędzia:**
    - `happy-dom` - szybsza alternatywa dla jsdom
    - `jest-dom` - rozszerzone matchery dla lepszych asercji DOM
    - `user-event` - realistyczne symulacje interakcji użytkownika

- **Testy integracyjne (Integration Tests):**

  - **Narzędzia:** Vitest, React Testing Library, Mock Service Worker (MSW), Testcontainers, Supertest.
  - **Cel:** Sprawdzenie, czy różne części aplikacji poprawnie ze sobą współpracują.
  - **Przykłady:** Komponenty wchodzące w interakcję z serwisami (np. `FlashcardGenerationView`), serwisy (`/lib/services`) z rzeczywistą bazą danych, akcje serwerowe (`/lib/actions`), endpointy API (`/app/api`).
  - **Podejście do bazy danych:**
    - **Testcontainers + PostgreSQL** - rzeczywista baza danych w kontenerze Docker dla testów RLS policies
    - **MSW** - mockowanie zewnętrznych API (OpenRouter)
    - **Supertest** - testowanie endpointów Next.js API routes

- **Testy End-to-End (E2E):**

  - **Narzędzia:** Playwright (preferowany), Cypress (fallback).
  - **Uzasadnienie wyboru Playwright:**
    - Szybsze wykonanie testów
    - Lepsze wsparcie dla różnych przeglądarek (Chrome, Firefox, Safari)
    - Wbudowane auto-waiting mechanizmy
    - Nowoczesne API i lepsze możliwości debugowania
  - **Cel:** Symulacja rzeczywistych scenariuszy użycia aplikacji z perspektywy użytkownika w przeglądarce.
  - **Strategia zarządzania stanem:** Aby testy E2E były szybsze i bardziej stabilne, należy unikać logowania przez UI w każdym teście. Zamiast tego, należy stworzyć dedykowane mechanizmy (np. akcje serwerowe, endpointy API dostępne tylko w środowisku testowym) do programowego ustawiania stanu, np. logowania użytkownika i tworzenia danych testowych.
  - **Przykłady (krytyczne ścieżki użytkownika):**
    1.  Pełny cykl rejestracji, logowania i wylogowania.
    2.  Logowanie -> wygenerowanie zestawu fiszek z tekstu -> zapisanie fiszek.
    3.  Logowanie -> nawigacja do listy fiszek -> edycja i usunięcie fiszki.
    4.  Logowanie -> rozpoczęcie i ukończenie sesji nauki.

- **Testy komponentów z dokumentacją:**

  - **Narzędzia:** Storybook, @storybook/test, Chromatic.
  - **Cel:** Testowanie komponentów UI w izolacji oraz dokumentacja interfejsu użytkownika.
  - **Korzyści:**
    - Izolowane testowanie komponentów bez logiki biznesowej
    - Automatyczna dokumentacja komponentów
    - Visual regression testing z Chromatic
    - Łatwiejsze review zmian UI przez zespół
  - **Przykłady:** Wszystkie komponenty z `shadcn/ui`, komponenty formularzy, karty fiszek.

- **Zaawansowane techniki testowe:**
  - **Property-based testing (fast-check):** Testowanie logiki biznesowej z losowymi danymi wejściowymi.
  - **Mutation testing (Stryker):** Weryfikacja jakości testów poprzez wprowadzanie mutacji w kodzie.
  - **Snapshot testing:** Wbudowane w Vitest - do testowania struktury komponentów UI.
  - **Generowanie danych testowych (@faker-js/faker):** Wykorzystanie biblioteki do generowania realistycznych i zróżnicowanych danych (użytkownicy, fiszki), co pozwala na testowanie bardziej złożonych scenariuszy.

### **4. Priorytety testowe**

1.  **Priorytet Wysoki (krytyczne dla działania aplikacji):**

    - Ścieżka autentykacji użytkownika (rejestracja, logowanie, ochrona tras).
    - Proces generowania fiszek i ich zapisywanie.
    - Mechanizm sesji nauki.
    - Bezpieczeństwo API i polityki RLS bazy danych.

2.  **Priorytet Średni:**

    - Pełna funkcjonalność CRUD na fiszkach.
    - Formularze i walidacja po stronie klienta i serwera.
    - Responsywność kluczowych widoków (generowanie, sesja nauki).

3.  **Priorytet Niski:**
    - Strony statyczne (np. strona główna dla niezalogowanych).
    - Komponenty layoutu (nagłówek, stopka).
    - Mniej istotne elementy interfejsu.

### **5. Środowisko testowe**

- **Lokalne:**

  - Testy jednostkowe i integracyjne uruchamiane lokalnie przez deweloperów
  - **Docker wymagany** dla Testcontainers - automatyczne zarządzanie kontenerami PostgreSQL
  - Testy komponentów dostępne przez Storybook na `localhost:6006`
  - Zmienne środowiskowe dla połączeń z usługami zewnętrznymi (OpenRouter API)

- **CI/CD (GitHub Actions):**

  - Automatyczne uruchamianie wszystkich testów (jednostkowych, integracyjnych, komponentów)
  - **Docker in Docker** dla Testcontainers w środowisku CI
  - Integracja z Chromatic dla visual regression testing
  - Blokowanie merge'a w przypadku niepowodzenia testów lub obniżenia pokrycia kodu

- **Staging:**
  - Środowisko deweloperskie (preview environment) na Vercel
  - Dedykowana baza danych Supabase dla testów E2E
  - Automatyczne uruchamianie testów E2E po każdym deploy na staging
  - Storybook deployowany równolegle dla przeglądu komponentów

### **6. Harmonogram testów**

- Testy jednostkowe i integracyjne powinny być pisane równolegle z tworzeniem nowych funkcjonalności.
- Każdy nowy Pull Request musi zawierać odpowiednie testy dla dodawanego lub modyfikowanego kodu.
- Testy E2E będą rozwijane stopniowo, zaczynając od najbardziej krytycznych ścieżek użytkownika.
- Przed każdym wydaniem produkcyjnym należy przeprowadzić pełną regresję, uruchamiając wszystkie testy E2E na środowisku Staging.

### **7. Kryteria akceptacji**

- **Kryterium "Definition of Done":** Nowa funkcjonalność jest uznana za kompletną tylko wtedy, gdy posiada pokrycie testami jednostkowymi i/lub integracyjnymi.
- **Brama jakości w CI/CD:** Żaden Pull Request nie może zostać włączony do głównej gałęzi, jeśli testy automatyczne lub linter zwracają błędy.
- **Pokrycie kodu (Code Coverage):** Należy dążyć do osiągnięcia progu min. 80% pokrycia kodu testami dla kluczowych modułów (`/lib`, `/hooks`, `/app/api`), traktując tę metrykę jako wskaźnik, a nie cel sam w sobie.

### **8. Potencjalne ryzyka i strategie minimalizacji**

| Ryzyko                                             | Strategia minimalizacji                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Niestabilne testy E2E (Flaky Tests)**            | Stosowanie dobrych praktyk: unikanie sztywnych czasów oczekiwania (sleeps), używanie stabilnych selektorów. **Programowe przygotowanie stanu aplikacji (np. logowanie przez API) w celu uniezależnienia testów od UI.** Resetowanie stanu środowiska przed każdym testem. |
| **Zależność od zewnętrznego API (OpenRouter)**     | Mockowanie API OpenRouter w testach integracyjnych i E2E, aby uniezależnić testy od jego dostępności i uniknąć kosztów. Implementacja solidnej obsługi błędów w aplikacji.                                                                                                |
| **Zarządzanie stanem testowej bazy danych**        | Używanie Testcontainers z PostgreSQL dla testów integracyjnych. Automatyczne tworzenie i niszczenie kontenerów. Stworzenie skryptów seedingu dla powtarzalności testów **z wykorzystaniem `@faker-js/faker` do generowania realistycznych danych.**                       |
| **Zależność od Docker w środowisku deweloperskim** | Zapewnienie, że wszyscy deweloperzy mają zainstalowany Docker. Alternatywnie - fallback do in-memory database dla szybkich testów jednostkowych.                                                                                                                          |
| **Wydłużenie czasu testów przez Testcontainers**   | Optymalizacja przez wykorzystanie shared containers i cache'owanie obrazów Docker. Równoległe uruchamianie testów gdzie to możliwe.                                                                                                                                       |
| **Wzrost długu technicznego w testach**            | Regularny przegląd i refaktoryzacja testów. Skupienie się na testowaniu zachowań, a nie szczegółów implementacyjnych, aby testy były bardziej odporne na zmiany w kodzie.                                                                                                 |

### **9. Szczegóły techniczne i konfiguracja**

#### **Zaktualizowany stos technologiczny:**

**Unit & Integration Tests:**

- `vitest` - runner testów
- `@testing-library/react` - testowanie komponentów
- `@testing-library/jest-dom` - rozszerzone matchery
- `@testing-library/user-event` - symulacje interakcji
- `happy-dom` - szybkie środowisko DOM
- `msw` - mockowanie API
- `testcontainers` + `@testcontainers/postgresql` - rzeczywista baza danych
- `supertest` - testowanie API endpoints

**Component Testing & Documentation:**

- `@storybook/nextjs` - izolowane testowanie komponentów
- `@storybook/test` - utilities dla Storybook
- `chromatic` - visual regression testing

**E2E Testing:**

- `@playwright/test` - preferowane narzędzie E2E
- `cypress` - fallback opcja

**Advanced Testing:**

- `fast-check` - property-based testing
- `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` - mutation testing
- `@faker-js/faker` - generowanie danych testowych

**Static Analysis & Architecture:**

- `eslint` & `prettier` - linter i formater kodu
- `dependency-cruiser` - egzekwowanie reguł architektury

#### **Konfiguracja środowiska:**

```bash
# Wymagania systemowe
- Node.js 18+
- Docker & Docker Compose
- Git

# Setup lokalny
npm install
npm run test:setup  # inicjalizacja Testcontainers
npm run storybook   # uruchomienie komponentów
```

#### **Rekomendowane komendy:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:mutation": "stryker run",
    "storybook": "storybook dev -p 6006",
    "chromatic": "chromatic"
  }
}
```

#### **Analiza statyczna i jakość:**

- **ESLint i Prettier** - pierwsza linia obrony przed błędami
- **Egzekwowanie architektury (`dependency-cruiser`)** - definiowanie i weryfikacja reguł zależności między modułami, aby zapobiegać niekontrolowanemu wzrostowi złożoności i utrzymać czystą architekturę.
- **Pokrycie kodu** - minimum 80% dla modułów krytycznych
- **Mutation testing** - weryfikacja jakości testów
- **Visual regression** - automatyczne wykrywanie zmian UI

#### **Testowanie RLS (Row Level Security):**

- Dedykowane testy integracyjne z rzeczywistą bazą PostgreSQL
- Weryfikacja polityk dostępu dla różnych ról użytkowników
- Testowanie scenariuszy naruszenia bezpieczeństwa
- Automatyczne testy po każdej zmianie w schemacie bazy danych
