# Conventional Commits Guidelines

Based on the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.

---

## Quick Reference

```
<type>(scope): <description>    ← 50 chars max

[optional body]                  ← 72 chars/line

[optional footer(s)]
```

| Type | Use for | SemVer |
|------|---------|--------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | - |
| `style` | Formatting, no code change | - |
| `refactor` | Code change, no feat/fix | - |
| `perf` | Performance improvement | - |
| `test` | Adding/fixing tests | - |
| `chore` | Maintenance, deps, config | - |
| `ci` | CI/CD changes | - |
| `build` | Build system changes | - |

---

## Full Specification

### 1. Overall Structure

Every commit message **MUST** follow this template:

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

### 2. Commit Types

Use one of the standard types (lowercase):

| Type | When to use | Example |
|------|-------------|---------|
| `feat` | Adding new functionality | `feat(auth): add OAuth2 login` |
| `fix` | Fixing a bug | `fix(api): handle null response` |
| `docs` | Documentation changes | `docs(readme): update install steps` |
| `style` | Formatting, whitespace | `style: fix indentation` |
| `refactor` | Code restructure, no behavior change | `refactor(utils): extract helper` |
| `perf` | Performance improvement | `perf(query): add database index` |
| `test` | Adding or fixing tests | `test(auth): add login tests` |
| `chore` | Maintenance, deps, tooling | `chore(deps): update lodash` |
| `ci` | CI/CD pipeline changes | `ci: add GitHub Actions workflow` |
| `build` | Build system, packaging | `build: update webpack config` |

### 3. Optional Scope

Add a scope in parentheses to describe the area affected:

```
feat(parser): add support for arrays
fix(auth): resolve token expiration bug
docs(api): update endpoint documentation
```

The scope should be a single lowercase noun.

### 4. Breaking Changes Marker

Signal a breaking change by either:

- Appending `!` after the type/scope:
  ```
  feat(api)!: remove deprecated endpoint
  ```
- Or including a footer:
  ```
  BREAKING CHANGE: endpoint `/v1/users` now returns 404 instead of empty list
  ```

If using `!`, the description must explain the breaking change.

### 5. Description

- **Required.**
- Brief summary (≤50 characters), written in **imperative, present tense** (e.g., "add login feature").
- No trailing period.

**Good:** `add user authentication`
**Bad:** `Added user authentication.`

### 6. Body (Optional)

- Provides additional context or reasoning.
- Separated from the description by one blank line.
- Wrap lines at ~72 characters.

```
fix(auth): resolve token refresh race condition

The previous implementation could cause duplicate refresh requests
when multiple API calls failed simultaneously. This adds a mutex
to ensure only one refresh happens at a time.
```

### 7. Footer(s) (Optional)

- Separated from the body by one blank line.
- Use "trailers" in the form `<token>: <value>` or `<token> #<issue>`.
- Multiple footers allowed.
- Tokens use hyphens instead of spaces (exception: `BREAKING CHANGE`).

```
fix(checkout): calculate tax correctly

Closes #42
Reviewed-by: John Doe
```

### 8. SemVer Mapping

- `feat` → MINOR release (1.x.0)
- `fix` → PATCH release (1.0.x)
- Any commit with a breaking change → MAJOR release (x.0.0)

### 9. Case Sensitivity

- Types and scopes **must** be lowercase.
- `BREAKING CHANGE` token **must** be uppercase.

---

## Single Purpose Rule

**Each commit should do ONE thing.**

Ask yourself: "Can I describe this commit without using 'and'?"

### Signs you need to split:

- Description needs "and" (e.g., "add feature and fix bug")
- Changes span unrelated areas (e.g., playbooks + journal + health)
- You're touching 5+ files in different domains
- Different commit types apply (feat + docs + chore)

### How to split:

1. Group changes by logical purpose
2. Each group = one commit
3. Order commits so they make sense independently

### Example - Bad (bundled):

```
feat(system): add frameworks and update journals and fix config
```

### Example - Good (split):

```
feat(playbooks): add P.O.P. experiments framework
feat(playbooks): add Learn in Public workflow
feat(health): add experiments tracking with EXP-001
docs(journal): add W49 review and W50 planning
docs(career): update brag document
chore(obsidian): update workspace settings
```

### Exception:

Tightly coupled changes that would break if separated can stay together.

---

## Life-OS Common Scopes

| Scope | Use for |
|-------|---------|
| `playbooks` | Playbook files |
| `journal` | Weekly journals |
| `health` | Health & Wellbeing area |
| `career` | Career & Growth area |
| `projects` | Project files |
| `resources` | 30_resources collections |
| `system` | CLAUDE.md, system config |
| `obsidian` | Obsidian config files |
| `ide` | IDE/editor config |

---

## AI-Generated Commits

When using AI assistants (Claude Code, Copilot, etc.) to create commits:

- **Do NOT** add AI attribution footers (e.g., "Generated with Claude Code")
- **Do NOT** add Co-Authored-By headers for AI assistants
- Commits should be indistinguishable from human-written commits
- The developer is responsible for reviewing and approving all changes

---

**Reference:** [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
