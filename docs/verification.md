# Verification evidence

Verified in the cloud workspace on 2026-10-25. The repository initially had no files or commits; no existing code was overwritten.

| Check | Result |
| --- | --- |
| Reproducible install | `npm ci` completed using the committed lockfile |
| Lint | `npm run lint` passed, zero warnings |
| Strict TypeScript | `npm run typecheck` passed with TypeScript 6.0.3 |
| Production build | `npm run build` passed with Next.js 16.4.3 / React 19.3.1 |
| Production dependency audit | `npm audit --omit=dev` reported zero advisories at verification time |
| Clean migration | Created all twelve tables on clean PostgreSQL 17, then on clean Supabase PostgreSQL 17.11 via the official CLI |
| Synthetic seed | Applied successfully; reapplication on PostgreSQL inserted no duplicate buildings, units, or incidents |
| RLS/integrity suite | `supabase/tests/rls.sql`: 43 assertions passed against the actual local Supabase database; fixtures rolled back |
| Local Auth integration | `npm run test:smoke`: 16 checks passed against the real local Supabase Auth/REST/PostgreSQL and production Next.js server |
| Session lifecycle | Real token-hash callback, session cookies, forced expiry with real Auth refresh, logout, and used-link replay rejection passed |
| Protected routes | Both `/app` and `/app/issues` redirected logged-out requests to `/login` |
| Authenticated shell | Unassigned user reached `/app`; assigned user saw L Tower in `/app/issues` |
| Invalid input/redirects | Server rejected invalid email; invalid callback token and external redirect target did not grant access |
| Credentials | Nonignored source scan found no private-key blocks, secret Supabase keys, JWT credentials, or password-bearing database URLs. `.env.local` is ignored; no real resident data or credentials were added |

The HTTP smoke test creates a unique fictional development user, uses local captured email, assigns a seed-building membership, then deletes that user and membership. It does not send email to a real recipient. No new browser or unit-test framework was introduced. The SQL tests check actual PostgreSQL authorization roles, not mocked query results.

## Cloud-specific setup corrections

- npm's default home cache was not writable. Setup uses `--cache /tmp/building-issues-npm`.
- The full Supabase PostgreSQL Docker image failed extraction with a space error. Official `SUPABASE_USE_SLIM_IMAGES=true` images loaded and passed health checks; checksum/digest and TLS checks remain enabled.
- This host's default Docker client configuration forwards external proxies to containers, breaking local Auth health/template requests. A separate empty Docker client config under `/tmp/building-issues-docker-local` is used only for the local stack. Global Docker settings and outbound daemon networking were not changed.
- The initial cloud umask created the public email template with mode 600. Changing that template to 644 lets the local gateway serve it to Auth. No secret-bearing file was made public.

## Still requires hosted configuration

No hosted Supabase project, production SMTP, Vercel deployment, or production database was supplied or provisioned. Hosted email delivery, deployed URL/cookie behavior, platform-specific deployment, and backup/retention settings have **not** been verified. Configure the two public environment values, Site URL, email templates, migrations, trusted role assignments, and SMTP per README before a pilot. Local passing checks do not establish production delivery or deployment readiness.

No AI, report matching, alert generation, notification delivery, image upload, management dashboard, or incident creation UX was tested or implemented, because those features are outside this task.

## Resident submission verification — 2026-10-26

- Both migrations applied to a fresh isolated database on local Supabase PostgreSQL 17.11, with a minimal Auth schema harness; current-stack tests also ran against real Supabase Auth tables. The temporary database was dropped afterward. Existing development data was not reset.
- Original RLS suite: 43 assertions passed. New `supabase/tests/resident_submission.sql`: 28 assertions passed, including input limits, Unicode whitespace, permissions, cross-building privacy, active membership, role checks, and rollback after an injected report-write failure. All fixtures roll back.
- Extended real local HTTP/Auth smoke suite: 26 checks passed against the production server, including the actual submission action, one linked incident/report pair, ignored forged identity/building/status/source fields, private text absent from shared output, and stale forms rejected after access revocation or role change. Test incidents, reports, memberships and Auth users are cleaned up.
- Lint, strict TypeScript, and production build passed with the new route and generated RPC types. No new dependencies were needed.
- `/app/issues/new` provides a single-column responsive form, descriptive labels, field errors, a pending state, and 44px minimum controls. No browser/device visual automation was performed.
- Hosted migration/deployment and production email delivery remain unverified. Apply the new migration with authorized Supabase tooling before deploying the app.

The earlier foundation-only scope above describes the preceding phase. Resident incident creation UX is now implemented; AI, matching, alerts and notifications remain absent.
