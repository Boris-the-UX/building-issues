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

### Description-first submission

The resident begins with one private description and optional media. Phone keyboard dictation can populate the same field; the app does not record or transcribe audio. A conservative local English/Russian rule parser suggests the category, request kind, floor/object and an exact known place when unambiguous. It does not call an LLM or infer an observation date. Missing/ambiguous places and unknown categories require resident clarification. The home tower is shown as a selectable suggestion, never silently used to resolve an unspecified tower.

Before saving, the resident reviews a public title assembled only from controlled category/place labels and recognized numeric floor/object details, keeping their private narrative out of the public title. All fields remain editable. Existing server validation, membership/RLS, private media upload, semantic matching and explicit grouping confirmation continue unchanged. This change does not add community status voting or statistics charts.

Check draft extraction with `node scripts/test-draft.mjs`; the mobile browser suite covers the new first step and the full media/grouping submission flow.

### Resident overview and statistics

The overview uses one table with separate Issue, Location, Status and Reports columns (stacked cards on mobile). Tower names are data in the Location column, never standalone navigation. Private report details remain behind the author's My report link. No unverified request-type label is shown in overview rows.

Issue statistics uses labeled horizontal bar charts for category, status and location, with exact counts visible on touch screens. Summary values align at the bottom. Location, category, status and opened-since filters apply together on the server to all metrics and charts through an authorized aggregate RPC; there is no 100-row chart sampling limit. The date filter selects issues by their creation date, not the dates of individual reports. Reports count all reports attached to the filtered issues; charts count distinct issues. No private narrative or media is returned.

The upload control has an English label and English file-count text independent of browser locale. The operating system's file chooser language is controlled by the user's device.

### Structured resident survey (supersedes description-first submission)

The pilot complex has Tower 1, Tower 2, Bloco 1 and Bloco 2. The latter are separate lower buildings, not wings silently assigned to a tower. Existing memberships/units remain untouched. Do not assume that the lower buildings have lifts, underground parking or technical rooms; these options are omitted pending confirmation.

Reporting requires four explicit choices: building/shared grounds, place/facility, contextual problem option (including Other), and current resident-known status. There is no inferred/default building choice. Other requires a short public problem description; Other status requires a private clarification. Optional location detail, private narrative and media remain available. The server derives category/request kind from the selected valid problem option; the public title is reviewed before saving. Phone keyboard dictation can fill optional narrative. No audio recording is added.

Resident statuses exactly follow the survey: Resolved / Fixed, In progress, No response, Promised, but not fixed, Not sure, Other. They are dated assertions by residents, not verified management progress. Append-only observations are stored atomically with report creation; replay does not duplicate them. Active residents may add a dated update on the shared issue page. Latest known observation is displayed; Not sure does not erase a previous known status. There is no consensus/automatic verification claim. Underlying legacy management status remains unchanged. Resident-resolved episodes are excluded from similarity suggestions and cannot accept new semantic joins; a new fault is a new episode.

The shared issue page shows submission dates and status history without identities, unit numbers, private descriptions, status free text, or attachments. The Your report block links only the signed-in resident's own private reports, with a brief privacy explanation. RLS and private Storage checks remain in force. Home redirects directly to Issues; the overview title and report count link to the shared history. Date filters use English Day/Month/Year controls rather than locale-dependent native date fields.
