# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

10x-cards is a Next.js 15 flashcard application with AI-powered generation capabilities using OpenRouter API. It features user authentication via Supabase, spaced repetition learning (ts-fsrs), and a modern UI built with shadcn/ui and Tailwind CSS 4.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint       # Check for linting issues
npm run lint:fix   # Fix linting issues automatically

# Code formatting
npm run format     # Format all files with Prettier
```

## Architecture Overview

### Core Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Row-Level Security)
- **AI Integration**: OpenRouter API for LLM access
- **Spaced Repetition**: ts-fsrs algorithm

### Directory Structure

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Protected routes (require authentication)
│   ├── (public)/           # Public routes (no auth required)
│   └── api/                # API route handlers
├── components/
│   ├── ui/                 # shadcn/ui base components
│   └── [feature]/          # Feature-specific components
├── lib/
│   ├── services/           # Business logic services
│   ├── schemas/            # Zod validation schemas
│   └── actions/            # Server actions
├── hooks/                  # Custom React hooks
├── utils/
│   └── supabase/          # Supabase client configurations
└── middleware.ts           # Auth middleware
```

### Key Architectural Patterns

1. **Authentication Flow**: Middleware-based auth using Supabase. Public paths defined in `middleware.ts`. Protected routes under `app/(auth)/`.

2. **Service Layer Pattern**: Business logic isolated in `lib/services/`:
   - `flashcards.service.ts`: CRUD operations with FSRS integration
   - `generation.service.ts`: AI flashcard generation
   - `openrouter.service.ts`: LLM API client with retry logic

3. **Database Schema**: Row-Level Security (RLS) enabled. Tables:
   - `flashcards`: Card content with FSRS fields (stability, difficulty, due, state)
   - `generations`: AI generation history
   - `generation_error_logs`: Error tracking

4. **API Routes Structure**: RESTful endpoints in `app/api/`:
   - `/api/flashcards`: CRUD operations
   - `/api/generations`: AI generation endpoints
   - `/api/flashcards/[id]/review`: Spaced repetition updates

## Critical Implementation Details

### Supabase Configuration

- Local development uses Supabase CLI (port 55321)
- Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RLS policies enforce user data isolation

### AI Generation Flow

1. User inputs text → `TextInputArea` component
2. API call to `/api/generations` → OpenRouter service
3. LLM generates flashcard pairs → validation with Zod schemas
4. User reviews/edits → bulk save to database

### FSRS Algorithm Integration

- New cards: `state=0`, `due=now`, immediate availability
- Review updates: Calculate next review based on self-assessment
- States: New (0), Learning (1), Review (2), Relearning (3)

### Error Handling

- Service layer throws typed errors
- API routes return standardized error responses
- Generation errors logged to `generation_error_logs` table

## Code Style Guidelines

### TypeScript

- Strict mode enabled
- Use type imports: `import type { ... }`
- Define DTOs and commands as types in `lib/types.ts`

### React Components

- Functional components with TypeScript
- Props interfaces defined inline or as separate types
- Use shadcn/ui components as base layer

### API Routes

- Validate request bodies with Zod schemas
- Return consistent response structure
- Handle Supabase auth in route handlers

### Commit Convention

Follow conventional commits:

- `feat(scope):` New features
- `fix(scope):` Bug fixes
- `refactor(scope):` Code refactoring
- Scopes: auth, flashcards, ai-generation, learning, user

## Development Workflow

1. **Adding Features**: Create service in `lib/services/`, add API route, implement UI component
2. **Database Changes**: Add migration in `supabase/migrations/`, update `database.types.ts`
3. **Component Development**: Use shadcn/ui primitives, follow existing patterns in `components/`
4. **Error Handling**: Use early returns, guard clauses, log errors with LoggerService

