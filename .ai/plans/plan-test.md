# Plan Testów - Aplikacja 10x-Cards

## 1. Wprowadzenie i Cele Testowania

### 1.1 Wprowadzenie

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji 10x-Cards - zaawansowanej aplikacji do nauki z wykorzystaniem fiszek, wykorzystującej sztuczną inteligencję do generowania materiałów edukacyjnych oraz algorytm FSRS do optymalizacji procesu uczenia się.

### 1.2 Cele Testowania

- **Zapewnienie jakości**: Weryfikacja poprawności działania wszystkich funkcjonalności aplikacji
- **Bezpieczeństwo**: Sprawdzenie mechanizmów autoryzacji i ochrony danych użytkowników poprzez RLS (Row-Level Security)
- **Wydajność**: Ocena czasu odpowiedzi API, renderowania komponentów React oraz optymalizacji Next.js
- **Niezawodność**: Testowanie mechanizmów obsługi błędów, szczególnie w integracji z OpenRouter API
- **Użyteczność**: Weryfikacja responsywności interfejsu i dostępności (a11y) komponentów shadcn/ui
- **Zgodność**: Sprawdzenie poprawnego działania algorytmu FSRS oraz integracji z Supabase

## 2. Zakres Testów

### 2.1 W Zakresie Testów

- **Frontend (Next.js 15 + React 19)**:

  - Komponenty UI (shadcn/ui + Radix UI)
  - Routing (App Router)
  - Server Components i Client Components
  - Formularze (React Hook Form + Zod)
  - Stan aplikacji i hooki

- **Backend (Supabase)**:

  - Autentykacja użytkowników
  - Operacje CRUD na fiszkach
  - Polityki RLS
  - Triggery i funkcje bazodanowe

- **Integracja AI (OpenRouter)**:

  - Generowanie fiszek
  - Walidacja odpowiedzi
  - Mechanizmy retry
  - Logowanie błędów

- **Algorytm FSRS**:
  - Obliczenia parametrów powtórek
  - Zmiana stanów kart
  - Harmonogram przeglądów

### 2.2 Poza Zakresem Testów

- Wewnętrzna logika OpenRouter API
- Infrastruktura Vercel
- Wewnętrzne mechanizmy Supabase
- Biblioteki zewnętrzne (poza integracją)

## 3. Strategia Testowania

### 3.1 Poziomy Testów

#### Testy Jednostkowe (Unit Tests)

- **Narzędzia**: Vitest + React Testing Library
- **Pokrycie**: Min. 80% dla krytycznych serwisów
- **Priorytet**: Wysoki dla:
  - `flashcards.service.ts` - operacje CRUD z FSRS
  - `generation.service.ts` - workflow AI
  - `openrouter.service.ts` - retry logic
  - Schematy Zod
  - Hooki (useReviewSession, useFlashcardGeneration)

#### Testy Integracyjne (Integration Tests)

- **Narzędzia**: Vitest + MSW (Mock Service Worker) + Testcontainers (PostgreSQL) + pgTAP (testy SQL/RLS) + Supabase Test Helpers (opcjonalnie) + next/testmode (Server Actions)
- **Obszary**:
  - API Routes (`/api/flashcards`, `/api/generations`)
  - Middleware autoryzacyjny
  - Integracja z Supabase (używając lokalnej instancji)
  - Server Actions

#### Testy E2E (End-to-End Tests)

- **Narzędzia**: Playwright
- **Scenariusze krytyczne**:
  - Przepływ rejestracji/logowania
  - Generowanie fiszek przez AI
  - Sesja nauki z FSRS
  - Zarządzanie fiszkami (CRUD)

#### Testy Komponentów (Component Tests)

- **Narzędzia**: Storybook (+ @storybook/test-runner) | Wizualne regresje: Playwright (`expect(page).toHaveScreenshot()`) lub Argos/Percy
- **Komponenty priorytetowe**:
  - FlashcardGenerationView
  - SessionView
  - FlashcardsDataTable
  - Komponenty formularzy autoryzacyjnych

### 3.2 Podejście do Testowania

