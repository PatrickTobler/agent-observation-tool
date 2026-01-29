# Fix Plan

## Priority 0 (Setup)
- [x] Initialize Next.js 14+ App Router project with TypeScript
- [x] Set up Drizzle ORM with SQLite (better-sqlite3)
- [x] Define all schema tables in Drizzle (workspaces, users, magic_links, sessions, api_keys, eval_events, agent_evaluations, eval_scores)
- [x] Run initial migration / push schema
- [x] Set up Vitest with test utilities (test DB, request helpers)
- [x] Create env config (OPENROUTER_API_KEY, JUDGE_MODEL, INBOUND_NEW_API_KEY, SESSION_SECRET)

## Priority 1 (Milestone A — Event Ingest)
- [x] Implement API key auth middleware (hash lookup, workspace resolution, scope check)
- [x] Implement `POST /v1/eval-events` endpoint
- [x] Test: `ingest_valid_event_returns_201_and_event_id`
- [x] Test: `missing_auth_returns_401`
- [x] Test: `invalid_api_key_returns_401`
- [x] Test: `missing_required_fields_returns_400`
- [x] Test: `invalid_interaction_type_returns_400`
- [x] Test: `invalid_ts_returns_400`
- [x] Test: `persists_event_with_workspace_scope`

## Priority 2 (Milestone B — Task Derivation + Reads)
- [x] Implement task derivation logic (pure functions): started_at, last_event_at, duration_ms, status, totals
- [x] Implement `GET /v1/agents` with aggregation + cursor pagination
- [x] Implement `GET /v1/agents/:agent_name/tasks` with cursor pagination
- [x] Implement `GET /v1/tasks/:task_id` with derived fields
- [x] Implement `GET /v1/tasks/:task_id/events` with cursor pagination
- [x] Test: `task_status_failed_if_error_event_exists`
- [x] Test: `task_status_succeeded_if_result_exists_and_no_error`
- [x] Test: `task_status_unknown_otherwise`
- [x] Test: `task_events_are_sorted_by_ts`
- [x] Test: `agents_list_aggregates_correctly`
- [x] Test: `agent_tasks_list_returns_expected_fields`
- [x] Test: `workspace_isolation_enforced_on_all_reads`
- [x] Test: cursor pagination stable ordering + no duplicates

## Priority 3 (Milestone C — Magic Link Auth)
- [x] Implement EmailProvider interface (mock for tests)
- [x] Implement inbound.new concrete email provider
- [x] Implement `POST /v1/auth/magic-link` (generate token, hash, send email)
- [x] Implement `GET /v1/auth/magic-link/consume` (verify token, create session, set cookie, redirect)
- [x] Implement `POST /v1/auth/logout`
- [x] Implement `GET /v1/me`
- [x] Implement session auth middleware
- [x] Test: `magic_link_request_creates_token_and_sends_email`
- [x] Test: `magic_link_consume_creates_session_and_redirects`
- [x] Test: `expired_token_rejected`
- [x] Test: `replay_token_rejected`
- [x] Test: `me_endpoint_requires_session`

## Priority 4 (Milestone D — API Key Management)
- [x] Implement `POST /v1/api-keys` (generate secret, hash, store prefix)
- [x] Implement `GET /v1/api-keys` (list without secrets)
- [x] Implement `DELETE /v1/api-keys/:key_id` (revoke)
- [x] Update ingest middleware to update `last_used_at`
- [x] Test: `create_api_key_returns_secret_once`
- [x] Test: `list_api_keys_does_not_return_secret`
- [x] Test: `revoke_api_key_blocks_ingest`
- [x] Test: `last_used_at_updates_on_ingest`

## Priority 5 (Milestone E — Evaluation CRUD)
- [x] Implement `PUT /v1/agents/:agent_name/evaluation`
- [x] Implement `GET /v1/agents/:agent_name/evaluation`
- [x] Implement `GET /v1/agents/:agent_name/scores` with cursor pagination
- [x] Test: `put_evaluation_creates_version_1`
- [x] Test: `put_evaluation_updates_increments_version`
- [x] Test: `get_evaluation_returns_latest`
- [x] Test: `disabled_evaluation_is_respected`

## Priority 6 (Milestone F — LLM Scoring)
- [x] Create Judge interface (abstract)
- [x] Implement OpenRouter judge (call API, parse JSON response)
- [x] Implement mock judge for tests
- [x] Wire scoring into Result event ingest (synchronous MVP)
- [x] Build judge prompt template (rubric + expected + transcript → JSON {score, verdict})
- [x] Test: `result_event_triggers_judge_when_eval_enabled`
- [x] Test: `judge_receives_rubric_expected_userinput_and_result`
- [x] Test: `stores_score_with_eval_version_and_prompt_hash`
- [x] Test: `invalid_judge_output_creates_eval_error_record`
- [x] Test: `score_out_of_range_rejected_or_clamped`
- [x] Test: `task_summary_includes_eval_score_if_exists`
- [x] Test: `agent_tasks_list_includes_score_column`

## Priority 7 (Dashboard UI)
- [x] Create app layout (minimal black/white, sidebar nav)
- [x] Build `/app/agents` — agents list table with stats
- [x] Build `/app/agents/:agent_name` — agent detail with summary cards + tasks table + filters
- [x] Build `/app/tasks/:task_id` — task detail with event timeline + expandable JSON
- [x] Build `/app/agents/:agent_name/evaluation` — evaluation config page (textareas, toggle, save)
- [x] Build `/app/settings/api-keys` — API key management page (create, list, revoke)
- [x] Build login page (email input → magic link flow)
- [x] Display eval scores on tasks table and task detail header
- [ ] Verify all pages in browser

## Priority 8 (Deploy)
- [ ] Create Railway project
- [ ] Configure env vars on Railway
- [ ] Set up SQLite persistent volume on Railway
- [ ] Deploy and verify
- [ ] Generate public domain

## Completed
All milestones A–F implemented and passing (89 tests). Dashboard UI pages built. Remaining: browser verification + Railway deploy.
