# Agent Observation Tool

## Goal
Build a multi-tenant agent observation and evaluation platform. Agents POST events via API keys. Users log in via magic links. The dashboard shows agents, tasks, event timelines, and LLM-scored evaluations.

## Stack
- **Framework:** Next.js 14+ App Router (fullstack — API routes + React UI)
- **ORM:** Drizzle ORM
- **Database:** SQLite (via better-sqlite3)
- **LLM Judge:** OpenRouter API (configurable model via `OPENROUTER_API_KEY` + `JUDGE_MODEL` env vars)
- **Email:** inbound.new for magic link delivery
- **Deploy:** Railway
- **Testing:** Vitest

## Design
- Minimal black/white + one accent color (Linear/Notion-inspired)
- Generous whitespace, clean typography
- No unnecessary decoration
- Follow `design-principles` skill

## Data Model

### Auth / Tenancy
- `workspaces` — id, name, created_at
- `users` — id, workspace_id, email, created_at
- `magic_links` — id, workspace_id, email, token_hash, expires_at, used_at, created_at
- `sessions` — id, user_id, workspace_id, created_at, expires_at, revoked_at

### API Keys
- `api_keys` — id, workspace_id, name, secret_hash, prefix, scopes (JSON), created_at, last_used_at, revoked_at

### Event Log
- `eval_events` — id, workspace_id, agent_name, task_id, interaction_type (enum: UserInput|ToolCall|McpCall|SkillCall|Reasoning|Result|Error), message, payload_json, result_json, error_json, ts, received_at
- Indexes: (workspace_id, agent_name, ts), (workspace_id, task_id, ts)

### Agent Evaluations + Scores
- `agent_evaluations` — id, workspace_id, agent_name, rubric_text, expected_text, is_enabled, version (int), created_at, updated_at
- `eval_scores` — id, workspace_id, task_id, agent_name, evaluation_id, evaluation_version, score_1_to_10 (int nullable), verdict_text, llm_model, prompt_hash, created_at, error_json

## API Contract

### Ingest (API key auth)
- `POST /v1/eval-events` — accepts event JSON, returns `{ event_id, accepted }`

### Dashboard reads (session auth)
- `GET /v1/agents` — aggregated per-agent stats (cursor paginated)
- `GET /v1/agents/:agent_name/tasks` — tasks list + score (cursor paginated)
- `GET /v1/tasks/:task_id` — task summary + derived status + totals + eval score
- `GET /v1/tasks/:task_id/events` — event timeline sorted by ts (cursor paginated)

### Evaluation CRUD (session auth)
- `PUT /v1/agents/:agent_name/evaluation` — create/update evaluation (increments version)
- `GET /v1/agents/:agent_name/evaluation` — get latest evaluation
- `GET /v1/agents/:agent_name/scores` — scores list (cursor paginated)

### API Key Management (session auth)
- `POST /v1/api-keys` — create key, return secret once
- `GET /v1/api-keys` — list keys (no secrets)
- `DELETE /v1/api-keys/:key_id` — revoke key

### Magic Link Auth
- `POST /v1/auth/magic-link` — request magic link email
- `GET /v1/auth/magic-link/consume?token=...` — consume token, set session cookie, redirect to /app/agents
- `POST /v1/auth/logout`
- `GET /v1/me`

## Dashboard Pages

### /app/agents — Agents list
Table: agent name, tasks count, success rate, errors, avg/p95 latency, cost, last seen. Click → agent detail.

### /app/agents/:agent_name — Agent detail (tasks)
Summary cards at top. Tasks table: task_id, status, started_at, duration, cost, events count, score. Filters: time range, status, min score, error presence. Click → task detail.

### /app/tasks/:task_id — Task detail (event timeline)
Header: agent, task, status, totals, score + verdict. Timeline list with expandable JSON payload/result/error per event.

### /app/agents/:agent_name/evaluation — Evaluation config
Textareas for rubric + expected. Toggle enabled. Save increments version.

### /app/settings/api-keys — API key management
Create key (name + scopes). List keys with last used. Revoke button.

## LLM Scoring (MVP)
- Trigger: when event with `interaction_type="Result"` is ingested
- Load active evaluation for that agent (workspace-scoped)
- Load task transcript (UserInput + Result messages)
- Call OpenRouter with judge template, require JSON output `{ score, verdict }`
- Store in `eval_scores` with evaluation_version + prompt_hash
- If judge fails or returns invalid JSON: store error_json, leave score null
- Score inline (synchronous) for MVP

## Constraints
- All reads must enforce workspace isolation
- Cursor pagination on all list endpoints (stable ordering, no duplicates)
- API key secrets hashed, only shown once on creation
- Magic link tokens hashed, expire after use
- `interaction_type="Reasoning"` accepted but optional
- Force judge JSON output, clamp or reject scores outside 1–10
- Store prompt_hash + evaluation_version for reproducibility

## Tasks
See `@fix_plan.md` for the prioritized, test-first milestone list.

## Definition of Done
- [ ] Agents can POST events with API keys
- [ ] Users can log in with magic link
- [ ] Dashboard lists agents, drills into tasks, drills into event timeline
- [ ] Each agent can have one evaluation definition
- [ ] Each completed task gets an LLM score 1–10 stored and displayed
- [ ] Multi-tenant workspace isolation enforced everywhere
- [ ] All milestone tests pass
- [ ] Deployed to Railway
