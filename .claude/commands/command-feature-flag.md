W mojej aplikacji chciałbym rozdzielić deploymenty od releasów wprowadzając system feature flag.

Powinien być możliwy do zastosowania:

- na poziomie endpointów API (app/api/flashcards, app/api/auth, app/api/generations)
- na poziomie stron Next.js – app/(auth)/login/page.tsx, app/(public)/signup/page.tsx, app/(public)/reset-password/page.tsx
- na poziomie widoczności funkcji flashcard – components/FlashcardGenerationView.tsx oraz components/ui/navigation

Na poziomie wspomnianych modułów powinienem być w stanie sprawdzić stan flagi określonej funkcjonalności, wg środowiska.

Zaprojektuj uniwersalny moduł TypeScript z którego będzie można korzystać na frontendzie i backendzie (src/lib/features), który będzie przechowywał konfigurację flag dla środowisk local, integration i production. Dodaj flagi dla "auth", "ai-generation" i "flashcards".

Środowisko dostarczę jako zmienną ENV_NAME (local, integration, prod)

Integracją zajmiemy się w kolejnym kroku. Zanim rozpoczniemy, zadaj mi 5 pytań, które ułatwią ci całą implementację.
