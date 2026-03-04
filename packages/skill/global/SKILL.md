---
name: lobstervault
version: 0.1.0
homepage: https://theclawdepot.com/vault
description: Encrypted secret storage for agents. Store API keys, tokens, and connection strings with KMS envelope encryption.
---

# LobsterVault

Encrypted secret storage for AI agents. Store API keys, tokens, and connection strings — KMS-encrypted server-side, no human signup required.

## Installation

### MCP Server (Claude Desktop / Cursor / OpenClaw)

Add to your MCP config:

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

On first use, an account is created automatically and your token is saved to `~/.lobstervault/token`.

### Node.js SDK

```bash
npm install @lobsterkit/vault
```

```typescript
import { LobsterVault } from '@lobsterkit/vault';

const vault = new LobsterVault({ apiKey: process.env.LOBSTERVAULT_API_KEY! });

await vault.set('OPENAI_API_KEY', 'sk-...');
const key = await vault.get('OPENAI_API_KEY');
await vault.inject(process.env); // load all secrets into env
```

### REST API

```bash
# Signup (once)
TOKEN=$(curl -s -X POST https://api.theclawdepot.com/vault/v1/signup | jq -r .token)

# Store a secret
curl -X PUT https://api.theclawdepot.com/vault/v1/secrets/MY_KEY \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "my-secret-value"}'

# Retrieve
curl https://api.theclawdepot.com/vault/v1/secrets/MY_KEY \
  -H "Authorization: Bearer $TOKEN"
```

---

## Prompt Suggestions

> Store my OpenAI API key in the vault.

> What secrets do I have stored?

> Inject all my vault secrets into the environment.

> Delete the secret named OLD_API_KEY.

---

## Heartbeat (run daily)

Check for MCP server updates and secret health:

1. `npm outdated lobstervault-mcp` — notify user if update available
2. `list_secrets` → log count, check for expiring secrets
3. `get_account` → log tier and usage vs. limits

---

## Encryption Model

LobsterVault uses **envelope encryption**:
- Each secret has its own Data Encryption Key (DEK) generated on write
- The DEK is wrapped by a KMS Key Encryption Key (KEK) — the plaintext DEK is never stored
- `rotate_secret` re-encrypts with a fresh DEK without exposing any plaintext

---

## Tier & Pricing

| Tier | Name | Price | Secrets | Versions | Rotation | Audit |
|------|------|-------|---------|----------|----------|-------|
| 0 | Free | $0 | 10 | 1 | No | None |
| 1 | Builder | $9/mo | 100 | 5 | No | 30 days |
| 2 | Pro | $29/mo | Unlimited | 20 | Yes | 90 days |
| 3 | Scale | $79/mo | Unlimited | Unlimited | Automated | 1 year |

---

## MCP Tools Reference

| Tool | Description |
|------|-------------|
| `set_secret` | Store or update a secret (KMS-encrypted). Returns version number. |
| `get_secret` | Retrieve a decrypted secret value. Returns null if not found. |
| `delete_secret` | Permanently delete a secret. |
| `list_secrets` | List all secret names, versions, timestamps. Values never returned. |
| `inject_secrets` | Load all secrets into process.env. Returns count injected. |
| `rotate_secret` | Re-encrypt with fresh DEK (Pro+ tier). |
| `get_account` | View tier, limits, and current usage. |

---

## SDK Reference

```typescript
const vault = new LobsterVault({ apiKey: 'lv_sk_...' });

// Store / update
await vault.set('MY_KEY', 'value');
await vault.set('MY_KEY', 'value', { ttlSeconds: 3600 });

// Retrieve
const value = await vault.get('MY_KEY');          // string | null
const full  = await vault.getWithMeta('MY_KEY');  // full metadata

// List
const { data, pagination } = await vault.list({ prefix: 'prod/' });

// Delete
await vault.delete('MY_KEY');

// Inject all secrets into process.env
await vault.inject(process.env);

// Rotate encryption key (Pro+)
await vault.rotate('MY_KEY');

// Account info
const account = await vault.account();
```

---

## Links

- **Website**: [theclawdepot.com/vault](https://theclawdepot.com/vault)
- **API docs**: [api.theclawdepot.com/vault/docs](https://api.theclawdepot.com/vault/docs)
- **MCP server**: [npmjs.com/package/lobstervault-mcp](https://www.npmjs.com/package/lobstervault-mcp)
- **Node.js SDK**: [npmjs.com/package/@lobsterkit/vault](https://www.npmjs.com/package/@lobsterkit/vault)
