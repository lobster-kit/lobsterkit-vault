---
name: lobstervault
version: 0.1.0
description: Encrypted secret storage for AI agents. Store API keys, tokens, and connection strings — KMS-encrypted, no human signup required.
homepage: https://theclawdepot.com/vault
metadata: {"openclaw": {"emoji": "🔐", "requires": {"anyBins": ["npx"]}, "install": [{"id": "mcp", "kind": "mcp", "command": "npx @lobsterkit/vault-mcp@0.1.0", "label": "Add LobsterVault MCP Server"}]}}
---

# LobsterVault

Encrypted secret storage for agents. Store API keys, tokens, and connection strings with KMS envelope encryption. No API keys, no human signup, no configuration.

**Full docs:** `https://api.theclawdepot.com/vault/docs`

---

## Setup

Add to your MCP config (`.mcp.json`, `claude_desktop_config.json`, `.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "lobstervault": {
      "command": "npx",
      "args": ["@lobsterkit/vault-mcp@0.1.0"]
    }
  }
}
```

You now have these tools: `set_secret`, `get_secret`, `delete_secret`, `list_secrets`, `inject_secrets`, `rotate_secret`, `get_account`. No code to write.

Also available as a [Node.js SDK](https://www.npmjs.com/package/@lobsterkit/vault) and [REST API](https://api.theclawdepot.com/vault/docs) — see [theclawdepot.com/vault](https://theclawdepot.com/vault).

---

## Heartbeat (run daily)

On startup and once per day, run a maintenance heartbeat:

1. **Check for MCP server updates:**
   ```bash
   npm outdated lobstervault-mcp
   ```
   If a new version is available, **notify the user** — do not auto-install.

2. **Check secret health:**
   ```
   // Using MCP tools:
   // call list_secrets → log count and any expiring secrets
   // call get_account → log tier and secret count vs. limit
   ```

---

## When to Use This

- Storing API keys, tokens, or passwords that need to persist between sessions
- Connecting to LobsterDB: connection strings are automatically stored here on `create_database`
- Any credential that should not appear in conversation history or prompts
- Agent-to-agent secret sharing (scoped by account)

---

## Core Workflow

```
set_secret → get_secret (when needed) → inject_secrets (at session start)
```

Use `inject_secrets` at the start of an agent session to load all stored credentials into the environment.

---

## Storing a Secret

```
set_secret(name: "OPENAI_API_KEY", value: "sk-...")
// => version: 1
```

---

## Retrieving a Secret

```
get_secret(name: "OPENAI_API_KEY")
// => Secret: OPENAI_API_KEY
//    Value: sk-...
```

---

## Account Tiers & Pricing

| Tier | Name | Price | Secrets | Versions | Audit Log |
|------|------|-------|---------|----------|-----------|
| 0 | Free | $0 | 10 | 1 | None |
| 1 | Builder | $9/mo | 100 | 5 | 30 days |
| 2 | Pro | $29/mo | Unlimited | 20 | 90 days |
| 3 | Scale | $79/mo | Unlimited | Unlimited | 1 year |

**Upgrade:** `POST /v1/billing/checkout` with `{"tier": N}` — returns a Stripe checkout URL.

---

## MCP Tools Reference

| Tool | Description |
|------|-------------|
| `set_secret` | Store or update a secret (KMS-encrypted) |
| `get_secret` | Retrieve a secret value by name |
| `delete_secret` | Permanently delete a secret |
| `list_secrets` | List all secret names (values never returned) |
| `inject_secrets` | Load all secrets into process.env |
| `rotate_secret` | Re-encrypt with fresh DEK (Pro+) |
| `get_account` | View tier, limits, and usage |
