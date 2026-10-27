# Building Issues

Building Issues is a mobile-first application for residential buildings. It will group individual resident reports about the same shared problem into a single incident: **one issue → one incident → one status → one communication thread**. This repository implements the private reporting, meaning-based incident grouping, and shared residential-complex statistics.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript; Node.js 24 LTS or newer, npm and committed `package-lock.json`.
- Supabase PostgreSQL 17, Auth, SSR cookie sessions, and RLS. No service-role key in the application. Private Supabase Storage stores media; a pinned local multilingual model computes semantic embeddings.
- Plain CSS, English UI, semantic HTML, responsive layouts. Root `lang` and centralized route copy can be replaced by a locale dictionary later. No translation framework yet.
- Vercel-compatible Node runtime. No long-lived application services or custom server.

Use `ONNXRUNTIME_NODE_INSTALL=skip npm ci` to reproduce the pinned dependency tree with the bundled CPU runtime. The flag skips optional CUDA downloads; package integrity, TLS and model checksum verification remain enabled. ESLint 9 is intentionally retained because plugins in the current Next.js lint configuration do not yet declare compatibility with ESLint 10. TypeScript 6.0 is the newest stable line supported by the current TypeScript ESLint parser (`<6.1`); TypeScript 7 is not yet compatible with that lint toolchain. Do not bypass peer checks with `--force` or `--legacy-peer-deps`.

## Local setup

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run db:start                 # requires Docker; starts DB, Auth, REST, Storage, gateway and local mail
```

The Supabase CLI is a pinned dev dependency. On hosts with a read-only home directory, prefix Supabase commands with `SUPABASE_HOME=/tmp/building-issues-supabase` (including commands invoked through npm). Do not change `HOME`. The email template must be world-readable (`chmod 644 supabase/templates/magic_link.html`) so the local gateway can serve it to Auth. This cloud host also uses `SUPABASE_USE_SLIM_IMAGES=true` with Supabase commands to use the official digest-verified smaller images; keep the same setting when starting/resetting that stack. Its default Docker client config injects an external proxy into local containers; for this stack only, create an empty `/tmp/building-issues-docker-local/config.json` and run startup with `DOCKER_CONFIG=/tmp/building-issues-docker-local`. This leaves global Docker settings unchanged and lets local services communicate directly. Outbound image downloads keep the daemon’s existing networking.

Create `.env.local` from `.env.example` and enter the **local** API URL and publishable key from `npx supabase status`. If the CLI only supplies an `anon` key for the local stack, that browser-safe key also works in the publishable-key variable. Never use the secret/service-role key there. The cloud workflow may use `npm run env:local` to create this file without printing keys or overwriting an existing file.

```sh
npm run model:prepare           # first run downloads ~120 MB of pinned model data
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
6. Expose only the intended `public` API schema (keep `private` unexposed). Apply migrations before allowing logins. The migrations create a private `report-media` bucket and owner/management/admin policies. Keep the bucket private; no public media URLs are used.

## Environment variables

| Name | Obtain from | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API | API/Auth URL, also used by server client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page → publishable API key | Browser-safe API access subject to RLS |
| `MODEL_CACHE_DIR` (optional, server only) | Your filesystem configuration | Writable semantic-model cache; defaults to an OS temporary directory |

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

All migrations can also be applied with an authorized SQL client. Do not run local database reset commands against production. Do not modify an already deployed migration: add another versioned migration.

Database types are generated from the migrated local database and checked into `src/lib/supabase/database.types.ts`. After future schema changes, run `npm run db:types` with the local stack running, then typecheck and review the generated diff.

## Seed data

`supabase/seed.sql` contains the L Tower complex, Tower 1 / Tower 2, fictional address/management company, timezone `Europe/Lisbon`, demo units including 3C, agreed location choices, and three example incidents. It is idempotent and creates no users, passwords, reports, or memberships. Business logic defaults buildings to UTC; the pilot timezone is data, validated against PostgreSQL's timezone catalog.

Create development users through the real local passwordless flow (or through a trusted Supabase dashboard). Profile creation ignores any role in user metadata. Find the user's UUID in Auth or query their profile as the database administrator. Then, through **trusted SQL only**, assign the user using an email that actually exists in your development database:

