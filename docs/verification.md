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

## Complex, media and semantic extension — 2026-10-27

This supersedes the preceding phase's statements that matching, statistics and uploads were absent.

- All five migrations applied to a clean PostgreSQL 17 database with minimal Auth/Storage schema harnesses. Repeated seed application produced no duplicates. Regression suites ran against the actual local Supabase stack as well.
- Original suites passed: 43 RLS checks plus 28 resident-submission checks. The complex/media suite passed 47 assertions (118 database assertions total) and adds isolation across complexes, shared visibility across towers, management scope, semantic scope gates, grouping confirmation, idempotency, aggregate privacy, household counts, upload type/size/count limits, closed incidents and file revocation.
- The real pinned multilingual E5 model produced 384-dimensional normalized embeddings. Cosine scores on synthetic examples were 0.943 for elevator paraphrases, 0.901 for Russian/English descriptions, 0.932 for missing-waste-point paraphrases, and 0.827 for an unrelated facility. The conservative 0.89 threshold excludes the unrelated example. These examples validate integration, not overall model accuracy; grouping requires human confirmation and exact scope checks.
- Model weights matched the pinned repository's LFS SHA-256 `f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193`. No report text was sent to a remote AI provider.
- Extended real local HTTP/Auth suite passed 33 checks, including proposals from actual inference, confirmed grouping, idempotent retry, private receipts, aggregate statistics and revocation.
- A real Chromium browser at 390×844 passed 21 mobile checks. These included dynamic location/category controls, Other/gas guidance, photo preview/removal, real PNG and recorded WebM uploads, exact authorized file bytes, neighbor and logged-out download denial, semantic paraphrase confirmation with a staged photo, and statistics. There was no horizontal overflow. Synthetic users, reports and physical Storage files were removed afterward.
- An early browser test exposed the need to keep an upload batch ID stable across Server Action re-renders; this was fixed and the complete confirmation-with-media scenario passed.
- Browser dependencies were installed outside the repository. CDN browser download was blocked; an npm integrity-verified packaged headless Chromium was used instead. The application dependency tree does not include Playwright/Chromium.
- Lint, strict TypeScript, production build and a production dependency audit passed; the audit reported zero advisories at verification time.

Not verified: hosted Vercel deployment, plan-specific native bundle/cold-start limits, real SMTP or production-scale matching accuracy. Automatic abandoned-object cleanup, malware scanning, EXIF removal and transcoding are not implemented; files stay private and a production retention/quota strategy is required.

The final migration harness also upgraded a populated foundation database and confirmed that the original building ID, active Tower 2/3C membership, private report and legacy recollection survived, with two towers and no duplicate 3C unit.

Normal inference was additionally tested with both library and global fetch disabled. Model components load from their verified local directory, avoiding an upstream metadata probe that ignored offline/revision options. A fresh-cache artifact download and offline inference test exercise the first-install path separately.

2026-10-28 overview/statistics refresh: production build, lint, TypeScript and disposable clean/upgrade database suites pass. Five SQL assertions cover filtered totals, date/category/location scoping and outsider rejection. `BROWSER_UI_ONLY=1 BROWSER_TEST_TOOL_DIR=/tmp/building-issues-browser BROWSER_TEST_SERVERLESS_CHROMIUM=1 npm run test:browser` passes eight real browser checks for charts, filters, baseline alignment, English upload label and mobile layouts. Screenshots visually reviewed. The full submission browser run reached media preview but could not submit because this environment lacks the pinned semantic model cache and its artifact fetch returns proxy HTTP 403; full semantic/media submission has not been reverified in this run.

2026-10-28 structured survey and Bloco buildings: production build, lint, generated Supabase types and clean/upgrade SQL suites pass; the upgrade preserves Tower 2 / 3C and private reports while adding Bloco 1/2. SQL checks cover atomic/idempotent initial status, invalid status rollback, append-only updates, Not sure preserving known status, cross-complex denial and history privacy. All 33 real HTTP/Auth checks and 30 full mobile browser checks pass, including actual photo/video submission, semantic grouping confirmation, shared/private report separation, resident status updates, charts, filters and aligned counters. The pinned local model was prepared successfully for this run. No external AI key or private text transfer is involved.
