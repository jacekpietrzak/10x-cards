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

## Zmienne środowiskowe endpointu importu (Vercel)

Endpoint `POST /api/import` (programatyczny import fiszek bez sesji przeglądarki) odczytuje trzy zmienne w czasie działania (runtime). W odróżnieniu od powyższych sekretów GitHub, te zmienne ustaw **bezpośrednio w panelu Vercel** → Project → Settings → Environment Variables, ze scope **Production** — krok `vercel pull --environment=production` w pipeline pobiera je do deploymentu, a funkcje serwerowe czytają je z konfiguracji projektu Vercel.

- **IMPORT_API_KEY**
  - Statyczny token bearer chroniący endpoint (`Authorization: Bearer <IMPORT_API_KEY>`)
  - Wygeneruj losowy sekret: `openssl rand -hex 32`
  - To entropia tego klucza jest faktyczną granicą bezpieczeństwa — trzymaj w tajemnicy, rotuj przez podmianę wartości
- **IMPORT_USER_ID**
  - UUID konta, do którego trafiają importowane fiszki
  - Znajdź w Supabase → Authentication → Users (lub `select id from auth.users where email = '...'`)
- **SUPABASE_SERVICE_ROLE_KEY**
  - Klucz service-role Supabase — **omija RLS, nigdy nie eksponuj po stronie klienta**
  - Wymagany przez `createAdminClient()`, który zapisuje fiszki w imieniu `IMPORT_USER_ID`

**Redeploy:** zmiany zmiennych w panelu Vercel wchodzą w życie przy kolejnym uruchomieniu workflow „Production Deployment" (push do `main` lub ponowne uruchomienie joba), ponieważ `vercel pull` pobiera aktualne wartości na starcie deploymentu. W tym projekcie nie ma osobnego „redeploy" z panelu Vercel.

**Tylko Production:** ustaw te sekrety wyłącznie w scope Production. Deploymenty preview pozostaną bez kluczy i będą zwracać 401/500 (fail-closed) zamiast działać z błędną konfiguracją.

### Kontrakt endpointu (pełny CRUD)

Żądanie przyjmuje trzy opcjonalne tablice (co najmniej jedna niepusta, max 100 wpisów każda; `delete_fronts` musi być rozłączne z `cards[].front` i `patches[].old_front` — nakładanie się to 400), przetwarzane w kolejności **delete → patch → upsert**:

- `cards: [{front, back}]` — upsert po `front` (zachowanie historyczne, bez zmian)
- `delete_fronts: [front]` — usuwa wyłącznie wiersze `source='manual'`
- `patches: [{old_front, new_front, new_back}]` — rename w miejscu (zachowuje id wiersza i stan FSRS), wyłącznie `source='manual'`

Odpowiedź ma zawsze pięć pól: `{"inserted":N,"updated":N,"deleted":N,"patched":N,"skipped_patches":[...]}`. Pomijane patche lądują w `skipped_patches` z `reason`: `old_front_not_found` (brak wiersza manual o `old_front`) lub `new_front_conflict` (inny wiersz już ma `new_front`). Karty AI (`ai-full`, `ai-edited`) są nieosiągalne przez delete/patch.

**Łańcuchy rename** (`A→B` gdy jednocześnie `B→C`) są zależne od kolejności w payloadzie: układaj je od ogona (`B→C` przed `A→B`) albo zaakceptuj konwergencję przy drugim wysłaniu tego samego diffa — pominięty patch zostanie zastosowany przy retry. Operacje są idempotentne; po HTTP 500 (możliwy częściowy zapis) bezpiecznym recovery jest ponowne wysłanie tego samego diffa.

### Kontrakt endpointu odczytu (GET)

`GET /api/import` — maszynowy odczyt aktualnego stanu (ten sam bearer `IMPORT_API_KEY`), którym zewnętrzny caller (life-os) diffuje prod względem swojego źródła prawdy. Zwraca wyłącznie karty `source='manual'` użytkownika `IMPORT_USER_ID` — karty AI (`ai-full`, `ai-edited`) nigdy nie są zwracane, filtr nie jest konfigurowalny (brak query params).

Odpowiedź ma zawsze trzy pola: `{"cards":[{"front","back"}],"count":N,"truncated":bool}` — karty w kolejności DB (sortowanie po stronie klienta), bez id, stanu FSRS i timestampów. Miękki limit 500 wierszy: powyżej zwracane jest pierwsze 500 z `truncated:true`. Pusty wynik to 200 z `{"cards":[],"count":0,"truncated":false}`, nigdy 4xx. Błędy: 401 (auth, jak POST), 500 (błąd DB / brak konfiguracji).

```bash
curl -H "Authorization: Bearer <IMPORT_API_KEY>" \
  https://10x-cards.jackpietrzak.com/api/import
```

### Smoke test po deployu

Pełny cykl CRUD (auth → upsert → walidacja → patch → konflikt rename → delete) sprawdza skrypt, który **sprząta po sobie** (nie zostawia wierszy testowych):

```bash
scripts/import-smoke-test.sh \
  https://10x-cards.jackpietrzak.com/api/import \
  "<IMPORT_API_KEY>"
```

Szybki check ręczny (idempotencja insert → update):

```bash
curl -X POST https://10x-cards.jackpietrzak.com/api/import \
  -H "Authorization: Bearer <IMPORT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"cards":[{"front":"ping","back":"pong"}]}'
# oczekiwane: {"inserted":1,"updated":0,"deleted":0,"patched":0,"skipped_patches":[]}
# ponowne wywołanie z tym samym front: {"inserted":0,"updated":1,...}
# sprzątanie: -d '{"delete_fronts":["ping"]}' → {"...","deleted":1,...}
```

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