# Building Issues

Building Issues is a mobile-first application for residential buildings. It will group individual resident reports about the same shared problem into a single incident: **one issue → one incident → one status → one communication thread**. This repository implements the technical foundation, private data layer, and a minimal resident report submission flow.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript; Node.js 22.13+ (Node 24 LTS recommended), npm and committed `package-lock.json`.
- Supabase PostgreSQL 17, Auth, SSR cookie sessions, and RLS. No service-role key in the application.
- Plain CSS, English UI, semantic HTML, responsive layouts. Root `lang` and centralized route copy can be replaced by a locale dictionary later. No translation framework yet.
- Vercel-compatible Node runtime. No long-lived application services or custom server.

Use `npm ci` to reproduce the pinned dependency tree. ESLint 9 is intentionally retained because plugins in the current Next.js lint configuration do not yet declare compatibility with ESLint 10. TypeScript 6.0 is the newest stable line supported by the current TypeScript ESLint parser (`<6.1`); TypeScript 7 is not yet compatible with that lint toolchain. Do not bypass peer checks with `--force` or `--legacy-peer-deps`.

## Local setup

```sh
npm ci
npm run db:start                 # requires Docker; starts only DB, Auth, REST, gateway, local mail
```

The Supabase CLI is a pinned dev dependency. On hosts with a read-only home directory, prefix Supabase commands with `SUPABASE_HOME=/tmp/building-issues-supabase` (including commands invoked through npm). Do not change `HOME`. The email template must be world-readable (`chmod 644 supabase/templates/magic_link.html`) so the local gateway can serve it to Auth. This cloud host also uses `SUPABASE_USE_SLIM_IMAGES=true` with Supabase commands to use the official digest-verified smaller images; keep the same setting when starting/resetting that stack. Its default Docker client config injects an external proxy into local containers; for this stack only, create an empty `/tmp/building-issues-docker-local/config.json` and run startup with `DOCKER_CONFIG=/tmp/building-issues-docker-local`. This leaves global Docker settings unchanged and lets local services communicate directly. Outbound image downloads keep the daemon’s existing networking.

Create `.env.local` from `.env.example` and enter the **local** API URL and publishable key from `npx supabase status`. If the CLI only supplies an `anon` key for the local stack, that browser-safe key also works in the publishable-key variable. Never use the secret/service-role key there. The cloud workflow may use `npm run env:local` to create this file without printing keys or overwriting an existing file.

```sh
npm run dev
```

Open `/login`, enter a fictional development address such as `resident@example.invalid`, then use the sign-in email captured by the local mail inbox (address shown by `npx supabase status`). Nothing needs to be sent to a real inbox for local development. The first login creates a `resident` profile with **no building access**. Assign a building with trusted SQL as described below. Sign out through the app header.

`npm run db:stop` stops the local stack. Processes must be restarted after a cloud environment snapshot is restored. Cloud tasks already use isolated checkouts: use the existing `/workspace/building-issues`; do not create a Git worktree unless explicitly requested.

## Supabase setup

For a hosted Supabase project:

