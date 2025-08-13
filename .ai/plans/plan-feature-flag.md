# Plan implementacji systemu Feature Flags

## 1. Opis systemu

System feature flags umożliwia kontrolowanie dostępności funkcjonalności w zależności od środowiska (local, integration, production). Rozdziela deploymenty od releasów.

## 2. Decyzje projektowe

- ✅ **Podejście**: opt-in (domyślnie wyłączone na produkcji)
- ✅ **Typ flag**: boolean (true/false)
- ✅ **Sprawdzanie**: build-time na poziomie modułu
- ✅ **Struktura danych**: feature → environments (feature-centric)
- ✅ **Fallback**: domyślnie local przy braku/błędnej ENV_NAME

## 3. Struktura modułu

```
src/lib/features/
├── types.ts      # Typy TypeScript
├── config.ts     # Konfiguracja flag
└── index.ts      # API modułu
```

## 4. Implementacja

### 4.1. Typy (`src/lib/features/types.ts`)

```typescript
export type Environment = "local" | "integration" | "production";
export type FeatureName = "auth" | "aiGeneration" | "flashcards";

export type FeatureFlag = {
  [K in Environment]: boolean;
};

export type FeatureConfig = {
  [K in FeatureName]: FeatureFlag;
};
```

### 4.2. Konfiguracja (`src/lib/features/config.ts`)

```typescript
import type { FeatureConfig } from "./types";

export const featureConfig: FeatureConfig = {
  auth: {
    local: true,
    integration: true,
    production: false, // opt-in dla produkcji
  },
  aiGeneration: {
    local: true,
    integration: true,
    production: false, // opt-in dla produkcji
  },
  flashcards: {
    local: true,
    integration: true,
    production: false, // opt-in dla produkcji
  },
};
```

### 4.3. Moduł główny (`src/lib/features/index.ts`)

```typescript
import { featureConfig } from "./config";
import type { Environment, FeatureName } from "./types";

function getEnvironment(): Environment {
  const env = process.env.ENV_NAME as Environment | undefined;

  if (!env || !["local", "integration", "production"].includes(env)) {
    console.warn(
      `Invalid or missing ENV_NAME: "${env}". Falling back to "local".`,
    );
    return "local";
  }

  return env;
}

const currentEnvironment = getEnvironment();

export function isFeatureEnabled(featureName: FeatureName): boolean {
  return featureConfig[featureName][currentEnvironment];
}

export { type FeatureName, type Environment } from "./types";
```

## 5. Integracja z aplikacją

### 5.1. API Endpoints

#### `/app/api/flashcards/route.ts`

```typescript
import { isFeatureEnabled } from "@/lib/features";

export async function POST(request: Request) {
  if (!isFeatureEnabled("flashcards")) {
    return NextResponse.json(
      { error: "Flashcards feature is currently disabled" },
      { status: 503 },
    );
  }
  // reszta logiki...
}

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled("flashcards")) {
    return NextResponse.json(
      { error: "Flashcards feature is currently disabled" },
      { status: 503 },
    );
  }
  // reszta logiki...
}
```

#### `/app/api/generations/route.ts`

```typescript
import { isFeatureEnabled } from "@/lib/features";

export async function POST(request: Request) {
  if (!isFeatureEnabled("aiGeneration")) {
    return NextResponse.json(
      { error: "AI generation feature is currently disabled" },
      { status: 503 },
    );
  }
  // reszta logiki...
}
```

#### `/app/api/auth/login/route.ts`

```typescript
import { isFeatureEnabled } from "@/lib/features";

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled("auth")) {
    return NextResponse.json(
      { success: false, error: "Authentication feature is currently disabled" },
      { status: 503 },
    );
  }
  // reszta logiki...
}
```

### 5.2. Next.js Pages

#### `/app/(public)/login/page.tsx`

```typescript
import { isFeatureEnabled } from "@/lib/features";
import { redirect } from "next/navigation";

export default function LoginPage() {
  if (!isFeatureEnabled('auth')) {
    redirect('/');
  }

  return (
    // komponenty strony...
  );
}
```

#### `/app/(public)/reset-password/page.tsx`

```typescript
import { isFeatureEnabled } from "@/lib/features";
import { redirect } from "next/navigation";

export default function ResetPasswordPage() {
  if (!isFeatureEnabled('auth')) {
    redirect('/');
  }

  return (
    // komponenty strony...
  );
}
```

### 5.3. Komponenty

#### `/components/flashcard-generation/FlashcardGenerationView.tsx`

```typescript
"use client";
import { isFeatureEnabled } from "@/lib/features";

export function FlashcardGenerationView() {
  if (!isFeatureEnabled('aiGeneration')) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            AI generation feature is currently disabled
          </p>
        </CardContent>
      </Card>
    );
  }

  // reszta komponentu...
}
```

#### `/components/layout/UserNav.tsx`

```typescript
"use client";
import { isFeatureEnabled } from "@/lib/features";

export function UserNav({ user }: UserNavProps) {
  if (!isFeatureEnabled("auth")) {
    return null;
  }

  // reszta komponentu...
}
```

## 6. Konfiguracja środowiska

```bash
# Ustawienie zmiennej środowiskowej
ENV_NAME=local      # dla developmentu
ENV_NAME=integration # dla testów integracyjnych
ENV_NAME=production  # dla produkcji
```

## 7. Checklist implementacji

### Moduł feature flags

- [ ] Utworzenie `src/lib/features/types.ts`
- [ ] Utworzenie `src/lib/features/config.ts`
- [ ] Utworzenie `src/lib/features/index.ts`

### Integracja z API

- [ ] `/api/flashcards` - dodanie sprawdzania flagi `flashcards`
- [ ] `/api/generations` - dodanie sprawdzania flagi `aiGeneration`
- [ ] `/api/auth/login` - dodanie sprawdzania flagi `auth`

### Integracja z pages

- [ ] `/login/page.tsx` - redirect gdy `auth` wyłączone
- [ ] `/reset-password/page.tsx` - redirect gdy `auth` wyłączone

### Integracja z komponentami

- [ ] `FlashcardGenerationView` - warunkowe renderowanie
- [ ] `UserNav` - warunkowe renderowanie

### Konfiguracja

- [ ] Dodanie zmiennej `ENV_NAME` do plików środowiskowych
- [ ] Testowanie dla każdego środowiska

## 8. Uwagi implementacyjne

- **Build-time**: Flagi sprawdzane podczas budowania, zmiana wymaga rebuildu
- **Type safety**: Używaj typu `FeatureName` zamiast stringów
- **Błędy**: Zwracaj kod 503 gdy funkcja wyłączona
- **Fallback**: Automatyczny fallback do `local` przy braku ENV_NAME

## 9. Przykład użycia

```typescript
import { isFeatureEnabled } from "@/lib/features";

// W komponencie lub API
if (!isFeatureEnabled("auth")) {
  // funkcja wyłączona - zwróć błąd lub przekieruj
  return;
}
// funkcja włączona - kontynuuj
```

## 10. Dodawanie nowej flagi

1. Dodaj nazwę do typu `FeatureName` w `types.ts`
2. Dodaj konfigurację w `config.ts` dla wszystkich środowisk
3. TypeScript automatycznie wymusi kompletność

```typescript
// types.ts
export type FeatureName = 'auth' | 'aiGeneration' | 'flashcards' | 'newFeature';

// config.ts
newFeature: {
  local: true,
  integration: true,
  production: false,
}
```
