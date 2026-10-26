# Specification coverage

This records the original Building Issues foundation specification and the subsequent explicitly requested resident submission extension. It does not authorize another product phase.

## Original foundation

| Required area | Implementation |
| --- | --- |
| Project foundation | Next.js App Router, strict TypeScript, npm lockfile, responsive English shell |
| Environment configuration | `.env.example`, ignored `.env.local`, README setup and deployment instructions |
| Supabase integration | Reusable typed browser/server clients; public key and user session only |
| Database | `202610250001_foundation.sql`: all 12 entities, UUID keys, timezone-aware timestamps, enums, foreign keys, uniqueness and indexes |
| Authentication | Passwordless email, token-hash callback, verified session, refresh and logout |
| Roles and assignments | Resident memberships separate from profiles; multiple management-building assignments; trusted role provisioning |
| Authorization | RLS on all application tables; restricted column grants; database role and building checks |
| Protected shell | `/login`, `/app`, `/app/issues`; building names filtered through RLS |
| Development data | Idempotent L Tower seed, four units, three example incidents; no real personal information or seeded passwords |
| Documentation and validation | README, security decisions, verification evidence, SQL authorization suites and local HTTP/Auth checks |

Residents cannot read other residents' profiles, unit numbers, or individual reports. Management access is limited to assigned buildings. No private report rows are exposed to calculate shared counts. User-editable metadata cannot grant an application role. Official management statuses cannot be forged through resident recollections.

Hosted Supabase credentials, email delivery configuration, Auth Site URL/templates and Vercel deployment remain developer deployment configuration; local verification does not establish production deployment.

## Separately authorized extension

The user subsequently requested resident report submission and creation of a linked incident in one transaction. `202610260001_resident_submission.sql` and `/app/issues/new` implement that extension. `/app/issues` consequently displays shared incidents rather than the original allowed placeholder. These changes remain in place; reverting them would discard an explicitly requested feature.

The RPC derives the resident/building from authenticated database state, validates input, and rolls back both writes on failure. The shared title/location are distinct from private report details. No report matching is performed.

## Deferred by the original specification

The following remain outside the current implementation scope:

- Management dashboard, management status-change UX and synchronization of incidents through management updates.
- AI, semantic search, embeddings and duplicate detection.
- Alert-generation jobs, notifications and product email (Auth sign-in email is required and remains supported).
- Legacy-ticket UX, image uploads, building invitation codes and management-system integration.

The `management_updates` and `alerts` tables are schema foundations for later work. Their existence does not require implementing the deferred workflows now. No management workflow should be added solely because it was suggested as a next step in conversation.
