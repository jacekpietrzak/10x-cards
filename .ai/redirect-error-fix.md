# Fix: Next.js Redirect Error w Server Actions

## 🐛 Problem

Po pomyślnej rejestracji i wylogowaniu użytkownik otrzymywał błąd "An unexpected error occurred" mimo że operacje zakończyły się sukcesem.

## 🔍 Przyczyna

W Next.js 15, gdy `redirect()` jest wywołane w Server Action, rzuca to specjalny błąd z `digest` zawierającym `NEXT_REDIRECT`. To jest **normalne zachowanie**, ale nasz `try-catch` w komponentach klienckich interpretował to jako prawdziwy błąd.

## ✅ Rozwiązanie

### 1. Utility Function (`src/lib/utils.ts`)

Dodano funkcję `isRedirectError()` do rozpoznawania Next.js redirect errors:

```typescript
export function isRedirectError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.includes("NEXT_REDIRECT")
  );
}
```

### 2. RegisterForm Update

W `src/components/auth/RegisterForm.tsx`:

```typescript
} catch (error) {
  // Next.js redirect() throws a special error that should be ignored
  if (isRedirectError(error)) {
    // This is a Next.js redirect, which is expected behavior
    return;
  }

  console.error("Registration error:", error);
  setError("An unexpected error occurred. Please try again.");
}
```

### 3. LogoutButton Update

W `src/components/auth/LogoutButton.tsx` - ta sama logika.

## 🎯 Rezultat

- ✅ Rejestracja: Użytkownik jest przekierowywany na `/generate` bez błędów
- ✅ Wylogowanie: Użytkownik jest przekierowywany na `/` bez błędów
- ✅ Prawdziwe błędy nadal są poprawnie obsługiwane i wyświetlane

## 📚 Context

To jest znana charakterystyka Next.js App Router - `redirect()` w Server Actions rzuca błąd, który jest przechwytywany przez framework do wykonania przekierowania. Komponenty klienckie muszą rozpoznawać i ignorować te "błędy".

## 🧪 Test

1. Zarejestruj nowego użytkownika → brak błędu, przekierowanie na `/generate`
2. Wyloguj się → brak błędu, przekierowanie na `/`
3. Spróbuj zarejestrować istniejący email → poprawny błąd "already exists"