- **Test-Driven Development (TDD)** dla nowych funkcjonalności
- **Behavior-Driven Development (BDD)** dla testów E2E
- **Snapshot Testing** dla komponentów UI
- **Visual Regression Testing** poprzez Playwright screenshots lub Argos/Percy
- **Property-Based Testing** dla algorytmu FSRS (fast-check)

## 4. Rodzaje Testów do Przeprowadzenia

### 4.1 Testy Funkcjonalne

#### Moduł Autoryzacji

- [ ] Rejestracja nowego użytkownika z walidacją pól
- [ ] Logowanie z błędnymi/poprawnymi danymi
- [ ] Resetowanie hasła - przepływ e-mail
- [ ] Middleware - ochrona tras chronionych
- [ ] RLS - izolacja danych użytkowników
- [ ] Tokeny JWT - odświeżanie i wygasanie

#### Moduł Generowania Fiszek (AI)

- [ ] Walidacja długości tekstu źródłowego (1000-10000 znaków)
- [ ] Generowanie 3-7 par fiszek
- [ ] Obsługa timeout'ów OpenRouter API
- [ ] Mechanizm retry przy błędach
- [ ] Parsowanie i walidacja JSON z odpowiedzi
- [ ] Edycja wygenerowanych propozycji
- [ ] Zapis do bazy z tracking'iem generacji

#### Moduł Zarządzania Fiszkami

- [ ] Tworzenie ręcznych fiszek
- [ ] Edycja istniejących fiszek
- [ ] Usuwanie fiszek
- [ ] Paginacja i sortowanie
- [ ] Filtrowanie po stanie FSRS
- [ ] Import/eksport (jeśli zaimplementowane)

#### Moduł Sesji Nauki (FSRS)

- [ ] Inicjalizacja sesji z kartami due
- [ ] Obliczenia następnego przeglądu
- [ ] Zmiana stanów: New → Learning → Review
- [ ] Obsługa ponownego uczenia (Relearning)
- [ ] Aktualizacja parametrów: stability, difficulty
- [ ] Statystyki sesji

### 4.2 Testy Niefunkcjonalne

#### Testy Wydajnościowe

- **Narzędzia**: Lighthouse, Web Vitals, k6 lub Artillery (opcjonalnie)
- **Metryki**:
  - LCP < 2.5s (Largest Contentful Paint)
  - FID < 100ms (First Input Delay)
  - CLS < 0.1 (Cumulative Layout Shift)
  - Time to Interactive < 3s
  - API response time < 200ms dla CRUD
  - AI generation < 5s

#### Testy Bezpieczeństwa

- [ ] SQL Injection w parametrach API
- [ ] XSS w polach formularzy
- [ ] CSRF w Server Actions
- [ ] Sprawdzenie RLS policies
- [ ] Walidacja CORS
- [ ] Rate limiting dla AI generation
- [ ] Bezpieczne przechowywanie API keys

  **Narzędzia dodatkowe**:

  - Semgrep (SAST), OWASP ZAP (DAST), Snyk/Dependabot (dependencies)
  - eslint-plugin-security, eslint-plugin-jsx-a11y

#### Testy Dostępności (a11y)

- **Narzędzia**: axe-core, Pa11y, jest-axe, @axe-core/playwright
- [ ] Nawigacja klawiaturą
- [ ] Czytniki ekranu (NVDA/JAWS)
- [ ] Kontrast kolorów WCAG 2.1 AA
- [ ] ARIA labels w komponentach shadcn/ui
- [ ] Focus management w modalach

#### Testy Responsywności

- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Orientacja pozioma/pionowa
- [ ] Touch interactions

### 4.3 Testy Kompatybilności

#### Przeglądarki

- Chrome 90+ (Chromium)
- Firefox 88+
- Safari 14+
- Edge 90+

#### Urządzenia

- iOS 14+ (Safari)
- Android 10+ (Chrome)
- iPadOS 14+

## 5. Środowisko Testowe

### 5.1 Środowisko Lokalne

- **Supabase CLI**: Port 55321 (lokalna instancja)
- **Next.js Dev Server**: Port 3000 (Turbopack)
- **Database**: PostgreSQL (Supabase local)
- **Node.js**: v20.x LTS
- **pnpm**: v9.x

### 5.2 Środowisko CI/CD

