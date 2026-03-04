import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getClient } from './state.js';

const server = new McpServer(
  { name: 'lobstervault', version: '0.1.0' },
  {
    capabilities: { tools: {} },
    instructions: `LobsterVault — encrypted secret storage for agents.

## Typical workflow
1. set_secret — store an API key, connection string, or any sensitive value (encrypted server-side with AWS KMS)
2. get_secret — retrieve a secret by name when you need to use it
3. list_secrets — see all stored secret names (values are never returned in list operations)

## When to use secrets
- Store API keys, tokens, passwords, and connection strings that should persist across sessions
- Use vault.inject() to load all secrets into the environment at the start of an agent session
- Never log or expose secret values in plaintext — treat them as opaque strings

## Secret naming conventions
- Use SCREAMING_SNAKE_CASE for environment-variable-style secrets: OPENAI_API_KEY, DB_URL
- Use dot notation for namespaced secrets: myapp/api-key, prod/db-url
- Names are case-sensitive

## Tier limits
- Free: 10 secrets max
- Builder: 100 secrets, 5 versions, 30-day audit log
- Pro: Unlimited secrets, 20 versions, rotation support
- Scale: Unlimited everything, 1-year audit log`,
  },
);

// ── set_secret ────────────────────────────────────────────────────────────────

server.registerTool(
  'set_secret',
  {
    title: 'Set Secret',
    description:
      'Store or update a secret. The value is envelope-encrypted server-side using AWS KMS. Returns the new version number.',
    inputSchema: {
      name: z.string().describe('Secret name (e.g. OPENAI_API_KEY, db/connection-string)'),
      value: z.string().describe('Plaintext value to encrypt and store'),
      metadata: z
        .record(z.string())
        .optional()
        .describe('Optional key-value metadata to attach (not encrypted separately)'),
      ttlSeconds: z
        .number()
        .optional()
        .describe('Optional: auto-expire this secret after N seconds'),
    },
  },
  async ({ name, value, metadata, ttlSeconds }) => {
    const vault = await getClient();
    const result = await vault.set(name, value, { metadata, ttlSeconds });

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Secret "${name}" stored (version ${result.version}).`,
        },
      ],
    };
  },
);

// ── get_secret ────────────────────────────────────────────────────────────────

server.registerTool(
  'get_secret',
  {
    title: 'Get Secret',
    description: 'Retrieve and decrypt a secret value by name. Returns null if not found.',
    inputSchema: {
      name: z.string().describe('Secret name to retrieve'),
    },
  },
  async ({ name }) => {
    const vault = await getClient();
    const value = await vault.get(name);

    if (value === null) {
      return {
        content: [{ type: 'text' as const, text: `Secret "${name}" not found.` }],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Secret: ${name}\nValue: ${value}`,
        },
      ],
    };
  },
);

// ── delete_secret ─────────────────────────────────────────────────────────────

server.registerTool(
  'delete_secret',
  {
    title: 'Delete Secret',
    description: 'Permanently delete a secret.',
    inputSchema: {
      name: z.string().describe('Secret name to delete'),
    },
  },
  async ({ name }) => {
    const vault = await getClient();
    const deleted = await vault.delete(name);

    return {
      content: [
        {
          type: 'text' as const,
          text: deleted
            ? `✅ Secret "${name}" deleted.`
            : `Secret "${name}" not found — nothing to delete.`,
        },
      ],
    };
  },
);

// ── list_secrets ──────────────────────────────────────────────────────────────

server.registerTool(
  'list_secrets',
  {
    title: 'List Secrets',
    description: 'List all secret names on the account. Values are never returned in list operations.',
    inputSchema: {
      prefix: z.string().optional().describe('Filter secrets by name prefix (e.g. "prod/")'),
      limit: z.number().optional().describe('Max results (1–100, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor from previous response'),
    },
  },
  async ({ prefix, limit, cursor }) => {
    const vault = await getClient();
    const result = await vault.list({ prefix, limit, cursor });

    if (result.data.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No secrets found. Use set_secret to store one.',
          },
        ],
      };
    }

    const rows = result.data.map(
      (s) =>
        `- ${s.name}  (v${s.version}, updated ${s.updatedAt}${s.expiresAt ? `, expires ${s.expiresAt}` : ''})`,
    );

    const footer = result.pagination.hasMore
      ? `\n\nMore results available. Use cursor: ${result.pagination.cursor}`
      : '';

    return {
      content: [
        {
          type: 'text' as const,
          text: `${result.data.length} secret(s):\n\n${rows.join('\n')}${footer}`,
        },
      ],
    };
  },
);

// ── inject_secrets ────────────────────────────────────────────────────────────

server.registerTool(
  'inject_secrets',
  {
    title: 'Inject Secrets',
    description:
      'Load all secrets into the process environment (process.env). Returns the count of secrets injected. Use at agent startup to make all stored secrets available as env vars.',
    inputSchema: {},
  },
  async () => {
    const vault = await getClient();
    const result = await vault.inject();

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Injected ${result.injected} secret(s) into environment.`,
        },
      ],
    };
  },
);

// ── rotate_secret ─────────────────────────────────────────────────────────────

server.registerTool(
  'rotate_secret',
  {
    title: 'Rotate Secret',
    description:
      'Re-encrypt a secret with a fresh Data Encryption Key. Use after KMS key rotation or as a security best practice. Requires Pro tier.',
    inputSchema: {
      name: z.string().describe('Secret name to rotate'),
    },
  },
  async ({ name }) => {
    const vault = await getClient();
    const result = await vault.rotate(name);

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Secret "${name}" rotated (now v${result.version}, rotated at ${result.rotatedAt}).`,
        },
      ],
    };
  },
);

// ── get_account ───────────────────────────────────────────────────────────────

server.registerTool(
  'get_account',
  {
    title: 'Get Account',
    description: 'Get your account tier, secret usage, and limits.',
    inputSchema: {},
  },
  async () => {
    const vault = await getClient();
    const account = await vault.account();

    const lines = [
      `Account: ${account.id}`,
      `Tier: ${account.tier} — ${account.tierName}`,
      '',
      'Usage:',
      `  Secrets: ${account.usage.secretCount}`,
      '',
      'Limits:',
      ...Object.entries(account.limits).map(([k, v]) => `  ${k}: ${v}`),
    ];

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  },
);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
