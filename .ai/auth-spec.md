# Specyfikacja Techniczna: Moduł Uwierzytelniania Użytkowników

## Wprowadzenie

Niniejszy dokument opisuje szczegółową architekturę i plan wdrożenia funkcjonalności uwierzytelniania użytkowników (rejestracja, logowanie, wylogowywanie, odzyskiwanie hasła) w aplikacji 10xCards. Rozwiązanie opiera się na tech-stacku projektu, w skład którego wchodzą Next.js 15 (App Router), React 19, TypeScript, Supabase (Auth, DB) oraz biblioteka komponentów Shadcn/ui.

Architektura została zaprojektowana w zgodzie z wymaganiami funkcjonalnymi z dokumentu PRD (`.ai/prd.md`), ze szczególnym uwzględnieniem historyjek użytkownika US-001, US-002 oraz US-009.

---

## 1. Architektura Interfejsu Użytkownika (Frontend)

Logika frontendu zostanie oparta o Next.js App Router, z wyraźnym podziałem na komponenty klienckie (Client Components) do obsługi interakcji i formularzy oraz komponenty serwerowe (Server Components) do renderowania widoków i logiki nawigacji.

### 1.1. Struktura Stron i Layoutów

Aby poprawnie oddzielić ścieżki publiczne od prywatnych, wprowadzimy następujące zmiany w strukturze `src/app`:

- **Grupa `(public)`:** Nowa grupa tras dla stron dostępnych bez logowania.

  - `src/app/(public)/login/page.tsx`
  - `src/app/(public)/register/page.tsx`
  - `src/app/(public)/forgot-password/page.tsx`
  - `src/app/(public)/reset-password/page.tsx`
  - **Layout:** `src/app/(public)/layout.tsx` będzie renderować `PublicHeader`, zawierający linki do logowania i rejestracji.

- **Grupa `(auth)`:** Istniejąca grupa dla stron wymagających autentykacji.

  - `src/app/(auth)/generate/page.tsx` (strona docelowa po logowaniu)
  - `src/app/(auth)/flashcards/page.tsx`
  - `src/app/(auth)/profile/page.tsx`
  - **Layout:** `src/app/(auth)/layout.tsx` będzie renderować `MainHeader` z nawigacją użytkownika (`UserNav`) i przyciskiem wylogowania.

- **Middleware (`middleware.ts` na poziomie głównym):**
  - Będzie pełnił rolę strażnika (gatekeeper).
  - Dla wszystkich zapytań do ścieżek w grupie `(auth)`, sprawdzi istnienie aktywnej sesji użytkownika.
  - W przypadku braku sesji, przekieruje użytkownika na stronę `/login`.
  - W przypadku, gdy zalogowany użytkownik spróbuje wejść na `/login` lub `/register`, przekieruje go na `/generate`.
  - Będzie odpowiedzialny za odświeżanie tokenów sesji przy użyciu pakietu `@supabase/ssr`.

### 1.2. Komponenty Interfejsu Użytkownika

Wykorzystamy istniejące komponenty, rozbudowując je o logikę integracji.

- **Formularze (Client Components):**

  - `src/components/auth/LoginForm.tsx`
  - `src/components/auth/RegisterForm.tsx`
  - `src/components/auth/ForgotPasswordForm.tsx`
  - `src/components/auth/ResetPasswordForm.tsx`
  - **Odpowiedzialność:** Zarządzanie stanem formularza (wartości pól, stan ładowania, błędy), walidacja po stronie klienta (z użyciem `zod` i `react-hook-form`) w celu natychmiastowego feedbacku.
  - **Integracja:** Będą wywoływać dedykowane akcje serwerowe (Server Actions) do obsługi logiki autentykacji. Nie będą bezpośrednio komunikować się z API Supabase.
  - **Obsługa błędów:** Wyświetlanie komunikatów o błędach zwróconych przez Server Actions w komponencie `FormError`.

- **Nagłówki i Nawigacja:**
  - `src/components/layout/ConditionalHeader.tsx`: Komponent serwerowy, który na podstawie statusu sesji (pobranego po stronie serwera) zdecyduje o wyrenderowaniu `PublicHeader` lub `MainHeader`.
  - `src/components/layout/UserNav.tsx`: Wyświetli awatar/email użytkownika i menu z linkiem do profilu oraz komponentem `LogoutButton`.
  - `src/components/auth/LogoutButton.tsx`: Prosty komponent kliencki, który wywoła akcję serwerową `logout()` i przekieruje użytkownika.

### 1.3. Scenariusze Użytkownika

- **Rejestracja (US-001):**

  1. Użytkownik wypełnia `RegisterForm`.
  2. Po stronie klienta następuje walidacja (np. format email, siła hasła, zgodność haseł).
  3. Po kliknięciu "Zarejestruj" wywoływana jest akcja serwerowa `register`.
  4. W przypadku sukcesu (konto utworzone w Supabase), użytkownik jest automatycznie logowany, a **akcja serwerowa `register`** przekierowuje go na stronę `/generate`.
  5. W przypadku błędu (np. email zajęty), akcja zwraca błąd, który `RegisterForm` wyświetla w `FormError`.

- **Logowanie (US-002):**

  1. Użytkownik wypełnia `LoginForm`.
  2. Kliknięcie "Zaloguj" wywołuje akcję serwerową `login`.
  3. W przypadku sukcesu (poprawne dane), tworzona jest sesja (zapisywana w cookies), a **akcja serwerowa `login`** przekierowuje go na `/generate`.
  4. W przypadku błędu (nieprawidłowe dane), `LoginForm` wyświetla stosowny komunikat.

