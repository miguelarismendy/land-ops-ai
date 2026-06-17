# permit-pulls

Per-county builder permit pulls. Each subfolder documents how to reach a
specific county's public permit data, what fields it exposes, and how to
shape the output into the standard builder CSV used by the rest of the
land-ops-ai system.

## Counties

- `marion-county/` — Marion County, FL. EnerGov self-service portal.
- `lee-county/` — Lee County, FL. Accela / eConnect portal + weekly PDF reports.

## Target output

Every county pull is normalized into the columns documented in
`marion-county/csv-schema.md` so downstream agents (lead-qualifier,
follow-up-agent, sms-scheduler) see one consistent shape.
