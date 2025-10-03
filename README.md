# RetroScope

RetroScope is an opinionated Next.js app designed to help agile teams run high-signal sprint retrospectives. It ships with a responsive hero page, light/dark theming, and a Prisma-backed Postgres data model you can build upon.

## Tech Stack

- Next.js App Router with React 19
- Tailwind CSS for styling and theming
- Prisma ORM targeting PostgreSQL
- GSAP animations for subtle UI motion

## Local Development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy the provided example file and update it with your on-prem Postgres credentials. The connection string uses a dedicated schema so it can live alongside other Prisma projects.

```bash
cp .env.example .env.local
```

`PRISMA_DATABASE_URL` should point to either a new database or a dedicated schema (e.g. `retro-scope-database`). If your Postgres instance uses a hyphenated name, create it with double quotes and mirror that name in the connection string. `DIRECT_DATABASE_URL` is optional and maps to the same database when you need an unpooled connection.

## Prisma & Database Setup

1. Ensure the schema/database exists on your Postgres instance:
   ```sql
   CREATE SCHEMA IF NOT EXISTS "retro-scope-database";
   ```
   (Feel free to rename it; just mirror the value inside `DATABASE_URL`.)

2. Generate the Prisma client and sync the schema (scripts automatically load `.env.local`):
   ```bash
   npm run prisma:generate
   npm run prisma:db-push
   ```
   `db push` is non-destructive and will create the tables defined in `prisma/schema.prisma`.

3. Deploy migrations to other environments with:
   ```bash
   npm run prisma:migrate
   ```

4. Optional: explore data with Prisma Studio.
   ```bash
   npm run prisma:studio
   ```

The Prisma client instance lives in `src/lib/prisma.ts`, using a global singleton to avoid exhausting connections in development.

## API Surface

Lightweight REST endpoints allow you to manage users and retro boards straight away:

- `POST /api/users` – create or update a user `{ email, name?, avatarUrl? }`
- `GET /api/users?email=` – look up a specific user (or list the latest users)
- `POST /api/retro-boards` – create a board `{ title, ownerId?, ownerEmail?, ownerName?, summary?, facilitatorId?, scheduledFor?, stages?[] }`
- `GET /api/retro-boards?ownerId=` – list boards with stages and participants
- `GET /api/retro-boards/:boardId` – fetch full board detail including cards, comments, and reactions
- `PATCH /api/retro-boards/:boardId` – update metadata (title, status, schedule, facilitator)
- `DELETE /api/retro-boards/:boardId` – remove a board
- `POST /api/retro-boards/:boardId/stages` – add a new column to the board workflow
- `POST /api/retro-boards/:boardId/participants` – invite or update a participant role
- `POST /api/retro-boards/:boardId/cards` – add a feedback card to a stage
- `PATCH /api/retro-boards/:boardId/cards/:cardId` – edit content, move stages, or update vote totals
- `POST /api/retro-boards/:boardId/cards/:cardId/comments` – add a threaded comment
- `POST /api/retro-boards/:boardId/cards/:cardId/reactions` – add a reaction emoji/token; delete with query params `type` & `userId`

All POST/PATCH endpoints accept JSON bodies; responses are JSON encoded Prisma entities.

> If you invoke Prisma CLI commands directly, prefix them with `dotenv -e .env.local --` (for example `dotenv -e .env.local -- npx prisma db push`) so the `PRISMA_DATABASE_URL` environment variable is available.

## Create Board UI

Visit `/create-board` from the homepage CTA to spin up a board. Provide a board name, choose how many columns you want, and name each column. If you supply owner details, they are sent along to `/api/retro-boards`; otherwise the board is created without an owner and you’re forwarded to `/retro-boards/:boardId`.

The board view prompts first-time visitors for their name & email, stores that locally, creates/updates the user via `/api/users`, and adds them to the board through `/api/retro-boards/:boardId/participants` before revealing the columns.

## Available Scripts

- `npm run dev` – start the development server
- `npm run build` – production build
- `npm run start` – run the compiled app
- `npm run lint` – ESLint using the project config
- `npm run prisma:*` – helper scripts for Prisma (generate, push, migrate, studio)

## Next Steps

- Implement authentication and wire the Prisma models into API routes.
- Replace the hero mock data with real queries (e.g. upcoming retro session, action items).
- Add tests around data access and domain workflows as the product evolves.

---

This project started from `create-next-app` and has been customised for the RetroScope brand and tooling.
