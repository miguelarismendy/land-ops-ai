# workflows

Daily automation logic and scheduling scripts.

This folder contains the orchestration layer — the scripts that run on a schedule and coordinate all agents.

## Key Workflows

- `daily-morning-routine.js` — Runs at 6am, triggers morning-briefer agent, waits for owner response
- `sms-campaign-scheduler.js` — Builds and queues SMS campaigns after owner confirms targets
- `lead-review-cycle.js` — Runs nightly, qualifies new leads and updates pipeline tags in GHL
- `safety-canceller.js` — Monitors pending actions and auto-cancels if no owner confirmation received
