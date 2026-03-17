# @lobsterkit/vault

Secret storage for AI agents. Store API keys, connection strings, and env vars — encrypted at rest with AWS KMS. Zero human touch required.

## Install

```bash
npm install @lobsterkit/vault
```

## Quick Start

```ts
import { LobsterVault } from '@lobsterkit/vault';

const vault = new LobsterVault({ apiKey: process.env.LOBSTERVAULT_API_KEY! });

// Store a secret
await vault.set('OPENAI_KEY', 'sk-proj-...');

// Retrieve it later
const key = await vault.get('OPENAI_KEY');

// Inject all secrets into process.env at agent startup
await vault.inject(process.env);
```

## API

### `vault.set(name, value, opts?)`
Store or update a secret. Value is envelope-encrypted via AWS KMS.

Options:
- `metadata` — key-value metadata attached to the secret
- `ttlSeconds` — auto-expire after N seconds
- `expiresAt` — absolute expiry as an ISO 8601 date string (mutually exclusive with `ttlSeconds`)

### `vault.get(name, opts?)`
Decrypt and return a secret value. Returns `null` if not found.

Pass `{ version: N }` to retrieve a specific historical version (Builder+ tier).

```ts
const v2 = await vault.get('MY_KEY', { version: 2 });
```

### `vault.getWithMeta(name, opts?)`
Like `get()`, but returns the full secret object including metadata, timestamps, and version info. Also supports `{ version: N }`.

### `vault.delete(name)`
Delete a secret. Returns `true` if deleted, `false` if not found.

### `vault.list(opts?)`
List secret names (never values). Supports prefix filtering and pagination.

### `vault.inject(target?)`
Inject all secrets into `target` object (defaults to `process.env`). Pro tier required.

### `vault.rotate(name)`
Re-encrypt with a fresh DEK. Pro tier required.

### `vault.versions(name)`
List version history. Builder tier required.

### Sharing (Builder+ tier)

Create time-limited, read-only share links for secrets. Useful for sharing credentials with external services or teammates without exposing your API key.

#### `vault.share(name, opts?)`
Create a share link. Returns a `shareToken` that can be used to retrieve the secret without authentication.

Options: `scope`, `expiresInSeconds` (default 3600), `expiresAt`, `maxReads`.

```ts
const { shareToken, expiresAt } = await vault.share('OPENAI_KEY', {
  expiresInSeconds: 3600,
  maxReads: 5,
});
```

#### `vault.listShares(secretName?)`
List all active shares. Optionally filter by secret name.

#### `vault.revokeShare(shareId)`
Revoke a share link immediately.

#### `vault.getShared(shareToken)`
Retrieve a shared secret using a share token. No authentication required. Returns `null` if the share is expired, revoked, or has exceeded its read limit.

## Error Reference

All API errors throw a `VaultError` with `status`, `code`, and `message` properties.

| Code | Status | Description |
|------|--------|-------------|
| `secret_limit_exceeded` | 403 | Account has reached the secret limit for its tier |
| `version_limit_exceeded` | 403 | Secret has reached the version limit for the tier. Delete and recreate, or upgrade. |
| `insufficient_tier` | 403 | Operation requires a higher tier (e.g. version retrieval requires Builder+) |
| `share_limit_exceeded` | 403 | Active share limit reached for this tier |
| `share_not_found` | 404 | Share ID or token not found |
| `share_expired` | 403 | Share link has expired |
| `share_revoked` | 403 | Share link was revoked |
| `share_read_limit` | 403 | Share has exceeded its maximum read count |
| `not_found` | 404 | Secret not found |

## Pricing

| Tier | Price | Secrets | Versions | Audit |
|------|-------|---------|----------|-------|
| Free | $0 | 10 | 1 | — |
| Builder | $9/mo | 100 | 5 | 30d |
| Pro | $29/mo | Unlimited | 20 | 90d |
| Scale | $79/mo | Unlimited | Unlimited | 1yr |

## LobsterKit Ecosystem

`@lobsterkit/vault` is part of the LobsterKit ecosystem alongside [@lobsterkit/db](https://www.npmjs.com/package/@lobsterkit/db) and [@lobsterkit/lobstermail](https://www.npmjs.com/package/@lobsterkit/lobstermail). Link accounts across products at signup with a `linkToken` to get a single Stripe customer and an automatic 15% multi-product discount.

## License

MIT
