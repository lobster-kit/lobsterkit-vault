# LobsterVault

Encrypted secret storage for AI agents — store API keys, tokens, and connection strings with KMS envelope encryption. No API keys, no human signup, no configuration.

## What Claude can do with this skill

- **Store secrets instantly** — `set_secret("OPENAI_API_KEY", "sk-...")` encrypts and stores with AWS KMS
- **Retrieve secrets** — `get_secret("OPENAI_API_KEY")` decrypts and returns the value
- **Inject into env** — `inject_secrets()` loads all secrets into process.env at session start
- **Manage lifecycle** — list, delete, and rotate secrets; version history on Builder+
- **Works with LobsterDB** — connection strings are auto-stored in Vault when a database is created

## Quick test

After installing the skill, try asking Claude:

> Store my OpenAI API key in the vault.

or

> Show me all my stored secrets.

Claude will auto-provision a vault account, store the secret with KMS encryption, and confirm — all without any API keys or manual setup.

## How it works

The skill uses the `@lobsterkit/vault-mcp` MCP server, which runs as a local process and exposes secret management tools directly to Claude.

| Step | What happens |
|------|-------------|
| **1. Account** | Auto-signup on first use — no API key or human action required. Token saved to `~/.lobstervault/token`. |
| **2. Store** | `set_secret` encrypts value with a DEK, wraps the DEK with KMS KEK — envelope encryption |
| **3. Retrieve** | `get_secret` decrypts DEK via KMS, then decrypts the value |
| **4. Inject** | `inject_secrets` loads all secrets into the running process environment |

## Encryption model

LobsterVault uses **envelope encryption**:
- Each secret has its own Data Encryption Key (DEK), encrypted by a KMS Key Encryption Key (KEK)
- The plaintext DEK is never stored — only the encrypted form
- Key rotation (`rotate_secret`) re-encrypts with a fresh DEK without exposing the plaintext

## Links

- **MCP server on npm**: [`@lobsterkit/vault-mcp`](https://www.npmjs.com/package/lobstervault-mcp)
- **SDK on npm**: [`@lobsterkit/vault`](https://www.npmjs.com/package/@lobsterkit/vault)
- **Website**: [theclawdepot.com/vault](https://theclawdepot.com/vault)
- **API docs**: [api.theclawdepot.com/vault/docs](https://api.theclawdepot.com/vault/docs)