1. Create a project. Obtain Project URL and **publishable** API key from Project Settings → API. These two values are public identifiers protected by RLS, not admin credentials.
2. Enable the email provider and passwordless email login. This foundation permits signup, but signup confers no membership or elevated role. Decide on signup restrictions before a pilot; invitations are out of scope.
3. In Auth URL Configuration, set Site URL to the exact application origin. Use the local origin during development and your deployed HTTPS origin in production. Configure matching redirect allowlist entries. Do not use unrestricted wildcards in production.
4. In **both** the Magic Link and Confirm Signup email templates, use the content from `supabase/templates/magic_link.html`:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">Sign in</a>
   ```

   The callback verifies `TokenHash` with Supabase and sets SSR cookies. Default fragment-based email links are incompatible with this server callback. No arbitrary `next` URL is accepted. Tokens must not be logged or shared.
5. Configure production SMTP, sender identity, Auth rate limits, and anti-abuse settings before opening public signup. Supabase's default email service has delivery/recipient limits. Product email and notification features are not implemented; Auth's sign-in email is the only email flow.
6. Expose only the intended `public` API schema (keep `private` unexposed). Apply migrations before allowing logins. No Storage buckets or upload policies are created yet.

## Environment variables

| Name | Obtain from | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API | API/Auth URL, also used by server client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page → publishable API key | Browser-safe API access subject to RLS |

`.env.example` contains placeholders only. `.env.local` is ignored. Never put a database password, Auth token, secret key, or service-role key into a `NEXT_PUBLIC_` variable. No application service-role variable is needed. CI/deployment migration credentials belong in a separate secure administrative workflow.

## Database migrations

`supabase/migrations/202610250001_foundation.sql` creates the twelve core tables, enums, constraints, indexes, timestamp triggers, Auth profile synchronization, explicit grants, and RLS policies in one transaction.

`supabase/migrations/202610260001_resident_submission.sql` adds the resident-only `submit_resident_report` RPC. It creates an incident and its first report atomically without changing existing RLS policies. On an existing local database, apply pending migrations without resetting data:

```sh
npx supabase migration up --local
npm run db:types
```

Use the cloud runtime variables described above when applicable. For a hosted project, `npx supabase db push` applies this migration through your authorized administrative workflow.

Local, disposable database:

```sh
npm run db:reset             # DESTRUCTIVE to local data; applies migrations and synthetic seed
```

Hosted project (use an authorized Supabase CLI login and obtain the project ref from the dashboard):

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push         # review pending migrations; no automatic production seed
```

The same migration can be applied with an authorized SQL client. Do not run local database reset commands against production. Do not modify an already deployed migration: add another versioned migration.

Database types are generated from the migrated local database and checked into `src/lib/supabase/database.types.ts`. After future schema changes, run `npm run db:types` with the local stack running, then typecheck and review the generated diff.

## Seed data

`supabase/seed.sql` contains only L Tower, fictional address/management company, timezone `Europe/Lisbon`, units 101/102/201/202, and three example incidents. It is idempotent and creates no users, passwords, reports, or memberships. Business logic defaults buildings to UTC; the pilot timezone is data, validated against PostgreSQL's timezone catalog.

Create development users through the real local passwordless flow (or through a trusted Supabase dashboard). Profile creation ignores any role in user metadata. Find the user's UUID in Auth or query their profile as the database administrator. Then, through **trusted SQL only**, assign the user using an email that actually exists in your development database:

```sql
-- Replace the email with your DEVELOPMENT user. Verify each SELECT finds one row.
insert into public.resident_memberships(user_id, building_id, unit_id)
select p.id, b.id, u.id
from public.profiles p
join public.buildings b on b.name = 'L Tower'
join public.units u on u.building_id = b.id and u.unit_number = '101'
where p.email = 'resident@example.invalid';

-- Separate development management user. Run both statements in one transaction.
begin;
update public.profiles set role = 'management'
where email = 'manager@example.invalid';
insert into public.management_buildings(user_id, building_id)
select p.id, b.id from public.profiles p cross join public.buildings b
where p.email = 'manager@example.invalid' and b.name = 'L Tower'
on conflict(user_id, building_id) do nothing;
commit;
```

A trusted administrator may promote a profile to `admin` through SQL after verifying identity. Never expose this operation as a client-controlled profile update. Reassign a resident by deactivating their old membership before creating the new one. Retained historical memberships do not grant access.

## Running locally

```sh
npm run dev
npm run lint
npm run typecheck
npm run build
npm start                   # serves the production build
```

Required services are Supabase Auth, REST, and PostgreSQL. The app has `/login`, `/auth/confirm`, `/app`, `/app/issues`, `/app/issues/new`, and logout. `/` redirects into the protected app. The shell fetches only building names/IDs under the user's own RLS session; it handles unassigned users and database errors explicitly. Residents with an active membership can use **Report an issue** to submit a new issue. Management workflows are not implemented.

Database authorization regression checks, with the local stack running:

