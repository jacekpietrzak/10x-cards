# 10x-cards

## Project Description

**10x-cards** is a web application designed to streamline the creation and management of educational flashcards. By leveraging large language models (LLMs) via API, users can paste in any chunk of text and automatically generate high-quality front and back pairs. The app also supports manual flashcard creation, secure user authentication, and a basic spaced-repetition study workflow.

---

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
   - [In Scope](#in-scope)
   - [Out of Scope](#out-of-scope)
6. [Project Status](#project-status)
7. [License](#license)

---

## Tech Stack

- **Frontend**

  - Next.js 15 (App Router)
  - React 19
  - TypeScript 5
  - Tailwind CSS 4
  - shadcn/ui component library
  - ts-fsrs (Spaced Repetition Algorithm)

- **Backend & Database**

  - Supabase (PostgreSQL, Auth, BaaS)

- **AI Integration**

  - Openrouter.ai (access to OpenAI, Anthropic, Google, etc.)

- **CI/CD & Hosting**
  - GitHub Actions
  - Vercel

---

## Getting Started Locally

### Prerequisites

- Node.js **v22.14.0** (use [nvm](https://github.com/nvm-sh/nvm))
- Git
- (Optional) Environment variables for Supabase & Openrouter API

### Installation

```bash
# Clone the repository
git clone https://github.com/jacekpietrzak/10x-cards.git
cd 10x-cards

# Install Node version
nvm install
nvm use

# Install dependencies
npm install

# Start development server
npm run dev
```

_Open your browser at http://localhost:3000_

---

## Available Scripts

In the project directory, you can run:

- `npm run dev`  
  Starts Next.js in development mode (with TurboPack).

- `npm run build`  
  Builds the application for production.

- `npm run start`  
  Starts the production server after build.

- `npm run lint`  
  Runs ESLint to check for code quality issues.

- `npm run lint:fix`  
  Automatically fixes linting issues.

- `npm run format`  
  Formats the code using Prettier.

---

## Project Scope

### In Scope

- **Automatic AI Flashcard Generation**  
  Paste text (1,000–10,000 chars) → call LLM API → receive front & back pairs → review & approve.

- **Manual Flashcard CRUD**  
  Create, edit, delete flashcards via form and list view.

- **User Authentication**  
  Registration, login, secure storage of credentials, account deletion.

- **Basic Spaced-Repetition Workflow**  
  External SRS algorithm drives study sessions (show front, reveal back, self-assessment).

- **Data Management & Metrics**  
  Store user & flashcard data in Supabase; track AI-generated vs. accepted cards.

- **GDPR Compliance**  
  Secure personal data, allow data export & deletion.

  This MVP is designed to onboard 100 active users within the first three months and will evolve based on user feedback.

### Out of Scope (MVP)

- Custom in-house SRS algorithm
- Gamification features
- Mobile applications
- Multi-format document import (PDF, DOCX, etc.)
- Flashcard sharing between users
- Advanced notifications & reminders
- Keyword search across flashcards

---

## Project Status

**MVP / In active development**  
The project is currently in the MVP stage and under active development.

---

## License

This project is licensed under the MIT license.
