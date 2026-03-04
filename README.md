# LobsterKit Vault

Open-source SDK, MCP server, and skills for [LobsterVault](https://theclawdepot.com/vault) — encrypted secrets management for AI agents.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [@lobsterkit/vault](./packages/sdk) | [![npm](https://img.shields.io/npm/v/@lobsterkit/vault)](https://www.npmjs.com/package/@lobsterkit/vault) | TypeScript SDK |
| [@lobsterkit/vault-mcp](./packages/mcp) | [![npm](https://img.shields.io/npm/v/@lobsterkit/vault-mcp)](https://www.npmjs.com/package/@lobsterkit/vault-mcp) | MCP Server |

## Quick Start

### SDK
```bash
npm install @lobsterkit/vault
```

```typescript
import { LobsterVault } from '@lobsterkit/vault';

const vault = new LobsterVault({ apiKey: 'lv_sk_live_...' });
await vault.set('DATABASE_URL', 'postgres://...');
const secret = await vault.get('DATABASE_URL');
```

### MCP Server
```bash
npx @lobsterkit/vault-mcp@latest
```

## License

MIT