- **GitHub Actions**: Automated test runs
- **Env Variables**:

  ```
  NEXT_PUBLIC_SUPABASE_URL=<ci-test-instance>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<ci-test-key>
  OPENROUTER_API_KEY=<test-api-key>
  ```

  **Zalecenia CI**:

  - Oddzielne joby: typecheck (`tsc --noEmit`), lint, unit+integration (Vitest), E2E (Playwright), a11y (axe), performance (Lighthouse CI)
  - Cache pnpm i Playwright; matrix: Chrome/Firefox/WebKit
  - Raport coverage przez `c8`/V8 + publikacja do Codecov
  - Budżety paczek: size-limit / @next/bundle-analyzer z progami w PR

### 5.3 Środowisko Staging

- **Vercel Preview Deployments**
- **Supabase Staging Project**
- **Feature flags dla testów A/B**

### 5.4 Dane Testowe

- Seedowanie bazy: `supabase/seed.sql`
- Fixtures dla fiszek FSRS
- Mock responses dla OpenRouter API
- Użytkownicy testowi z różnymi rolami

  **Dodatki**:

  - Generowanie danych: `@faker-js/faker`
  - Stabilne re-run’y AI: HAR/Polly.js lub MSW z deterministycznymi fixtures

## 6. Harmonogram Testów

### Faza 1: Przygotowanie (Tydzień 1)

- [ ] Setup środowisk testowych
- [ ] Konfiguracja narzędzi (Vitest, Playwright, Storybook, Testcontainers, pgTAP)
- [ ] Przygotowanie danych testowych
- [ ] CI/CD pipeline setup

### Faza 2: Testy Jednostkowe (Tydzień 2-3)

- [ ] Serwisy biznesowe
- [ ] Hooki React
- [ ] Schematy walidacji
- [ ] Utils i helpers

  Notatki:

  - FSRS: property-based tests (fast-check)

### Faza 3: Testy Integracyjne (Tydzień 3-4)

- [ ] API endpoints
- [ ] Supabase integration
- [ ] OpenRouter service
- [ ] Middleware

  Notatki:

  - Baza: Testcontainers (Postgres) + migracje
  - RLS i funkcje: pgTAP
  - Server Actions: next/testmode

### Faza 4: Testy E2E (Tydzień 4-5)

- [ ] Critical user paths
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Performance testing

  Notatki:

  - Wizualne regresje: Playwright screenshots lub Argos/Percy

### Faza 5: Testy Akceptacyjne (Tydzień 6)

- [ ] UAT z użytkownikami
- [ ] Testy regresji
- [ ] Smoke tests
- [ ] Raport końcowy

## 7. Kryteria Akceptacji

### 7.1 Kryteria Wejścia

- Kod źródłowy skompilowany bez błędów TypeScript
- Środowisko testowe skonfigurowane
- Dane testowe przygotowane
- Przypadki testowe zaakceptowane

### 7.2 Kryteria Wyjścia

- **Pokrycie kodu**: Min. 80% dla serwisów, 70% ogólnie
- **Testy E2E**: 100% przejścia dla ścieżek krytycznych
- **Błędy krytyczne**: 0
- **Błędy wysokie**: Max 2 (z workaround)
- **Performance**: Spełnione wszystkie metryki Web Vitals
- **Dostępność**: WCAG 2.1 Level AA compliance

### 7.3 Kryteria Zawieszenia/Wznowienia

- **Zawieszenie**: Błąd blokujący w środowisku, brak dostępu do API
- **Wznowienie**: Usunięcie blokera, potwierdzenie stabilności

## 8. Raportowanie Błędów i Zarządzanie

### 8.1 Klasyfikacja Błędów

- **Krytyczny (P0)**: Aplikacja nie działa, utrata danych
- **Wysoki (P1)**: Główna funkcjonalność uszkodzona
- **Średni (P2)**: Funkcjonalność ograniczona, istnieje workaround
- **Niski (P3)**: Kosmetyczne, UX improvements

### 8.2 Szablon Raportu Błędu

```markdown
**ID**: BUG-XXXX
**Tytuł**: [Moduł] Krótki opis
**Priorytet**: P0/P1/P2/P3
**Środowisko**: Local/Staging/Production
**Kroki reprodukcji**:

1. ...
2. ...
   **Oczekiwany rezultat**:
   **Aktualny rezultat**:
   **Screenshots/Logi**:
   **Browser/Device**:
   **User ID** (jeśli dotyczy):
```