- **Odzyskiwanie hasła (US-002):**
  1. Użytkownik podaje email w `ForgotPasswordForm` i wysyła formularz.
  2. Akcja serwerowa `sendPasswordReset` instruuje Supabase do wysłania emaila z linkiem.
  3. Użytkownik klika w link i trafia na stronę `/reset-password` (z tokenem w URL).
  4. `ResetPasswordForm` pozwala na wprowadzenie i potwierdzenie nowego hasła.
  5. Akcja serwerowa `updatePassword` aktualizuje hasło w Supabase. Użytkownik jest informowany o sukcesie i może się zalogować.

---

## 2. Logika Backendowa

Zamiast tradycyjnych endpointów API w `src/app/api`, wykorzystamy **Next.js Server Actions**, aby uprościć architekturę i zwiększyć bezpieczeństwo.

### 2.1. Server Actions

Wszystkie akcje związane z autentykacją znajdą się w nowym pliku: `src/lib/actions/auth.actions.ts`.

- `login(formData: FormData)`:

  - Waliduje dane wejściowe przy użyciu schemy Zod z `src/lib/schemas/auth.ts`.
  - Tworzy serwerowego klienta Supabase.
  - Wywołuje `supabase.auth.signInWithPassword()`.
  - W przypadku błędu, zwraca obiekt `{ error: 'Nieprawidłowe dane logowania.' }`.
  - W przypadku sukcesu, wywołuje `revalidatePath` i `redirect`.

- `register(formData: FormData)`:

  - Waliduje dane wejściowe (w tym sprawdzenie, czy hasła są identyczne).
  - Wywołuje `supabase.auth.signUp()`.
  - Obsługuje błąd, gdy email jest już zajęty.
  - Po sukcesie, przekierowuje zalogowanego użytkownika.

- `logout()`:

  - Wywołuje `supabase.auth.signOut()`.
  - Przekierowuje na stronę główną (`/`).

- `sendPasswordReset(formData: FormData)`:

  - Waliduje email.
  - Wywołuje `supabase.auth.resetPasswordForEmail()`, podając URL do strony resetowania hasła w opcjach.

- `updatePassword(formData: FormData)`:
  - Waliduje nowe hasło.
  - Używa sesji (z odczytanego tokena w URL) do zaktualizowania hasła użytkownika przez `supabase.auth.updateUser()`.

### 2.2. Modele Danych i Walidacja

Źródłem prawdy dla walidacji będą schematy Zod w `src/lib/schemas/auth.ts`.

- `LoginSchema`: `email` (z walidacją formatu), `password` (z min. długością).
- `RegisterSchema`: `email`, `password`, `confirmPassword`. Zostanie dodana reguła `.refine()` do sprawdzania zgodności haseł.

Schematy te będą używane zarówno w komponentach klienckich (z `react-hook-form`), jak i w Server Actions do walidacji serwerowej.

### 2.3. Obsługa Wyjątków

Każda akcja serwerowa będzie opakowana w blok `try...catch`. Błędy rzucane przez Supabase (`AuthApiError`) będą przechwytywane i mapowane na zrozumiałe dla użytkownika komunikaty, które następnie będą zwracane jako część obiektu odpowiedzi i wyświetlane w formularzu.

---

## 3. System Autentykacji (Supabase Auth)

Sercem systemu będzie usługa Supabase Auth, zintegrowana z Next.js za pomocą oficjalnego pakietu `@supabase/ssr`.

### 3.1. Konfiguracja Supabase

- **Zmienne środowiskowe:** Plik `.env.local` musi zawierać klucze `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Szablony Email:** W panelu Supabase należy skonfigurować szablon "Reset Password", aby link w nim zawarty kierował do `https://<domena-aplikacji>/reset-password`.
- **Potwierdzenie Email:** Zgodnie z US-001, który zakłada natychmiastowe zalogowanie po rejestracji, opcja "Secure email confirmation" w panelu Supabase Auth zostanie **wyłączona** dla MVP.

### 3.2. Integracja z Next.js (@supabase/ssr)

Wykorzystamy istniejące pliki `utils` do obsługi klienta Supabase:

- `src/utils/supabase/client.ts`: Używa `createBrowserClient()` do stworzenia instancji Supabase po stronie przeglądarki.
- `src/utils/supabase/server.ts`: Używa `createServerClient()` do stworzenia instancji w komponentach serwerowych i akcjach serwerowych. Klient ten operuje na `cookies`.
- `src/utils/supabase/middleware.ts`: Używa `createMiddlewareClient()` w głównym `middleware.ts` do zarządzania sesją (odczyt, zapis, odświeżanie tokena) w kontekście każdego zapytania HTTP.

### 3.3. Dostęp do Danych i Row Level Security (RLS)

- Opisana architektura jest fundamentem pod wdrożenie RLS, co jest kluczowe dla spełnienia wymagania US-009 (prywatność danych).
- Po zalogowaniu, `id` użytkownika z Supabase (`auth.uid()`) będzie dostępne w kontekście zapytań do bazy danych.
- Należy utworzyć nowe migracje SQL, które włączą RLS dla tabel `flashcards`, `generations` itd. i dodadzą polityki (policies) zapewniające, że operacje `SELECT`, `INSERT`, `UPDATE`, `DELETE` są możliwe tylko dla wierszy, gdzie `user_id` zgadza się z `auth.uid()`. To uniemożliwi jednemu użytkownikowi dostęp do danych innego.
