# Specyfikacja modułu autoryzacji i uwierzytelniania – 10xCards

> Dokumentacja opisuje architekturę funkcjonalności rejestracji, logowania, wylogowywania oraz odzyskiwania hasła użytkowników zgodnie z wymaganiami US-001 i US-002 z pliku PRD oraz technologicznym stosie z plików tech-stac.md i ui-plan.md.

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Layouty i nawigacja

- **AuthLayout** (src/app/(auth)/layout.tsx)

  - Domyślny layout dla stron: `/login`, `/register`, `/forgot-password`, `/reset-password`
  - Minimalna nawigacja: logo, krótka informacja, odnośnik powrotny do /login lub /register
  - Brak bocznej nawigacji głównej, wyraźne CTA

- **MainLayout** (src/app/layout.tsx)
  - Layout dla chronionych stron: `/generate`, `/flashcards`, `/session`, `/profile`
  - Górne menu z odnośnikami: Generowanie fiszek, Moje fiszki, Sesja nauki, Profil, Wyloguj
  - Wersja mobilna: hamburger menu (z komponentem shadcn/ui)
  - Warunkowe renderowanie nawigacji: jeśli brak sesji, przekierowanie do `/login`

### 1.2 Strony i komponenty

#### 1.2.1 `/register` – Rejestracja

- **Strona**: src/app/register/page.tsx (komponent klienta – `use client`)
- **Formularz**: `RegisterForm` (src/components/auth/RegisterForm.tsx)
  - Pola: `email` (input type="email"), `password` (type="password"), `confirmPassword` (type="password")
  - Walidacja z użyciem Zod + react-hook-form:
    - `email`: poprawny format
    - `password`: min. 8 znaków, wielkie litery, liczba (opcjonalnie)
    - `confirmPassword`: musi być zgodne z `password`
  - Komunikaty błędów pod polami (FormError) oraz toast przy błędzie sieci/serwera
  - Przyciski: "Zarejestruj" (shadcn/ui Button), wskaźnik ładowania
  - Po sukcesie: użytkownik zostaje automatycznie zalogowany, sesja jest ustawiona, a następnie przekierowany do `/generate` z komunikatem powitalnym

#### 1.2.2 `/login` – Logowanie

- **Strona**: src/app/login/page.tsx (`use client`)
- **Formularz**: `LoginForm` (src/components/auth/LoginForm.tsx)
  - Pola: `email`, `password`
  - Walidacja z Zod + react-hook-form (podstawowa)
  - Komunikaty: nieprawidłowe dane logowania, błąd sieci
  - Dodatki: link do `/forgot-password`, przycisk "Zaloguj"
  - Po sukcesie: redirect do `/generate`

#### 1.2.3 `/forgot-password` – Odzyskiwanie hasła

- **Strona**: src/app/forgot-password/page.tsx (`use client`)
- **Formularz**: `ForgotPasswordForm` (src/components/auth/ForgotPasswordForm.tsx)
  - Pole: `email`
  - Walidacja formatu email
  - Po wysłaniu: komunikat o wysłaniu linku do resetu
  - Obsługa błędów: email nieznaleziony, błąd serwera

#### 1.2.4 `/reset-password` – Ustawienie nowego hasła

- **Strona**: src/app/reset-password/page.tsx (`use client`)
  - Odczyt tokenu `access_token` z query string
- **Formularz**: `ResetPasswordForm` (src/components/auth/ResetPasswordForm.tsx)
  - Pola: `newPassword`, `confirmPassword`
  - Walidacja: min. 8 znaków, pola zgodne, obecność tokenu
  - Po sukcesie: redirect do `/login` z komunikatem o pomyślnej zmianie hasła
  - Obsługa błędów: nieprawidłowy lub przeterminowany token, błąd serwera

### 1.3 Komponenty wspólne

- `FormInput`, `FormButton`, `FormError` w `src/components/ui` – dostosowane do shadcn/ui
- `ToastNotification` dla globalnych komunikatów (sukces/błąd)
- `PasswordMeter` (opcjonalnie) do oceny siły hasła

### 1.4 Obsługa walidacji i komunikatów

- Zdefiniowanie schematów Zod w `src/lib/schemas/auth.ts`
- React-hook-form integracja z Zod
- Inline error: pod polem formularza
- Global error: toast lub banner w górnej części formularza
- Loading state: dezaktywacja przycisków + spinner

### 1.5 Kluczowe scenariusze UX

1. Użytkownik bez konta → `/register` → poprawne formularze → użytkownik jest automatycznie zalogowany i przekierowany do `/generate`
2. Użytkownik z kontem → `/login` → błędne dane → inline error → ponowienie
3. Użytkownik zapomniał hasła → `/forgot-password` → wprowadza email → otrzymuje maila → klika link → `/reset-password` → nowy password → powrót do `/login`
4. Po zalogowaniu → `MainLayout` + dostęp do chronionych tras → wylogowanie

---

