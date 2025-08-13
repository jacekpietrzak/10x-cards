# Deployment Setup - Vercel via GitHub Actions

Ten dokument opisuje proces konfiguracji CI/CD pipeline dla deploymentu aplikacji 10x-cards na Vercel przy użyciu GitHub Actions.

## Wymagane sekrety w GitHub

Aby uruchomić pipeline deployment, musisz skonfigurować następujące sekrety w ustawieniach repozytorium GitHub (Settings → Secrets and variables → Actions):

### Sekrety Vercel

1. **VERCEL_TOKEN**
   - Źródło: [Vercel Dashboard → Account → Tokens](https://dashboard.vercel.com/account/tokens)
   - Utwórz nowy token z odpowiednimi uprawnieniami
   - Skopiuj wartość i dodaj jako sekret w GitHub

2. **VERCEL_ORG_ID** i **VERCEL_PROJECT_ID**
   - Uruchom lokalnie: `vercel login` (jeśli jeszcze nie jesteś zalogowany)
   - Uruchom lokalnie: `vercel link` (połącz projekt z Vercel)
   - Znajdź wartości w pliku `.vercel/project.json` w root projektu
   - Dodaj obie wartości jako oddzielne sekrety w GitHub

### Sekrety aplikacji

3. **ENV_NAME**
   - Wartość: `production`
   - Używane przez system feature flags do określenia środowiska

4. **NEXT_PUBLIC_SUPABASE_URL**
   - URL Twojego projektu Supabase (np. `https://abc123.supabase.co`)

5. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Publiczny klucz API Supabase (anon/public key)

6. **OPENROUTER_API_KEY**
   - Klucz API OpenRouter do komunikacji z modelami AI

## Konfiguracja Environment w GitHub

Pipeline używa environment o nazwie `production` dla większego bezpieczeństwa. Skonfiguruj go w GitHub:

1. Idź do Settings → Environments
2. Utwórz nowy environment o nazwie `production`
3. (Opcjonalnie) Skonfiguruj required reviewers dla dodatkowej kontroli
4. (Opcjonalnie) Skonfiguruj deployment branches na `main`

## Jak uruchomić deployment

1. **Automatyczny deployment:**
   - Push do branch `main` automatycznie uruchamia pipeline deployment
   - Pipeline składa się z 4 etapów: Lint → Unit Tests → Build → Deploy

2. **Pipeline flow:**
   ```
   Lint Code
   ↓
   Unit Tests (równolegle z lint)
   ↓
   Build Application
   ↓
   Deploy to Vercel
   ↓
   Status Comment
   ```

3. **Monitoring:**
   - Status deployment jest komentowany automatycznie w commit
   - Logi dostępne w zakładce Actions na GitHub

## Troubleshooting

### Częste problemy:

1. **Błąd "VERCEL_TOKEN not found"**
   - Upewnij się, że token jest dodany w GitHub Secrets
   - Sprawdź czy token nie wygasł

2. **Błąd "Project not linked"**
   - Uruchom lokalnie `vercel link` aby połączyć projekt
   - Skopiuj VERCEL_ORG_ID i VERCEL_PROJECT_ID z `.vercel/project.json`

3. **Błąd podczas build**
   - Sprawdź czy wszystkie zmienne środowiskowe są ustawione
   - Zweryfikuj poprawność kluczy Supabase i OpenRouter

4. **Environment "production" not found**
   - Utwórz environment w GitHub Settings → Environments

## Bezpieczeństwo

- Wszystkie zmienne środowiskowe są przekazywane jako sekrety GitHub
- Production environment może wymagać dodatkowej autoryzacji
- Build i deployment są izolowane w osobnych job'ach
- Artefakty build są przechowywane przez maksymalnie 1 dzień

## Lokalny development

Dla lokalnego developmentu użyj:
```bash
npm run dev
```

Dla lokalnego deploymentu na Vercel:
```bash
vercel --prod
```