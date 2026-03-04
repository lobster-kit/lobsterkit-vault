import { LobsterVault } from '@lobsterkit/vault';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TOKEN_DIR = join(homedir(), '.lobstervault');
const TOKEN_FILE = join(TOKEN_DIR, 'token');

function readPersistedToken(): string | null {
  try {
    return readFileSync(TOKEN_FILE, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

function persistToken(token: string): void {
  try {
    mkdirSync(TOKEN_DIR, { recursive: true });
    writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  } catch {
    // non-fatal — token will just need to be set via env var next time
  }
}

async function signup(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/signup`, { method: 'POST' });
  if (!res.ok) throw new Error(`Vault signup failed: ${res.status}`);
  const data = await res.json() as { token: string };
  return data.token;
}

let client: LobsterVault | null = null;

export async function getClient(): Promise<LobsterVault> {
  if (client) return client;

  const baseUrl = process.env.LOBSTERVAULT_API_URL ?? 'https://api.theclawdepot.com/vault';

  // 1. Env var takes priority
  let token = process.env.LOBSTERVAULT_API_KEY ?? null;

  // 2. Fall back to persisted token
  if (!token) {
    token = readPersistedToken();
  }

  // 3. Auto-signup if no token found
  if (!token) {
    token = await signup(baseUrl);
    persistToken(token);
  }

  client = new LobsterVault({ apiKey: token, baseUrl });
  return client;
}