### 8.3 Workflow Zarządzania

1. **Zgłoszenie** → GitHub Issues
2. **Triage** → Przypisanie priorytetu
3. **Przypisanie** → Developer assignment
4. **Fix** → PR z testami
5. **Weryfikacja** → QA verification
6. **Zamknięcie** → Deploy to production

### 8.4 Metryki Jakości

- Defect Density: błędy/1000 LOC
- Test Execution Rate: wykonane/zaplanowane
- Defect Removal Efficiency: (błędy przed release)/(wszystkie błędy)
- Mean Time to Detect (MTTD)
- Mean Time to Repair (MTTR)

## 9. Zasoby i Narzędzia

### 9.1 Zespół Testowy

- **Test Lead**: Koordynacja, strategia
- **QA Engineers** (2): Testy manualne i automatyczne
- **Developer in Test**: Testy jednostkowe, integracyjne
- **Performance Tester**: Testy wydajnościowe

### 9.2 Narzędzia Testowe

#### Testing Frameworks

- **Vitest**: Unit & Integration tests (coverage: c8/V8)
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **Storybook**: Component documentation
- **Playwright screenshots** lub **Argos/Percy**: Visual regression

#### Narzędzia Pomocnicze

- **MSW**: API mocking
- **@faker-js/faker**: Test data generation
- **Lighthouse CI**: Performance monitoring
- **axe-core**: Accessibility testing
- **k6** lub **Artillery**: Load testing
- **Sentry**: Error monitoring (production)
- **Testcontainers**: Realistyczne testy z PostgreSQL
- **pgTAP**: Testy funkcji i polityk w Postgres (RLS)
- **Semgrep/ZAP/Snyk**: SAST/DAST/deps security
- **size-limit / @next/bundle-analyzer**: Budżety pakietów

#### Infrastruktura

- **GitHub Actions**: CI/CD
- **Vercel**: Preview deployments
- **Supabase**: Test projects
- **BrowserStack**: Cross-browser testing

### 9.3 Dokumentacja

- Przypadki testowe: GitHub Wiki
- Raporty: GitHub Issues
- Metryki: GitHub Actions artifacts
- Knowledge base: Confluence/Notion

### 9.4 Szkolenia

- Next.js 15 App Router patterns
- Supabase RLS best practices
- FSRS algorithm understanding
- Playwright automation
- Accessibility standards

## 10. Ryzyka i Mitygacja

### 10.1 Ryzyka Techniczne

| Ryzyko                       | Prawdopodobieństwo | Wpływ     | Mitygacja                                      |
| ---------------------------- | ------------------ | --------- | ---------------------------------------------- |
| OpenRouter API niestabilność | Średnie            | Wysoki    | Mock service, cache responses, fallback models |
| FSRS błędne obliczenia       | Niskie             | Wysoki    | Property-based testing, data validation        |
| Supabase RLS bypassy         | Niskie             | Krytyczny | Penetration testing, security audits           |
| Performance degradation      | Średnie            | Średni    | Continuous monitoring, performance budgets     |

### 10.2 Ryzyka Organizacyjne

- **Opóźnienia w development**: Buffer time w harmonogramie
- **Brak zasobów**: Cross-training, external contractors
- **Zmiany wymagań**: Agile approach, iterative testing

## 11. Podsumowanie

Plan testów dla aplikacji 10x-Cards uwzględnia złożoność architektury opartej na Next.js 15, Supabase i integracji AI. Kluczowe obszary wymagające szczególnej uwagi to:

1. **Algorytm FSRS** - serce aplikacji do nauki
2. **Integracja z OpenRouter** - krytyczna dla generowania treści
3. **Bezpieczeństwo RLS** - ochrona danych użytkowników
4. **Performance SSR/SSG** - wykorzystanie możliwości Next.js 15
5. **Dostępność UI** - zgodność z WCAG dla szerokiej grupy użytkowników

Sukces testowania zależy od systematycznego podejścia, automatyzacji powtarzalnych procesów oraz ścisłej współpracy między zespołami development i QA.