```sql
-- Replace the email with your DEVELOPMENT user. Verify each SELECT finds one row.
insert into public.resident_memberships(user_id, building_id, unit_id)
select p.id, b.id, u.id
from public.profiles p
join public.buildings b on b.name = 'Tower 2'
join public.units u on u.building_id = b.id and u.unit_number = '3C'
where p.email = 'resident@example.invalid';

-- Separate development management user. Run both statements in one transaction.
begin;
update public.profiles set role = 'management'
where email = 'manager@example.invalid';
insert into public.management_buildings(user_id, building_id)
select p.id, b.id from public.profiles p cross join public.buildings b
where p.email = 'manager@example.invalid' and b.name = 'Tower 2'
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

Required services are Supabase Auth, REST, PostgreSQL with pgvector, and Storage. The app has `/login`, `/auth/confirm`, `/app`, `/app/issues`, `/app/issues/new`, `/app/reports/[id]`, `/app/statistics`, private file download, and logout. `/` redirects into the protected app. The shell fetches only building names/IDs under the user's own RLS session; it handles unassigned users and database errors explicitly. Residents with an active membership can use **Report an issue** to submit a new issue. Management workflows are not implemented.

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

Aggregate RPCs authorize the complex and visible incidents before counting private reports. They expose counts and shared labels only. There are no derived counters stored on incidents.

## Deployment preparation

- Configure the hosted project, apply the migration, and provision trusted role/building assignments.
- Set the two public variables in Vercel for the appropriate environment **before building**. Public variables are embedded at build time; rebuild after changing them.
- Set the correct Supabase Site URL and both email templates for that deployment. Use a separate development/staging project for previews, or explicitly configured preview destinations; the callback has a fixed `/app` destination.
- Run lint, typecheck, production build, and database security tests on a disposable database in CI.
- Verify real email delivery, link expiry/replay rejection, callback cookies, session refresh, logout, and assigned/unassigned accounts on the hosted deployment. No hosted project or production deployment is provisioned by this code.
- Review backup/retention policy and administrative access before collecting real resident data.

## Current scope

Implemented: project foundation, Supabase SSR Auth, role and membership schema, RLS, complexes with two towers and shared facilities, structured submission, private photo/video attachments, confirmed semantic grouping, private receipts, derived aggregate statistics, migrations and seed.

**Not implemented:** automatic unconfirmed merging, management mutation/dashboard UX, alert generation, notifications, product email, legacy-ticket UX, or external management integration. The alerts table is a future-facing schema only. Management updates are append-only records; no incident-state synchronization workflow runs yet.

The original foundation and subsequent explicitly authorized extensions are documented in [specification coverage](docs/specification.md). Semantic grouping, statistics, complex locations and private media are now in scope; management workflows, alerts and notifications remain deferred.

## Complex places and resident reporting

Each building belongs to a complex. Residents of either tower can see shared incidents throughout their complex, including the other tower and shared facilities. Unit numbers, memberships, private report text and media remain restricted. A manager sees their assigned tower(s) plus shared facilities, not another tower's private operational data without assignment.

For the pilot, the existing building ID is retained and renamed from the seed name L Tower to Tower 2; Tower 1 is added in the same complex. Existing memberships, 3C units, reports and local accounts are preserved. Other existing buildings remain in isolated complexes. The number of floors has not been assumed or generated.

The form separates:

- **Place:** Tower 1 / Tower 2 → entrance/lobby, corridors, stairs, elevators, technical rooms, own underground parking and parking gate; or shared grounds, playground, pool, waste point, main/rear/pedestrian gate, Other.
- **Request type:** fault, missing/unavailable facility or service, request a change.
- **Problem category:** elevators; water/drainage; electricity/lighting; gas; access; ventilation/temperature; cleaning/waste; pests; building/surfaces; outdoor areas; pool/facilities; noise; Other with a required description.
- **Public title/location versus private details and files.** Gas guidance tells residents to use emergency services rather than wait in the app.

### Local semantic analysis and synthesis

`npm run model:prepare` downloads `Xenova/multilingual-e5-small` at revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`. The quantized ONNX weights are SHA-256 verified against the repository's LFS hash before private inference. Only model data is downloaded; no remote Python/custom model code runs. Normal inference uses `local_files_only` and executes on the Node server with two CPU threads; the preparation command explicitly enables artifact downloads. If the OS clears its temporary cache, rerun preparation before reporting. No report text is sent to Hugging Face or a paid AI provider, and no AI API key is required.

