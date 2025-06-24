# Ostateczny plan implementacji widoku nawigacji

## 1. Przegląd

Celem jest wdrożenie dwóch odrębnych systemów nawigacji, aby zapewnić optymalne doświadczenie dla różnych grup użytkowników:

1.  **Nawigacja publiczna:** Dla niezalogowanych użytkowników, widoczna na stronie docelowej (`/`). Będzie to nawigacja w stylu "one-page", która płynnie przewija do odpowiednich sekcji na stronie (np. "Funkcje", "Cennik"). Będzie również zawierać wyraźne przyciski "Zaloguj się" i "Zarejestruj się".
2.  **Nawigacja główna (prywatna):** Dla zalogowanych użytkowników. Zapewni dostęp do kluczowych widoków aplikacji, takich jak generowanie fiszek, zarządzanie nimi, sesja nauki oraz profil użytkownika, a także umożliwi wylogowanie.

## 2. Routing i struktura layoutu

Wykorzystamy grupy tras Next.js, aby logicznie oddzielić widoki publiczne od prywatnych.

- **`src/app/layout.tsx` (Layout główny):** Będzie zawierał wspólną strukturę HTML (`<html>`, `<body>`) oraz komponent `<PublicHeader />`. Ten layout obejmie wszystkie strony publiczne (np. `/`, `/login`, `/register`).
- **`src/app/(auth)/layout.tsx` (Layout prywatny):** Będzie dedykowany dla stron chronionych. Będzie zawierał komponent `<MainHeader />` z nawigacją dla zalogowanych użytkowników.

## 3. Struktura komponentów

### Nawigacja publiczna

```
src/app/layout.tsx
└── components/layout/PublicHeader.tsx (Server Component)
    ├── components/layout/Logo.tsx
    └── components/layout/PublicNav.tsx (Client Component)
        ├── next/link (dla linków do sekcji, np. /#features)
        └── shadcn/ui/Button (dla CTA "Zaloguj się", "Zarejestruj się")
```

### Nawigacja główna (prywatna)

```
src/app/(auth)/layout.tsx
└── components/layout/MainHeader.tsx (Server Component)
    ├── components/layout/Logo.tsx
    ├── components/layout/DesktopNav.tsx (Client Component)
    │   └── next/link
    ├── components/layout/MobileNav.tsx (Client Component)
    │   └── shadcn/ui/Sheet
    │       └── next/link
    └── components/layout/UserNav.tsx (Client Component)
        └── shadcn/ui/DropdownMenu
            ├── shadcn/ui/Avatar
            └── components/auth/LogoutButton.tsx (Client Component)
```

## 4. Szczegóły komponentów

### Komponenty nawigacji publicznej

#### `PublicHeader`

- **Opis komponentu:** Główny, serwerowy kontener nawigacji publicznej.
- **Główne elementy:** Elastyczny kontener (`div` z flexbox) zawierający `Logo` i `PublicNav`.
- **Propsy:** Brak.

#### `PublicNav`

- **Opis komponentu:** Kliencki komponent wyświetlający linki nawigacyjne (przewijające do sekcji na stronie głównej) oraz przyciski akcji "Zaloguj się" i "Zarejestruj się".
- **Główne elementy:** Kontener `nav` z listą linków (`<Link>`) oraz przyciskami (`Button` z shadcn/ui).
- **Obsługiwane interakcje:** Kliknięcie linku powoduje płynne przewinięcie. Kliknięcie przycisku przenosi do strony logowania lub rejestracji.
- **Typy:** `PublicNavItem[]`
- **Propsy:** `navItems: PublicNavItem[]`

---

### Komponenty nawigacji prywatnej

#### `MainHeader`

- **Opis komponentu:** Główny kontener nawigacji prywatnej, renderowany po stronie serwera. Jego zadaniem jest pobranie danych o zalogowanym użytkowniku i warunkowe wyświetlenie nawigacji.
- **Główne elementy:** Elastyczny kontener (`div` z flexbox) zawierający `Logo`, `DesktopNav`, `MobileNav` oraz `UserNav`.
- **Propsy:** `children` (dla zawartości strony).

#### `DesktopNav`

- **Opis komponentu:** Wyświetla linki nawigacyjne w widoku desktopowym. Podświetla aktywny link na podstawie bieżącej ścieżki URL.
- **Główne elementy:** Kontener `nav` zawierający listę linków (`<Link>`).
- **Obsługiwane interakcje:** Kliknięcie na link nawigacyjny.
- **Typy:** `NavItem[]`
- **Propsy:** `navItems: NavItem[]`

#### `MobileNav`

- **Opis komponentu:** Wyświetla ikonę "hamburgera" na mobile. Po kliknięciu otwiera panel boczny (`Sheet`) z listą linków.
- **Główne elementy:** Komponent `Sheet` z `SheetTrigger` i `SheetContent`.
- **Obsługiwane interakcje:** Otwarcie/zamknięcie panelu, nawigacja po kliknięciu linku.
- **Typy:** `NavItem[]`
- **Propsy:** `navItems: NavItem[]`

#### `UserNav`

- **Opis komponentu:** Wyświetla awatar użytkownika. Po kliknięciu rozwija menu (`DropdownMenu`) z opcjami "Profil" i "Wyloguj".
- **Główne elementy:** Komponent `DropdownMenu` z `DropdownMenuTrigger` (z `Avatar`) i `DropdownMenuContent`.
- **Obsługiwane interakcje:** Otwarcie menu, kliknięcie opcji.
- **Typy:** `User` (z `@supabase/supabase-js`)
- **Propsy:** `user: User`

