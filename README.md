# Test Sphere

A bug tracking and test management system for QA teams, built with **Next.js 16
(App Router)**, **React 19**, **TypeScript**, **Tailwind v4** and **Supabase**
(Postgres + Auth + Row-Level Security).

Test Sphere lets QA teams:

- author **reusable test cases** organised into suites with versioned, tagged steps;
- bundle related cases into **test plans** for a release or sprint;
- launch **test runs** against a plan or ad-hoc set of cases and record
  pass / fail / blocked / skipped results with notes and timing;
- file **bugs** linked directly to a failing run result, with severity, priority,
  assignee and a status workflow (`new → triaged → in_progress → resolved →
  verified → closed` plus `reopened` and `wont_fix`);
- collaborate via **comments** on bugs and a per-project **activity log**;
- enforce **role-based access** (owner / manager / qa_engineer / developer /
  viewer) at the database level using RLS policies.

## Tech stack

| Layer    | Choice                                                         |
| -------- | -------------------------------------------------------------- |
| Frontend | Next.js 16 App Router · React 19.2 · Tailwind CSS v4           |
| State / forms | React Server Actions + `useActionState` + Zod v4          |
| Backend  | Supabase Postgres                                              |
| Auth     | Supabase Auth (email + password) via `@supabase/ssr`           |
| Security | Row-Level Security policies (per-project membership + role)    |
| Icons    | `lucide-react`                                                 |

## Project layout

```
app/
├── (auth)/                     Public auth flows (login / signup)
├── (app)/                      Authenticated app shell
│   ├── dashboard/              Cross-project KPIs
│   ├── projects/               Project list, create, detail
│   │   └── [id]/
│   │       ├── cases/          Test cases & suites
│   │       ├── plans/          Test plans
│   │       ├── runs/           Test runs and execution UI
│   │       ├── bugs/           Bug tracker (list, file, detail)
│   │       ├── members/        Project membership
│   │       └── activity/       Audit log
│   ├── bugs/                   "My bugs" cross-project
│   ├── test-cases/             "My cases" cross-project
│   └── settings/               Profile settings
├── page.tsx                    Marketing landing page
├── layout.tsx                  Root layout (HTML, fonts)
└── not-found.tsx
components/
├── app-shell/                  Sidebar, topbar, tabnav
└── ui/                         Buttons, inputs, badges, cards, …
lib/
├── supabase/                   Browser, server and proxy clients + types
├── auth.ts                     `requireUser` / role helpers
└── utils/                      `cn`, formatting helpers
proxy.ts                        Next 16 proxy (auth gate, session refresh)
supabase/
└── schema.sql                  Full DB schema + RLS policies
```

## Quickstart

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates the
   tables, enums, helper functions, triggers and Row-Level Security policies.
3. Open **Settings → Authentication → Sign in / providers** and make sure
   **Email** is enabled. For local development you can disable
   "Confirm email" so signups land you straight into the app.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the two values from **Settings → API** in the Supabase dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up. The first
project you create automatically makes you its **owner**, so you can invite the
rest of your team.

### 4. (Optional) Promote yourself to global admin

Some operations (e.g. seeing every project regardless of membership) require the
global `admin` role. Run this in the Supabase SQL editor after your first
signup:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## Roles & permissions

| Project role | Read | Create test cases / runs | File bugs | Manage members | Delete project |
| ------------ | :--: | :----------------------: | :-------: | :------------: | :------------: |
| owner        |  ✅  |            ✅            |    ✅     |       ✅       |       ✅       |
| manager      |  ✅  |            ✅            |    ✅     |       ✅       |       —        |
| qa_engineer  |  ✅  |            ✅            |    ✅     |       —        |       —        |
| developer    |  ✅  |            —             |    ✅     |       —        |       —        |
| viewer       |  ✅  |            —             |    —      |       —        |       —        |

Permissions are enforced both in the UI and at the database via RLS policies in
`supabase/schema.sql`, so even a direct Supabase API call from a malicious
client can't bypass them.

## Workflows

### Authoring tests

1. Open a project and go to **Test cases**.
2. Create a **suite** (e.g. "Checkout flow") and then a **test case**, filling in
   preconditions, an ordered list of `step / expected` rows, priority, status
   and tags.
3. Group cases together into a **Test plan** that represents what should run for
   a release.

### Running tests

1. From **Test runs**, start a run from a plan or pick cases ad-hoc.
2. Test Sphere seeds a `pending` result row per case and marks the run as
   `in_progress`.
3. Click **Pass / Fail / Block / Skip** on each row to record the outcome,
   leave notes and a duration, and **complete** the run when you're done.

### Reporting bugs

1. From a failing run row, click **File bug** to pre-fill the title from the
   case and link the defect to the failing result.
2. Edit severity, priority, assignee and status from the right-hand sidebar of
   the bug detail page. Status changes go straight to the activity log.

## Production checklist

- Add a `service_role` key + a server-only Supabase client only if you need
  cron jobs or background workers — the app itself does not need it.
- Enable **Confirm email** in Supabase Auth settings.
- Configure the **Site URL** in Supabase Auth so password reset and email
  confirmation links use the right host.
- Enable Postgres backups in Supabase.
- Set up a strict **Content Security Policy** at the edge.

## Development notes

- `proxy.ts` (renamed from `middleware.ts` in Next.js 16) refreshes the
  Supabase session cookies on every request and gates `/dashboard`, `/projects`
  and friends. Public routes (`/`, `/login`, `/signup`) are allow-listed.
- `lib/supabase/server.ts` is the canonical Supabase client for Server
  Components and Server Actions. Always `await` it — `cookies()` is async in
  Next 16.
- Mutations use **Server Actions** with `useActionState` for typed validation
  errors via Zod v4 (`z.flattenError`).
- Type information for the database lives in `lib/supabase/database.types.ts`.
  Regenerate it with `supabase gen types typescript --project-id <id>` if you
  add new tables.

## License

Built as a portfolio / coursework project. Use it however you like.
