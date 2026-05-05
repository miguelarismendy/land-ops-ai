# agents

This folder contains all AI agents for the land-ops-ai system.

## Agents

- `morning-briefer/` — Texts the owner at 6am, waits for targeting instructions before taking any action
- `lead-qualifier/` — Scores and ranks contacts in GHL pipeline by lead quality
- `sms-scheduler/` — Builds and schedules SMS campaigns based on owner input
- `follow-up-agent/` — Automated follow-up sequences for sellers and buyers
- `offer-agent/` — Sends blind offers to land sellers daily
- `voice-agent/` — Makes outbound calls and handles negotiations via AI voice

Each agent folder contains its own script, prompt file, and config.
