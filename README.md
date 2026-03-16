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

### `vault.get(name)`
Decrypt and return a secret value. Returns `null` if not found.

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
