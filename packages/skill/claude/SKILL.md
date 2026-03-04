# LobsterVault

LobsterVault is an encrypted secret storage service for AI agents. Use it to store API keys, database connection strings, tokens, and any sensitive values that need to persist across sessions.

## MCP Tools

| Tool | When to use |
|------|-------------|
| `set_secret` | Store a new secret or update an existing one |
| `get_secret` | Retrieve a secret value by name |
| `delete_secret` | Permanently delete a secret |
| `list_secrets` | See all stored secret names (values never returned) |
| `inject_secrets` | Load all secrets into process.env at session start |
| `rotate_secret` | Re-encrypt a secret with a fresh key (Pro+) |
| `get_account` | View tier, usage, and limits |

## When to use LobsterVault

- User needs to persist credentials between sessions (API keys, tokens, passwords)
- A LobsterDB database was just created — store its connection string here
- User asks you to "remember" an API key or "save" credentials
- Agent-to-agent credential sharing within the same account

## Core workflow

```
set_secret → get_secret (when needed)
inject_secrets (at the start of each session)
```

## Naming conventions

- Use SCREAMING_SNAKE_CASE for env-style secrets: `OPENAI_API_KEY`, `STRIPE_SECRET`
- Use slash notation for namespaced secrets: `prod/db-url`, `myapp/webhook-secret`
- Names are case-sensitive

## Important

- **Never log secret values** — treat them as opaque strings
- **Additive operations** (set, inject): apply without asking the user
- **Destructive operations** (delete): confirm with the user first
- `list_secrets` never returns values — only names, versions, and timestamps

## Tier limits

| Tier | Price | Secrets | Notes |
|------|-------|---------|-------|
| Free | $0 | 10 | 1 version per secret |
| Builder | $9/mo | 100 | 5 versions, 30-day audit log |
| Pro | $29/mo | Unlimited | 20 versions, rotation support |
| Scale | $79/mo | Unlimited | Unlimited versions, 1-year log |