## 2. LOGIKA BACKENDOWA

### 2.1 Modele danych i typy TypeScript

- Brak niestandardowej tabeli użytkownika – korzystamy z Supabase Auth
- Definicje typów odpowiedzi i błędów w `src/lib/types/auth.ts`:
  ```typescript
  export type AuthResponse = {
    data?: any;
    error?: {
      message: string;
      status: number;
    };
  };
  ```

### 2.2 Endpoints API (Route Handlers)

Każdy endpoint w katalogu `src/app/api/auth/[action]/route.ts`:

- POST `/api/auth/register`

  - Body: `{ email: string; password: string }`
  - Logika: walidacja Zod → `supabase.auth.signUp` → obsługa błędów → 200/400/500

- POST `/api/auth/login`

  - Body: `{ email: string; password: string }`
  - Logika: walidacja Zod → `supabase.auth.signInWithPassword` → ustawienie cookie → 200/401/500

- POST `/api/auth/logout`

  - Body: pusty
  - Logika: `supabase.auth.signOut()` → usunięcie cookie → 200/500

- POST `/api/auth/forgot-password`

  - Body: `{ email: string }`
  - Logika: walidacja → `supabase.auth.resetPasswordForEmail` → 200/404/500

- POST `/api/auth/reset-password`
  - Body: `{ access_token: string; newPassword: string }`
  - Logika: walidacja → `supabase.auth.updateUser({ password: newPassword })` (z tokenem w nagłówku) → 200/400/500

### 2.3 Walidacja i transformacja danych

- Schematy Zod w `src/lib/schemas/auth.ts`
- Middleware obsługujące błędy walidacji: zwraca 400 z opisem problemu

### 2.4 Obsługa wyjątków i kody HTTP

- 400 Bad Request – niepoprawne dane wejściowe
- 401 Unauthorized – brak sesji lub nieprawidłowe dane logowania
- 404 Not Found – email nie istnieje przy resetowaniu
- 500 Internal Server Error – niespodziewane błędy
- Format odpowiedzi: `{ success: boolean; message?: string; error?: string }`

### 2.5 Middleware ochrony tras

- `middleware.ts` w katalogu root Next.js
- Ochrona ścieżek zaczynających się od `/generate`, `/flashcards`, `/session`, `/profile`
- Przekierowanie do `/login` dla niezweryfikowanych użytkowników

---

## 3. SYSTEM AUTENTYKACJI (Supabase Auth)

### 3.1 Konfiguracja klienta

- Biblioteki: `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `@supabase/auth-helpers-react`
- Plik: `src/lib/services/supabaseClient.ts`
  ```typescript
  import { createClient } from "@supabase/supabase-js";
  export const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  ```
- Plik: `src/lib/services/supabaseServerClient.ts` (dla server components i route handlers)

- Zmienne środowiskowe w `.env.local`:
  ```dotenv
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=... # do operacji reset-password
  ```

### 3.2 Proces rejestracji

1. Frontend wysyła żądanie POST do `/api/auth/register`
2. Route handler wywołuje `supabase.auth.signUp`
3. `supabase.auth.signUp` zwraca obiekt z user i session → sesja jest ustawiana w cookie i kontekście aplikacji
4. Frontend przekierowuje użytkownika do `/generate` z komunikatem powitalnym

### 3.3 Proces logowania

1. Frontend POST `/api/auth/login`
2. Route handler `supabase.auth.signInWithPassword`
3. Ustawienie cookie sesji (Govt JWT)
4. Przekierowanie do chronionej strony

### 3.4 Wylogowanie

- Wywołanie `supabase.auth.signOut()` w endpoint `/api/auth/logout` lub w client-side
- Usunięcie sesji i redirect do `/login`

### 3.5 Odzyskiwanie hasła

1. Klient POST `/api/auth/forgot-password`
2. Supabase wysyła link resetu (z wygenerowanym tokenem)
3. Użytkownik klika link → `/reset-password?access_token=...`
4. Formularz ResetPasswordForm → POST `/api/auth/reset-password` z tokenem i nowym hasłem
5. Supabase `updateUser` z tokenem → hasło zmienione

### 3.6 Ochrona sesji w aplikacji

- W `layout.tsx` (MainLayout) opakowanie `SessionContextProvider`
- W server components: `createServerComponentSupabaseClient({ headers, cookies })` do pobierania sesji i usera
- W client components: `useSession`, `useSupabaseClient`
- Middleware Next.js: automatyczne przekierowania dla nieautoryzowanych

### 3.7 Moduły i serwisy

- `src/lib/services/authService.ts`:
  ```typescript
  export const register = (data) => fetch('/api/auth/register', ...);
  export const login = (data) => fetch('/api/auth/login', ...);
  // itd.
  ```
- `src/lib/schemas/auth.ts` – definicje Zod
- `src/components/auth/*Form.tsx` – wrappery komponentów formularzy
- `src/app/api/auth/*/route.ts` – route handlers

---
