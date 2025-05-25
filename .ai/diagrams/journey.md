# Diagram Mermaid - Podróż Użytkownika

Diagram przedstawia kompleksową podróż użytkownika dla modułu logowania i rejestracji w aplikacji 10xCards, uwzględniając wszystkie ścieżki uwierzytelniania i główne funkcjonalności aplikacji.

```mermaid
stateDiagram-v2
    [*] --> StronaGlowna

    state "Strona Główna" as StronaGlowna {
        [*] --> SprawdzenieSesji
        state if_sesja <<choice>>
        SprawdzenieSesji --> if_sesja
        if_sesja --> PanelUzytkownika: Sesja aktywna
        if_sesja --> EkranLogowania: Brak sesji
    }

    state "Proces Uwierzytelniania" as Uwierzytelnianie {
        [*] --> EkranLogowania

        state "Ekran Logowania" as EkranLogowania {
            [*] --> FormularzLogowania
            FormularzLogowania --> WalidacjaLogowania
            state if_logowanie <<choice>>
            WalidacjaLogowania --> if_logowanie
            if_logowanie --> UstawienieSesjii: Dane poprawne
            if_logowanie --> BladLogowania: Dane niepoprawne
            BladLogowania --> FormularzLogowania
        }

        EkranLogowania --> EkranRejestracji: Link "Zarejestruj się"
        EkranLogowania --> OdzyskiwanieHasla: Link "Zapomniałem hasła"

        state "Ekran Rejestracji" as EkranRejestracji {
            [*] --> FormularzRejestracji
            FormularzRejestracji --> WalidacjaRejestracji
            state if_rejestracja <<choice>>
            WalidacjaRejestracji --> if_rejestracja
            if_rejestracja --> AutomatyczneLogowanie: Dane poprawne
            if_rejestracja --> BladRejestracji: Dane niepoprawne
            BladRejestracji --> FormularzRejestracji
            AutomatyczneLogowanie --> UstawienieSesjii
        }

        EkranRejestracji --> EkranLogowania: Link "Mam już konto"

        state "Odzyskiwanie Hasła" as OdzyskiwanieHasla {
            [*] --> FormularzOdzyskiwania
            FormularzOdzyskiwania --> WyslanieEmaila
            WyslanieEmaila --> KomunikatOWyslaniu
            KomunikatOWyslaniu --> EkranLogowania: Powrót do logowania
        }

        state "Reset Hasła" as ResetHasla {
            [*] --> SprawdzenieTokenu
            state if_token <<choice>>
            SprawdzenieTokenu --> if_token
            if_token --> FormularzNowegoHasla: Token ważny
            if_token --> BladTokenu: Token nieprawidłowy
            FormularzNowegoHasla --> ZapisNowegoHasla
            ZapisNowegoHasla --> SukcesowaZmianaHasla
            SukcesowaZmianaHasla --> EkranLogowania
            BladTokenu --> EkranLogowania
        }

        UstawienieSesjii --> [*]
    }

    state "Panel Użytkownika" as PanelUzytkownika {
        [*] --> GenerowanieFiszek

        state "Generowanie Fiszek" as GenerowanieFiszek {
            [*] --> FormularzTekstu
            FormularzTekstu --> GenerowanieAI
            GenerowanieAI --> ListaPropozycji
            ListaPropozycji --> ZapisaneFiszki: Zaakceptowane fiszki
        }

        GenerowanieFiszek --> MojeFiszki: Nawigacja
        GenerowanieFiszek --> SesjaNauki: Nawigacja
        GenerowanieFiszek --> ProfilUzytkownika: Nawigacja

        state "Moje Fiszki" as MojeFiszki {
            [*] --> ListaFiszek
            ListaFiszek --> EdycjaFiszki: Edytuj fiszkę
            ListaFiszek --> UsuwanieFiszki: Usuń fiszkę
            ListaFiszek --> DodawanieFiszki: Dodaj nową fiszkę
            EdycjaFiszki --> ListaFiszek
            UsuwanieFiszki --> ListaFiszek
            DodawanieFiszki --> ListaFiszek
        }

        MojeFiszki --> GenerowanieFiszek: Nawigacja
        MojeFiszki --> SesjaNauki: Nawigacja
        MojeFiszki --> ProfilUzytkownika: Nawigacja

        state "Sesja Nauki" as SesjaNauki {
            [*] --> PrzygotowanieSesji
            PrzygotowanieSesji --> WyswietlenieFiszki
            WyswietlenieFiszki --> OcenaFiszki
            OcenaFiszki --> NastepnaFiszka: Więcej fiszek
            OcenaFiszki --> ZakonczenieSesji: Koniec sesji
            NastepnaFiszka --> WyswietlenieFiszki
        }

        SesjaNauki --> GenerowanieFiszek: Nawigacja
        SesjaNauki --> MojeFiszki: Nawigacja
        SesjaNauki --> ProfilUzytkownika: Nawigacja

        state "Profil Użytkownika" as ProfilUzytkownika {
            [*] --> UstawieniaKonta
            UstawieniaKonta --> ZmianaHasla: Zmień hasło
            UstawieniaKonta --> UsunieciKonta: Usuń konto
            ZmianaHasla --> UstawieniaKonta
            UsunieciKonta --> ProcesWylogowania
        }

        ProfilUzytkownika --> GenerowanieFiszek: Nawigacja
        ProfilUzytkownika --> MojeFiszki: Nawigacja
        ProfilUzytkownika --> SesjaNauki: Nawigacja
        ProfilUzytkownika --> ProcesWylogowania: Wyloguj
    }

    state "Proces Wylogowania" as ProcesWylogowania {
        [*] --> UsuniecieSesjii
        UsuniecieSesjii --> WyczyszczenieCookies
        WyczyszczenieCookies --> [*]
    }

    state "Middleware Ochrony" as MiddlewareOchrony {
        [*] --> SprawdzenieAutoryzacji
        state if_autoryzacja <<choice>>
        SprawdzenieAutoryzacji --> if_autoryzacja
        if_autoryzacja --> DostepDoStrony: Użytkownik zalogowany
        if_autoryzacja --> PrzenienienieDoLogowania: Brak autoryzacji
        PrzenienienieDoLogowania --> EkranLogowania
    }

    StronaGlowna --> Uwierzytelnianie: Brak sesji
    Uwierzytelnianie --> PanelUzytkownika: Pomyślne logowanie
    PanelUzytkownika --> MiddlewareOchrony: Dostęp do chronionych tras
    MiddlewareOchrony --> PanelUzytkownika: Autoryzacja OK
    ProcesWylogowania --> StronaGlowna
    OdzyskiwanieHasla --> ResetHasla: Link z emaila

    note right of FormularzLogowania
        Pola: email, hasło
        Walidacja: format email, długość hasła
        Link do rejestracji i odzyskiwania hasła
    end note

    note right of FormularzRejestracji
        Pola: email, hasło, potwierdzenie hasła
        Walidacja: format email, siła hasła, zgodność haseł
        Automatyczne logowanie po rejestracji
    end note

    note right of MiddlewareOchrony
        Sprawdza sesję dla tras:
        /generate, /flashcards, /session, /profile
        Przekierowuje do /login jeśli brak sesji
    end note

    note right of GenerowanieFiszek
        Główna funkcjonalność aplikacji
        Tekst 1000-10000 znaków
        AI generuje propozycje fiszek
    end note
```

