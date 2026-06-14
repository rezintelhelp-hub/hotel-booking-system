# GAS Agents

Travel-agent portal at `agents.gas.travel`. Sibling Node app to `gas-lites/`.

Architecture spec: [`docs/gas-travel-agent-unified-model.md`](../docs/gas-travel-agent-unified-model.md).

## Routes

### Public
- `GET  /`              — landing + sign-in form
- `GET  /search`        — search UI (TA.3, placeholder for now)
- `GET  /dashboard`     — bookings + commission (TA.5, placeholder)
- `GET  /healthz`       — Railway health probe
- `GET  /api/version`   — deploy verification

### Auth
- `POST /api/auth/login` `{ email, password }` → `{ token, agent }`

### Agent-only (Authorization: Bearer)
- `GET  /api/me`         — signed-in agent profile
- `POST /api/search`     — unified inventory search (TA.2, returns 501 until wired)
- `POST /api/book`       — unified booking dispatch (TA.4, returns 501 until wired)

## Auth

Reuses the existing `accounts` table. Only `travel_agent`, `agency_admin`,
and `master_admin` roles can hold an agent JWT. `password_hash` must be set
on the account (use the existing admin password-set flow — gas-agents does
not yet expose self-serve registration).

JWT signed with `AGENT_JWT_SECRET` env var, 12h TTL.

## Deploy (Railway)

1. New Railway service in the same project as `admin.gas.travel`.
2. **Root directory:** `gas-agents`
3. **Start command:** `npm start`
4. **Env vars to set:**
   - `DATABASE_URL` (same as admin app)
   - `AGENT_JWT_SECRET` (generate fresh, NOT the admin JWT secret)
   - `NODE_ENV=production`
5. **Custom domain:** add `agents.gas.travel` once DNS CNAME points at
   the Railway service. SSL auto-provisions.

## Local dev

```bash
cd gas-agents
npm install
DATABASE_URL=... AGENT_JWT_SECRET=dev-secret npm start
# -> listens on :4002
```

## Phase status

| Phase | Status | What lands here |
|---|---|---|
| TA.1 | ✅ Done | Schema (`source_kind`, `agent_markup_pct`, `agent_commission_pct`) |
| TA.2.0 | ✅ Done | This app — scaffold + login + placeholder routes |
| TA.2 | Pending | `POST /api/search` implementation (operator + Hotelbeds fan-out) |
| TA.3 | Pending | `/search` UI |
| TA.4 | Pending | `POST /api/book` + dispatch |
| TA.5 | Pending | `/dashboard` |
