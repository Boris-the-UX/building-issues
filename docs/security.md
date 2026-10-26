# Security and data decisions

## Authorization matrix

All twelve public tables have RLS enabled, with explicit grants to `authenticated`. `anon` has no table privileges. PostgreSQL owners and Supabase administrative service credentials can bypass RLS; those belong only in trusted administration, never in this app or browser.

| Data | Resident | Management | Admin |
| --- | --- | --- | --- |
| Profiles | Own row; edit display name only | Own row; edit display name only | Read all; edit display names |
| Buildings | Read active membership building | Read assigned buildings | Read/write |
| Units | Read own active unit only | Read assigned buildings' units | Read/write |
| Resident memberships | Read own history | Read assigned buildings' memberships | Read/write |
| Management assignments | Read own | Read own | Read/write |
| Incidents | Read active membership building; create only through resident submission RPC | Read assigned buildings | Read/write |
| Reports | Read/write own, in active building; insert source `app` only | Read in assigned buildings | Read/write, associations immutable through API |
| Legacy tickets | Read own in active building; write only own recollections without official status | Read in assigned buildings | Read/write, associations immutable through API |
| Management updates | Read shared updates in active building | Read assigned buildings | Read/append only |
| Follows / update requests | Read/insert/delete own in active building | No private resident-follow access | Read/insert/delete |
| Alerts | No access yet | Read in assigned buildings | Read/write |

"Write" is constrained by column grants, FK/check constraints, and policies. No anonymous API can read seed data. A management role alone grants no building access. More than one `management_buildings` row grants multiple buildings. A membership is useful for resident access only while active and while the profile's database role is `resident`.

## Trusted identity and provisioning

- Auth `getUser()` verifies sessions in the Next.js proxy and protected layout. Route checks improve UX; direct API requests remain protected by RLS.
- Auth triggers create profiles and synchronize changed email. They **never** accept a role from user-editable metadata. Browser/profile API grants permit only `display_name` updates.
- Initial admin promotion, role changes, profile lifecycle, and membership/management provisioning require trusted SQL/dashboard access. App admins can manage application records under RLS, but cannot elevate users through the ordinary profile API. No self-service assignment endpoint exists.
- Private `security definer` policy helpers derive the caller from `auth.uid()` and database roles/assignments. Their `search_path` is fixed and references qualified. They bypass recursive RLS safely without trusting JWT metadata. Only policy helper execution is granted to `authenticated`; trigger functions are not callable. Keep the `private` schema out of PostgREST's exposed schemas.
- Sign-in uses the documented token-hash email confirmation pattern. Both new-user confirmation and existing-user magic-link templates must point to `/auth/confirm?token_hash=…&type=email`. Callback destination is fixed, so user-controlled redirect targets cannot create an open redirect.
- Server actions have Next.js origin checks. No custom cross-origin authorization bypass is configured. Login replies are generic and do not expose Auth errors or account existence. Supabase rate limits must be configured for production.
- SSR clients use only the public API key and user session. There is no service-role key, privileged backend client, client role selector, or password storage.

## Privacy and integrity

- Resident membership is separate from profile. A partial unique index allows one active building per resident in the MVP; historical memberships remain. Multi-building residency later requires an explicit migration removing this index, not moving building IDs onto profiles.
- Composite foreign key `(building_id, unit_id)` rejects units from another building. Unassigned units may be null. Unit deletion is restricted while referenced; reassign memberships first. Management user/building and follow user/incident pairs are unique.
- Building timezones are validated against the PostgreSQL timezone catalog. UTC is the schema default; `Europe/Lisbon` is pilot seed data only.
- Shared incident fields contain no private report bodies or unit numbers. No report aggregate API is shipped yet. Future aggregate functions must authorize the target building and expose counts only; do not loosen report RLS or create a default owner-executed public view of private rows.
- Reports, tickets, follows and requests cannot be moved to another incident/user through API updates. Resident-authored legacy records remain `resident_recollection` with `management_status IS NULL`. Official verification/status requires a trusted admin. Residents can read official references but cannot alter or delete them. This is deliberately safer than letting a recollection become an official statement.
- Revoking membership removes access to both shared incidents and private incident-linked rows, even if the user originally authored them. Their own membership history and profile remain readable.
- Management updates are append-only through API grants, even for app admins. No code synchronizes the current incident status from these updates yet. Trusted database maintenance can still correct records; historical retention is an administrative responsibility.
- Incidents cannot be `resolved` without `resolved_at`, or have `resolved_at` while unresolved. Last report timestamp cannot precede first report. No derived report/household counters are stored.
- Profile deletion cascades assignments and follows/requests, sets nullable historical creator references to null, but is restricted when authored reports/tickets exist. This avoids silently deleting resident evidence when deleting an Auth account. A future account-erasure process must deliberately anonymize/reassign retained records according to retention policy. Building/incident deletion cascades dependent operational data and is administrative only.
- Alert type/severity are constrained extensible enums. There are no generators, schedulers, or notification jobs.

## Scope boundaries

Management mutation workflows, incident-state synchronization, report matching, aggregation, uploads, and invitations are deliberately absent. Creating the schema does not grant management global writes. Add narrow transactional functions and tests when those workflows are implemented.

The SQL regression suite exercises actual PostgreSQL roles/RLS, not client-side mocks. Local authentication checks establish SDK integration; production SMTP, deployed URLs, rate limits, backup policy, and hosted deployment still require configuration and deployment verification.

## Atomic resident submission

`202610260001_resident_submission.sql` adds one exposed, narrowly scoped `security definer` function: `public.submit_resident_report(text,text,text,text)`. `PUBLIC` and `anon` execution are revoked; only `authenticated` is granted API execution. It still verifies `auth.uid()`, requires the database role `resident`, and derives the building from an active membership. No caller-provided user/building/status/source parameters exist. The function has a fixed empty search path and uses qualified table references with no dynamic SQL. Definer privileges allow exactly the incident/report insert that existing resident table policies disallow; the policies are not broadened.

The profile and membership are locked `FOR SHARE` while validating access and creating both records. Concurrent role/membership revocation serializes with submission, preventing a privilege-check/write race. Invalid data or a failed report insert aborts the entire call. Transactional regression tests inject a failure after report insertion and verify that neither record remains.

The shared title and location are explicit form fields with privacy guidance. Private report details are inserted only into `reports.text`; `incidents.description` stays empty. Shared list queries never fetch individual report rows or private text. A database role check also rejects management/admin use of this resident workflow, even if a stale form remains open. App/table administration stays separate.

The action independently authenticates every submission and does not trust its previous client state. Pending UI state discourages double taps but is not authorization or idempotency. No transparent retry is performed after uncertain network failure. A future retry-safe submission key should be designed separately from semantic duplicate detection if required.
