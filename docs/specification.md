# Specification and agreed scope

The original task was a secure foundation only. Later user instructions explicitly extended that scope; they take precedence over the original deferred-feature list.

| Phase | Delivered scope |
| --- | --- |
| Foundation | Next.js/TypeScript, Supabase clients/Auth, all twelve core entities, role assignments, RLS, protected shell, synthetic seed, migrations and documentation |
| Resident submission | Mobile form, server validation, atomic report + incident creation, protected confirmation/list, transaction and access tests |
| Complex/media/semantic extension (2026-10-27) | Two towers, each tower's entrance/interior/parking/gate; shared grounds/playground/pool/waste/main/rear/pedestrian gates; private photos/video; meaning-based suggestions with confirmation; derived complex-wide statistics |

## Confirmed product decisions

- Tower 1 and Tower 2 belong to one complex. The user's local Tower 2/3C membership is preserved by keeping the original building ID; no account IDs or personal emails are hard-coded into product logic or seed.
- Each tower has its own entrance/lobby and underground parking. Playground, pool, waste collection point, main gate and rear gate are common complex facilities. The number of floors was not confirmed and is not assumed.
- Residents see shared incidents and statistics across both towers and common facilities. Individual reports, unit numbers and attachments remain private to their author, authorized management and admins.
- Place, problem category and request kind are separate. A request to open rear gates is a change request, not automatically a fault. An absent waste point or unopened pool is a missing/unavailable facility or service. Other includes a text description; residents do not silently create global categories.
- Semantic analysis runs locally using a pinned, verified multilingual model. Similar reports are candidates for the same incident only in the same scope, category, request type and object. The resident confirms a proposed match or creates a separate issue. Statistics count confirmed incident groups; no private text or generated private-text summaries are exposed to neighbors.
- Up to five private media files, at most one video: photos up to 10 MiB and video up to 50 MiB. Direct authenticated Storage uploads avoid application-body size limits.

## Still deferred

Management dashboard/mutation workflows, automatic unconfirmed merging, incident status synchronization through management updates, alert generation, notifications, product email, legacy-ticket UX, building invitations and external management-system integration remain outside the authorized scope.

Hosted deployment, real SMTP, native model cold-start measurements, media retention cleanup, production quotas and rate limits remain operational configuration and verification work. The presence of a table does not authorize a deferred workflow.
