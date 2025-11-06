# Duplo Context (DuploCloud) Integration

This folder contains the DuploCloud context integration for Continue. It lets you set a per-session Duplo context (Portal → Tenant → Agent), persist it.

---

## 1) Quick setup: Local Config (Portals & Tokens)

Add your Duplo portals and auth tokens to the local config. You can do this from the GUI via: Config → Local Config.

Example (`extensions/.continue-debug/config.yaml`):

```yaml
name: Local Config
version: 1.0.0
schema: v1
models:
  - name: <model-name> # e.g. Claude 4 Sonnet
    provider: <provider-name> # e.g. anthropic
    model: <model-name> # e.g. claude-sonnet-4-5-nn
    apiKey: <your-api-key>
ui:
  duplo:
    - portal: <portal-url-1> # e.g. https://test1.duplocloud.net
      token: <token-for-portal-1>
    - portal: <portal-url-2> # e.g. https://test2.duplocloud.net
      token: <token-for-portal-2>
```

Notes:

- These tokens are used by the core proxy to fetch tenants/agents and set ticket context.
- Keep tokens local and do not commit them.

---

## 2) Set DuploContext in the UI

1. Open the chat and click the DuploCloud icon in the top toolbar to open “Set DuploCloud Context”.
2. Select a Portal (loaded from `ui.duplo`), then pick a Tenant and an Agent.
3. Click Save. On success, you’ll see “Context Updated/Created”. On failures, an inline error is shown.

This persists the context to the current session. Subsequent saves will update the portal/tenant/agent as needed.

Reference UI: `gui/src/components/dialogs/DuploContextDialog.tsx`.

## Key files

- `duplo-service.ts` — Server-side proxy to Duplo APIs (tenants, create/update context, etc.)

These are wired via core protocol pass-through and the session store to persist and reuse context.

---

## Troubleshooting

- If tenants/agents don’t load, verify the portal URL and token in Local Config.
- If Save fails, check network access to the Duplo portal and token validity.
- Updating portal/tenant/agent will automatically reconcile the existing ticket context when possible.
