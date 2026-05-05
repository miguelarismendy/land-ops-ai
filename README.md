# land-ops-ai

AI-powered operations system for a land wholesale business — built to run on Go High Level, managed through Claude Code in VS Code.

---

## What This Is

This repository is the brain of an automated land business. It contains AI agents, scripts, and workflows that handle the day-to-day operations of wholesaling land to home builders — replacing manual work with intelligent automation.

**The system does the following:**
- Wakes up every morning, texts the owner, and waits for instructions before doing anything
- - Pulls targeted contacts from Go High Level based on the owner's response
  - - Schedules and sends SMS campaigns at the right time — with owner confirmation before firing
    - - Qualifies leads automatically and flags who to prioritize, who got missed, and who is cold
      - - Follows up with sellers and buyers via SMS and email on a defined cadence
        - - Makes outbound calls and negotiates on behalf of the owner using AI voice agents
          - - Sends blind offers to land sellers on a daily basis
            - - Cancels any pending actions automatically if the owner does not confirm
             
              - ---

              ## Folder Structure

              ```
              land-ops-ai/
              ├── agents/              # AI agents (morning briefing, lead qualifier, follow-up, voice caller)
              ├── ghl/                 # Go High Level API integrations (contacts, workflows, SMS, pipelines)
              ├── workflows/           # Daily automation logic and scheduling scripts
              ├── prompts/             # Saved system prompts for each AI agent
              ├── config/              # API keys structure, environment variables (never commit real keys)
              ├── logs/                # Agent activity logs
              └── README.md
              ```

              ---

              ## AI Agents (Planned)

              | Agent | Role |
              |---|---|
              | `morning-briefer` | Texts owner at 6am, waits for targeting instructions |
              | `lead-qualifier` | Scores and ranks contacts in GHL pipeline |
              | `sms-scheduler` | Builds and schedules SMS campaigns based on owner input |
              | `follow-up-agent` | Automated follow-up sequences for sellers and buyers |
              | `offer-agent` | Sends blind offers to land sellers daily |
              | `voice-agent` | Makes outbound calls and handles negotiations via AI voice |

              ---

              ## Tech Stack

              - **Claude Code** — primary AI coding and agent execution environment
              - - **VS Code** — development environment
                - - **Go High Level** — CRM, SMS, pipeline, and workflow platform
                  - - **Node.js / Python** — agent scripting
                    - - **GitHub** — version control and source of truth
                     
                      - ---

                      ## Status

                      🔧 In active development. Starting with morning briefer agent and GHL SMS scheduler.

                      ---

                      ## Owner

                      Miguel Arismendy — Land Wholesale Operations