Private vectors stay in the unexposed `private` schema. Suggestions expose only existing shared incident metadata and counts, not source text, embeddings, or raw similarity scores. Candidates must be unresolved, in the same complex and exact structured place, have the same category/request type and matching explicit object numbers/location detail. Cosine similarity must be at least 0.89. This is a conservative suggestion threshold, not a probability of correctness. The resident confirms a match or chooses a separate problem. Different towers, elevators, request types and closed incidents are not silently merged.

The transaction creates a report under the confirmed incident or creates a new incident, snapshots the reporting unit if known, attaches uploaded files, and commits the submission key together. Retries of the same submission do not duplicate records. The form retains its batch identifier through validation/matching steps so staged files survive confirmation. Existing legacy incidents without vectors are counted but are not retrospectively reclassified or semantically indexed; that requires a separate reviewed backfill.

Statistics count confirmed groups and synthesize totals by status, category, request type and place. Report totals include individual reports without exposing their rows. Reporting-household totals count distinct known unit UUIDs, never followers, and explicitly disclose reports without a known unit. There is no free-form AI-generated summary that could reveal private details.

### Private photos and video

Up to five attachments, at most one video: JPEG/PNG/WebP/HEIC/HEIF/AVIF photos up to 10 MiB, MP4/MOV/WebM video up to 50 MiB. SVG/HTML and arbitrary executable/document types are not accepted. Browser previews and removal are available before submission. HEIC rendering depends on the browser; a filename remains available when preview is unsupported.

The client reserves bounded, owner-scoped object paths, then uploads directly to private Supabase Storage with its authenticated session. Video bytes do not pass through Next.js Server Actions or Vercel's request-body limit. The server checks actual byte size and media signature before finalizing; the database independently checks authoritative Storage MIME/size metadata and immutable reservation ownership. RLS remains enforced even for direct Storage/API calls. No service-role key is used by the application. MIME/signature checks are not antivirus scanning or video transcoding.

Submitted files are visible only to the report author, assigned management and application admins. Downloads use authorized, noncached redirects to 60-second signed URLs and force download; possession of an already-issued URL permits access until its short expiry. Original metadata is retained in private files; EXIF stripping is not implemented. Neighbors receive neither file metadata nor links. Unsubmitted reservations expire after 24 hours and become inaccessible; automatic removal of abandoned/orphaned physical objects is not implemented. Establish a Storage API cleanup/retention job and quotas before production use; do not directly delete Storage metadata via SQL.

### Updating an existing local installation

Do not reset the database. Stop the Next dev server with Ctrl+C, install the lockfile dependencies with the CPU flag, restart the local Supabase stack to enable Storage, apply pending migrations, and prepare the model:

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run db:stop
npm run db:start
npx supabase migration up --local
npm run model:prepare
npm run dev
```

`db:stop` retains local data; do not pass `--no-backup`. Preserve `.env.local` and existing users/memberships. During guided setup, execute one step at a time and inspect its result before proceeding. On this cloud host, keep the `SUPABASE_HOME`, `SUPABASE_USE_SLIM_IMAGES` and `DOCKER_CONFIG` values described above. If model downloads require the environment proxy, set `NODE_USE_ENV_PROXY=1` for preparation/startup; never disable TLS checks. Required model destinations are `huggingface.co`, its subdomains and `us.aws.cdn.hf.co` / Hugging Face's configured Xet destinations.

### Additional verification

```sh
npm run test:semantic
npm run test:migrations        # clean install + data-preserving legacy upgrade in disposable databases
# Run against the LOCAL database only; fixtures are rolled back.
docker exec -i supabase_db_building-issues psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/complex_semantic_media.sql
```

The existing `npm run test:smoke` covers real local Auth, typed form actions, semantic proposals/confirmation, statistics, idempotency and revocation. Optional mobile browser tests live in `scripts/browser-smoke.mjs`; Playwright and the headless browser are installed outside this checkout, as documented at the script top. The browser test uploads a real PNG and recorded WebM, confirms a second resident's paraphrase with staged media, checks download privacy and removes synthetic users/files afterward. Its local administrative cleanup binding is kept in the Node test process and never passed to the browser.

For hosted deployment, make the pinned model available in a writable cache or deliberately enable cold artifact downloads with server-only `SEMANTIC_ALLOW_MODEL_DOWNLOAD=1`, allow cold-start time/memory, enable Storage and apply all migrations first. The Node server requires native CPU ONNX support; do not put this pipeline in an Edge runtime. Cold-start latency, native bundle size and execution limits must be measured on the chosen Vercel plan; hosted deployment has not been validated here. Add production rate limits and abandoned-upload cleanup before opening access to real residents.
