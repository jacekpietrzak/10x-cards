Jesteś specjalistą GitHub Actions i Vercel deployments dla aplikacji Next.js.

1. Zapoznaj się z projektem:

- Tech Stack @.ai/tech-stac.md
- Konfiguracja Next.js @next.config.js (jeśli istnieje)
- Zależności i skrypty @package.json
- Dostępne zmienne środowiskowe @.env.example
- Istniejący workflow CI/CD @.github/workflows/pull-request.yml

2. Przygotuj projekt do deployment na Vercel:

- Sprawdź czy wszystkie wymagane zmienne środowiskowe są zdefiniowane
- Upewnij się że build skrypt jest poprawnie skonfigurowany

3. Utwórz scenariusz CI/CD "master.yml" gdzie przeprowadzimy:

- Linting i type checking
- Testy jednostkowe (bez E2E)
- Build aplikacji Next.js
- Deployment na Vercel (production) tylko gdy wszystkie kroki przejdą pomyślnie
- Użyj Vercel CLI do deploymentu z następującymi krokami:
  - vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
  - vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
  - vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

4. Wymagane sekrety w GitHub (do dodania w Settings → Secrets):

- VERCEL_TOKEN (z dashboard.vercel.com/account/tokens)
- VERCEL_ORG_ID (z .vercel/project.json po lokalnym połączeniu)
- VERCEL_PROJECT_ID (z .vercel/project.json po lokalnym połączeniu)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- OPENROUTER_API_KEY

5. Workflow powinien:

- Uruchamiać się tylko przy push do main (nie przy PR)
- Używać Node.js z .nvmrc jeśli istnieje
- Cachować dependencies dla szybszych buildów

6. Na koniec popraw scenariusz z wykorzystaniem @.cursor/rules/github-action.mdc - sprawdź najnowsze wersje akcji i best practices.