#### `LogoutButton`

- **Opis komponentu:** Przycisk (lub element menu) odpowiedzialny za logikę wylogowania.
- **Główne elementy:** `DropdownMenuItem` z przypisaną funkcją `onClick`.
- **Obsługiwane interakcje:** Kliknięcie w celu wylogowania.
- **Propsy:** Brak.

## 5. Typy

### `PublicNavItem` (ViewModel)

- **Opis:** Typ dla elementów nawigacji publicznej.
- **Pola:**
  - `label: string` - Etykieta tekstowa linku (np. "Funkcje").
  - `href: string` - Ścieżka URL z hashem do sekcji (np. "/#features").

### `NavItem` (ViewModel)

- **Opis:** Typ dla elementów nawigacji prywatnej.
- **Pola:**
  - `label: string` - Etykieta (np. "Moje fiszki").
  - `href: string` - Ścieżka URL (np. "/flashcards").

### `User`

- **Opis:** Standardowy typ użytkownika z biblioteki Supabase (`@supabase/supabase-js`). Zawiera m.in. `id`, `email`, `user_metadata`. Nie ma potrzeby go definiować.

## 6. Zarządzanie stanem

- **Płynne przewijanie:** Globalny styl `scroll-behavior: smooth;` zostanie dodany do `src/app/globals.css`.
- **Stan aktywności linków:** `DesktopNav` i `MobileNav` (nawigacja prywatna) będą używać hooka `usePathname` z `next/navigation` do podświetlania aktywnego linku.
- **Stan otwarcia modali/paneli:** Zarządzany wewnętrznie przez komponenty `Sheet` i `DropdownMenu` z shadcn/ui.

## 7. Integracja API

- **Nawigacja prywatna (`MainHeader`):** Wykorzystuje `createServerComponentClient` do pobrania danych o użytkowniku przez `supabase.auth.getUser()`.
- **Wylogowanie (`LogoutButton`):** Używa `createClientComponentClient` do wywołania `supabase.auth.signOut()`, po czym przekierowuje użytkownika.
- **Nawigacja publiczna (`PublicHeader`):** Nie wymaga żadnej integracji z API.

## 8. Interakcje użytkownika

- **Nawigacja publiczna:**
  - Kliknięcie linku (np. "Funkcje") płynnie przewija stronę do odpowiedniej sekcji.
  - Kliknięcie "Zaloguj się" lub "Zarejestruj się" przenosi na odpowiednią stronę (`/login`, `/register`).
- **Nawigacja prywatna:**
  - Kliknięcie linku przenosi na odpowiednią podstronę wewnątrz aplikacji.
  - Kliknięcie awatara rozwija menu użytkownika.
  - Kliknięcie "Wyloguj" kończy sesję i przekierowuje do strony logowania.

## 9. Warunki i walidacja

- Rozdzielenie widoków publicznych i prywatnych jest realizowane na poziomie struktury katalogów i grup tras Next.js. Middleware (`middleware.ts`) chroni trasy w grupie `(auth)`, automatycznie przekierowując niezalogowanych użytkowników.

## 10. Obsługa błędów

- **Nawigacja publiczna:** Brak punktów krytycznych, które mogłyby generować błędy.
- **Nawigacja prywatna:** Potencjalny błąd podczas wylogowywania zostanie obsłużony w `LogoutButton` za pomocą bloku `try...catch` i komunikatu toast (np. z `sonner`).

## 11. Kroki implementacji

1.  **Stworzenie struktury plików:** Utworzenie w katalogu `src/components/layout/` komponentów: `PublicHeader.tsx`, `PublicNav.tsx`, `MainHeader.tsx`, `DesktopNav.tsx`, `MobileNav.tsx`, `UserNav.tsx` oraz `Logo.tsx`. W `src/components/auth/` stworzyć `LogoutButton.tsx`.
2.  **Implementacja strony głównej (one-page):** W pliku `src/app/page.tsx` zbudować strukturę strony docelowej z sekcjami posiadającymi odpowiednie `id` (np. `features`, `pricing`).
3.  **Implementacja nawigacji publicznej:** Zbudować komponenty `PublicHeader` i `PublicNav`.
4.  **Implementacja nawigacji prywatnej:** Zbudować komponenty `MainHeader` (z logiką pobierania usera), `DesktopNav`, `MobileNav`, `UserNav` oraz `LogoutButton` (z logiką wylogowania).
5.  **Konfiguracja layoutów:**
    - W `src/app/layout.tsx` umieścić `<PublicHeader />` wewnątrz `<body>`.
    - W `src/app/(auth)/layout.tsx` umieścić `<MainHeader>{children}</MainHeader>`.
6.  **Dodanie płynnego przewijania:** Dodać `html { scroll-behavior: smooth; }` do `src/styles/globals.css`.
7.  **Utworzenie strony profilu:** Stworzyć podstawowy plik `src/app/(auth)/profile/page.tsx`, aby link nawigacyjny z menu użytkownika działał.
8.  **Stylowanie i responsywność:** Dopracować style dla obu nawigacji za pomocą Tailwind CSS, zapewniając ich poprawne działanie na różnych szerokościach ekranu.
9.  **Testowanie kompleksowe:** Sprawdzić działanie obu nawigacji, płynnego przewijania, przechodzenia między stronami publicznymi i prywatnymi oraz proces logowania i wylogowywania.
