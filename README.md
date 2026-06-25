# Veritas Daily Reflection Journal

Veritas Daily Reflection Journal is a monorepo for a journaling app built around daily reflection, mood tracking, habit support, gratitude notes, time capsules, and AI-assisted insights.

The workspace includes:
- a mobile app built with Expo Router and React Native
- an Express API server that powers AI insights and transcription
- shared packages for the database, API schema, generated clients, and runtime helpers
- a mockup sandbox for UI prototyping

## What the app does

The product is designed to help someone write a daily entry, capture how they feel, and turn that raw input into something more useful over time.

Core experiences include:
- a Today screen for writing a journal entry and selecting a mood
- voice input for faster entry capture
- AI-generated daily recommendations, weekly summaries, year reviews, and playlist suggestions
- a Journal history view for browsing past entries
- a Jar and Time Capsule experience for delayed or reflective notes
- habit tracking and gratitude notes
- reminder scheduling and PDF export from the settings screen
- search and insights views for reviewing patterns

## Repository Layout

```text
.
|- artifacts/
|  |- api-server/          Express backend for health checks, AI insights, and transcription
|  |- mobile/              Expo mobile app with the main journal experience
|  `- mockup-sandbox/      Vite-based sandbox for UI and component exploration
|- lib/
|  |- api-spec/            OpenAPI spec and Orval codegen config
|  |- api-zod/             Shared Zod schemas and generated API types
|  |- api-client-react/    React Query client helpers and generated API client
|  `- db/                  Drizzle database connection and schema exports
|- scripts/                Workspace utility scripts and post-merge automation
|- package.json             Workspace scripts and shared tooling
|- pnpm-workspace.yaml      pnpm workspace definition and dependency catalog
`- tsconfig*.json           Shared TypeScript configuration
```

## Tech Stack

- pnpm workspaces
- TypeScript 5.9
- Expo Router, React Native, and React Query
- Express 5 with Pino logging and CORS
- OpenAI-compatible chat and transcription calls through the API server
- Drizzle ORM and PostgreSQL
- Zod for shared validation and generated schema types
- Orval for API client generation
- Vite for the mockup sandbox

## Packages

### `artifacts/mobile`
The main journaling app. It uses Expo Router and a tab-based experience with:
- Today
- Journal
- Jar
- Search
- Habits
- Insights

It also includes modal screens for settings, chapters, time capsule, and yearly review. The app stores journal data locally with AsyncStorage and layers on features like streaks, reminders, and export.

### `artifacts/api-server`
The backend service. It exposes:
- `GET /api/healthz`
- `POST /api/insights/weekly`
- `POST /api/insights/recommendations`
- `POST /api/insights/year-review`
- `POST /api/insights/playlist`
- `POST /api/insights/transcribe`

The server expects an OpenAI-compatible API key and points its client at `https://api.groq.com/openai/v1`.

### `lib/db`
Shared database wiring. It creates the PostgreSQL pool, exports the Drizzle instance, and re-exports the schema.

### `lib/api-spec`
The source OpenAPI contract plus Orval configuration used to generate API clients and schemas.

### `lib/api-zod`
Generated shared Zod schemas and API type exports.

### `lib/api-client-react`
Generated React Query client helpers plus fetch customization utilities.

### `artifacts/mockup-sandbox`
A Vite sandbox for prototyping and reviewing UI components outside the mobile app.

### `scripts`
Workspace utility scripts, currently including a simple hello script and TypeScript validation.

## Setup

### Prerequisites
- Node.js 24
- pnpm
- A PostgreSQL database for the shared DB package and API server
- An OpenAI-compatible API key for insights and transcription

### Install

```bash
pnpm install
```

### Run checks

```bash
pnpm run typecheck
pnpm run build
```

### Common package scripts

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/mobile run dev
pnpm --filter @workspace/mobile run build
pnpm --filter @workspace/mobile run serve
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/mockup-sandbox run dev
pnpm --filter @workspace/mockup-sandbox run build
pnpm --filter @workspace/mockup-sandbox run typecheck
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/scripts run hello
```

## Environment Variables

### Required for the database
- `DATABASE_URL`: PostgreSQL connection string used by `lib/db`

### Required for the API server
- `PORT`: port to listen on
- `OPENAI_API_KEY`: key used by the AI insight and transcription routes

### Used by the mobile app build and serve flow
- `BASE_PATH`: optional base path for hosted builds
- `REPLIT_INTERNAL_APP_DOMAIN`, `REPLIT_DEV_DOMAIN`, or `EXPO_PUBLIC_DOMAIN`: used to resolve the deployment host during build
- `REPL_ID` or `EXPO_PUBLIC_REPL_ID`: used by the build process when present
- `REPLIT_EXPO_DEV_DOMAIN`: used by the Expo dev script in Replit

## Data Flow

- The mobile app stores journal entries, habits, gratitude notes, and time capsules locally on the device.
- When the app needs AI-generated help, it sends entry data to the Express API server.
- The API server formats the prompt, calls the OpenAI-compatible backend, and returns structured JSON.
- Shared schemas and generated clients keep the mobile app and backend aligned.

## Notes

- `.replit`, `.npmrc`, and `replit.md` are local workspace files and are intentionally not tracked in Git.
- Generated code lives under `lib/api-client-react/src/generated` and `lib/api-zod/src/generated`.
- The workspace uses a pnpm catalog in `pnpm-workspace.yaml` to keep shared dependency versions consistent.