```sh
docker exec -i supabase_db_building-issues psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls.sql
docker exec -i supabase_db_building-issues psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/resident_submission.sql
```

This SQL suite uses transactional synthetic users and rolls everything back. Run only on a disposable local database. The suites check role spoofing, private rows, cross-building writes, management assignments, membership revocation, immutability, integrity constraints, and full transaction rollback when report creation fails. It needs no extra test framework.

For the complete local passwordless flow, run `npm run build`, start `npm start` in another terminal, then `npm run test:smoke`. This lightweight Node script checks real local OTP delivery/verification, logged-out guards, building assignment, token replay, logout, report submission, server validation, spoofed field rejection, and stale forms after membership/role changes. It requires the default local stack/ports, creates one fictional `example.invalid` user and deletes it in a `finally` block. It leaves captured test emails in the local inbox; those links are expired/used after the run. No browser test framework is installed.

See [verification evidence](docs/verification.md) for actual results and remaining hosted checks.

## Architecture and access model

See [security decisions](docs/security.md) for the authorization matrix and deliberate limitations. SQL is the schema's source of truth; generated types make the Supabase clients typed. User authentication is checked by Supabase `getUser()` in both the Next.js proxy and server layout. Database RLS is the authorization boundary for direct API calls as well as server rendering. The proxy refreshes cookies; login/callback/logout set cookies using the SSR client. Auth pages are never statically cached.

There is no aggregate endpoint yet. Future count queries must use a narrowly scoped, authorized RPC or secure view; do **not** expose other residents' reports to count them. There are no derived counts stored on incidents.

## Deployment preparation

- Configure the hosted project, apply the migration, and provision trusted role/building assignments.
- Set the two public variables in Vercel for the appropriate environment **before building**. Public variables are embedded at build time; rebuild after changing them.
- Set the correct Supabase Site URL and both email templates for that deployment. Use a separate development/staging project for previews, or explicitly configured preview destinations; the callback has a fixed `/app` destination.
- Run lint, typecheck, production build, and database security tests on a disposable database in CI.
- Verify real email delivery, link expiry/replay rejection, callback cookies, session refresh, logout, and assigned/unassigned accounts on the hosted deployment. No hosted project or production deployment is provisioned by this code.
- Review backup/retention policy and administrative access before collecting real resident data.

## Current scope

Implemented: project foundation, Supabase SSR Auth, role and membership schema, RLS, protected shell, synthetic seed, migrations, and resident submission with a shared incident list and success confirmation.

**Not implemented:** AI matching, semantic search, embeddings, duplicate detection, alert generation, notifications, product email, management dashboard, legacy-ticket UX, image uploads, or external management integration. The alerts table is a future-facing schema only. Management updates are append-only records; no incident-state synchronization workflow runs yet.

The original foundation specification is complete. The resident submission flow below was separately requested and is retained. Management status/update workflows, dashboards, incident matching, and notifications remain deferred until explicitly scoped in a separate task. See [specification coverage](docs/specification.md).

## Resident report submission

Open `/app/issues` → **Report an issue**. An authenticated `resident` must have an active building membership; a unit is optional. The form has a shared title, category, optional shared location, and private report details. Labels explain that titles/locations are building-visible and must not include private resident information.

The server action verifies the Auth user, validates and bounds field values, and calls the typed `submit_resident_report` RPC using the public key plus user session. The database independently checks the identity, database role, and active membership. It locks the profile and membership until commit, derives the building/author, creates a `reported` incident, and inserts one linked `app` report. Any failure rolls back both writes. It accepts no building ID, resident ID, source, or status from the caller. Reports remain protected by existing RLS; private text is not copied to the shared incident description or list.

After success, the resident returns to the latest-50 shared incident list with confirmation. Each submission intentionally creates a new incident: no AI, duplicate matching, linking to existing incidents, or notifications run. The form disables submission while pending. There is no automatic retry or network-level idempotency guarantee; if a response is lost, check the issues list before resubmitting. Server and database validation reject blank/oversized title and details, oversized location, and unsupported categories.