## Opis głównych ścieżek użytkownika

### 1. Nowy użytkownik (US-001)

- **Punkt wejścia**: Strona główna bez sesji
- **Ścieżka**: Strona główna → Ekran logowania → Link rejestracji → Formularz rejestracji → Automatyczne logowanie → Panel użytkownika
- **Cel**: Utworzenie konta i natychmiastowy dostęp do aplikacji

### 2. Powracający użytkownik (US-002)

- **Punkt wejścia**: Strona główna lub bezpośredni link
- **Ścieżka**: Sprawdzenie sesji → Ekran logowania (jeśli brak sesji) → Formularz logowania → Panel użytkownika
- **Cel**: Szybkie uwierzytelnienie i dostęp do funkcji

### 3. Odzyskiwanie dostępu

- **Punkt wejścia**: Ekran logowania
- **Ścieżka**: Link "Zapomniałem hasła" → Formularz odzyskiwania → Email z linkiem → Reset hasła → Powrót do logowania
- **Cel**: Przywrócenie dostępu do konta

### 4. Korzystanie z aplikacji

- **Punkt wejścia**: Panel użytkownika po zalogowaniu
- **Ścieżki**: Generowanie fiszek ↔ Moje fiszki ↔ Sesja nauki ↔ Profil
- **Cel**: Efektywne zarządzanie fiszkami i nauka

### 5. Bezpieczne zakończenie sesji

- **Punkt wejścia**: Dowolna strona w panelu użytkownika
- **Ścieżka**: Przycisk wylogowania → Usunięcie sesji → Strona główna
- **Cel**: Bezpieczne zakończenie pracy z aplikacją

## Kluczowe punkty decyzyjne

1. **Sprawdzenie sesji**: Czy użytkownik jest już zalogowany?
2. **Walidacja danych**: Czy wprowadzone dane są poprawne?
3. **Autoryzacja**: Czy użytkownik ma dostęp do żądanej strony?
4. **Token resetu**: Czy link do zmiany hasła jest ważny?

## Zabezpieczenia i UX

- **Middleware ochrony**: Automatyczne przekierowanie do logowania dla chronionych tras
- **Walidacja formularzy**: Sprawdzanie danych po stronie klienta i serwera
- **Komunikaty błędów**: Czytelne informacje o problemach
- **Responsywność**: Dostosowanie do różnych urządzeń
- **Dostępność**: Obsługa klawiatury i czytników ekranu