## Environment Setup

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENROUTER_API_KEY
SUPABASE_SERVICE_ROLE_KEY (for admin operations)
```

## Testing

Currently no test suite configured. When implementing tests:

- Use the existing test patterns found in component files
- Focus on service layer and API route testing
- Mock Supabase and OpenRouter services

## CODING_PRACTICES

### Guidelines for STATIC_ANALYSIS

#### ESLINT

- Configure project-specific rules in eslint.config.js to enforce consistent coding standards
- Use shareable configs like eslint-config-airbnb or eslint-config-standard as a foundation
- Implement custom rules for flashcard data structures, AI integration patterns, and auth flows to maintain codebase consistency
- Configure integration with Prettier to avoid rule conflicts for code formatting
- Use the --fix flag in CI/CD pipelines to automatically correct fixable issues
- Implement staged linting with husky and lint-staged to prevent committing non-compliant code

#### PRETTIER

- Define a consistent .prettierrc configuration across all 10xCards repositories
- Configure editor integration to format on save for immediate feedback
- Use .prettierignore to exclude generated files, build artifacts, and Supabase-generated files, .next directory, and node_modules
- Set printWidth based on team preferences (100 characters) to improve code readability
- Configure consistent quote style and semicolon usage to match team conventions
- Implement CI checks to ensure all committed code adheres to the defined style

### Guidelines for VERSION_CONTROL

#### CONVENTIONAL_COMMITS

- Follow the format: type(scope): description for all commit messages
- Use consistent types (feat, fix, docs, style, refactor, test, chore) across the project
- Define clear scopes based on auth, flashcards, ai-generation, learning, user to indicate affected areas
- Include issue references in commit messages to link changes to requirements
- Use breaking change footer (!: or BREAKING CHANGE:) to clearly mark incompatible changes
- Configure commitlint to automatically enforce conventional commit format

### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Use SupabaseClient type from `src/utils/supabase/client.ts`, not from `@supabase/supabase-js`

### Guidelines for clean code

- Prioritize error handling and edge cases
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.

## Frontend

### General Guidelines

### Guidelines for Styling

#### Tailwind

- Use the @layer directive to organize styles into components, utilities, and base layers
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements
- Use cursor pointer for interactive elements

### Guidelines for Accessibility

#### ARIA Best Practices

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements

### Guidelines for React

#### React Coding Standards

- Use functional components with hooks instead of class components
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

Key Principles

- Use functional, declarative programming. Avoid classes.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Favor named exports for components.
- Use TypeScript for all code. Prefer interfaces over types.
- File structure: imports, types, main component, subcomponents, helpers, static content.
- Use Zod for form validation.
- Use Zustand for state managament.
- Use Shadcn UI, Radix, and Tailwind CSS for components and styling.

#### NEXT_JS

- Use App Router and Server Components for improved performance and SEO
- Implement route handlers for API endpoints instead of the pages/api directory
- Use server actions for form handling and data mutations from Server Components
- Leverage Next.js Image component with proper sizing for core web vitals optimization
- Implement the Metadata API for dynamic SEO optimization
- Use React Server Components for flashcard fetching and AI generation requests to reduce client-side JavaScript
- Implement Streaming and Suspense for improved loading states
- Use the new Link component without requiring a child <a> tag
- Leverage parallel routes for complex layouts and parallel data fetching
- Implement intercepting routes for modal patterns and nested UIs

#### Client vs Server Components

- Add 'use client' directive at the top of the file (before any imports) when the component:
  - Uses React hooks (useState, useEffect, useReducer, etc.)
  - Needs interactivity or event listeners (onClick, onChange, etc.)
  - Uses browser-only APIs
  - Uses custom hooks that depend on state or effects
  - Uses React Class components
  - Requires client-side JavaScript functionality

Example of a Client Component:

```typescript
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

#### Best Practices for Client/Server Components

- Keep Server Components as the default choice when possible
- Move Client Components down the component tree to minimize client-side JavaScript
- When using third-party components that use client-side features:
  - Use them within existing Client Components, or
  - Wrap them in a new Client Component if they need to be used in Server Components
- For better performance, prefer keeping layouts and static UI elements as Server Components
- Only mark components as 'use client' when they actually need client-side interactivity
