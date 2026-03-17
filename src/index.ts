/**
 * @lobsterkit/vault — Secret storage for AI agents.
 *
 * @example
 * ```ts
 * import { LobsterVault } from '@lobsterkit/vault';
 *
 * const vault = new LobsterVault({ apiKey: process.env.LOBSTERVAULT_API_KEY! });
 *
 * // Store a secret
 * await vault.set('OPENAI_KEY', 'sk-...');
 *
 * // Retrieve a secret
 * const apiKey = await vault.get('OPENAI_KEY');
 *
 * // Inject all secrets into process.env
 * await vault.inject(process.env);
 *
 * // List all secret names
 * const names = await vault.list();
 * ```
 */

export interface VaultOptions {
  /** Your LobsterVault API key (lv_sk_...) */
  apiKey: string;
  /** API base URL. Defaults to https://api.theclawdepot.com/vault */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number;
}

export interface SetOptions {
  /** Key-value metadata attached to the secret (not encrypted separately, stored alongside) */
  metadata?: Record<string, string>;
  /** Auto-expire this secret after N seconds */
  ttlSeconds?: number;
  /** Absolute expiry time as an ISO 8601 date string. Mutually exclusive with ttlSeconds. */
  expiresAt?: string;
}

export interface SecretSummary {
  name: string;
  version: number;
  updatedAt: string;
  hasMetadata: boolean;
  expiresAt: string | null;
}

export interface GetResponse {
  name: string;
  value: string;
  version: number;
  metadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface ListOptions {
  /** Filter secrets by name prefix */
  prefix?: string;
  /** Max results per page (1–100, default 50) */
  limit?: number;
  /** Pagination cursor from previous response */
  cursor?: string;
}

export interface ListResponse {
  data: SecretSummary[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface InjectResponse {
  /** Number of secrets injected */
  injected: number;
}

export class VaultError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

export class LobsterVault {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: VaultOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.theclawdepot.com/vault').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  // ─── Core secret operations ─────────────────────────────────────────────────

  /**
   * Store or update a secret.
   * The value is envelope-encrypted server-side using AWS KMS.
   *
   * @param name   Secret name (alphanumeric, -, _, ., / for namespacing)
   * @param value  Plaintext value to encrypt and store
   * @param opts   Optional metadata and TTL
   */
  async set(name: string, value: string, opts?: SetOptions): Promise<{ version: number }> {
    const res = await this.fetch(`/v1/secrets/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: { value, ...opts },
    });
    return { version: res.version };
  }

  /**
   * Retrieve and decrypt a secret value.
   *
   * @param name     Secret name
   * @param options  Optional. Pass `{ version }` to retrieve a specific historical version (Builder+ tier).
   * @returns        Decrypted value string, or null if not found
   */
  async get(name: string, options?: { version?: number }): Promise<string | null> {
    try {
      const params = options?.version ? `?version=${options.version}` : '';
      const res: GetResponse = await this.fetch(`/v1/secrets/${encodeURIComponent(name)}${params}`, {
        method: 'GET',
      });
      return res.value;
    } catch (err) {
      if (err instanceof VaultError && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Retrieve a secret with full metadata.
   *
   * @param name     Secret name
   * @param options  Optional. Pass `{ version }` to retrieve a specific historical version (Builder+ tier).
   */
  async getWithMeta(name: string, options?: { version?: number }): Promise<GetResponse | null> {
    try {
      const params = options?.version ? `?version=${options.version}` : '';
      return await this.fetch(`/v1/secrets/${encodeURIComponent(name)}${params}`, { method: 'GET' });
    } catch (err) {
      if (err instanceof VaultError && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Delete a secret permanently.
   *
   * @returns true if deleted, false if it didn't exist
   */
  async delete(name: string): Promise<boolean> {
    try {
      await this.fetch(`/v1/secrets/${encodeURIComponent(name)}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      if (err instanceof VaultError && err.status === 404) return false;
      throw err;
    }
  }

  /**
   * List all secret names (values are never returned in list operations).
   * Supports cursor-based pagination.
   */
  async list(opts?: ListOptions): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (opts?.prefix) params.set('prefix', opts.prefix);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.cursor) params.set('cursor', opts.cursor);

    return this.fetch(`/v1/secrets?${params}`, { method: 'GET' });
  }

  /**
   * Inject all secrets as environment variables.
   *
   * @example
   * ```ts
   * await vault.inject(process.env);
   * // Now process.env.OPENAI_KEY, process.env.MY_DB_URL, etc. are available
   * ```
   *
   * @param target  Object to inject into (defaults to process.env)
   * @returns       Number of secrets injected
   */
  async inject(target: Record<string, string | undefined> = process.env): Promise<InjectResponse> {
    const res: { injected: number; secrets: Record<string, string> } = await this.fetch(
      '/v1/inject',
      { method: 'POST', body: {} },
    );

    for (const [key, value] of Object.entries(res.secrets)) {
      target[key] = value;
    }

    return { injected: res.injected };
  }

  /**
   * Re-encrypt a secret with a fresh Data Encryption Key.
   * Useful after KMS key rotation. Requires Pro tier.
   */
  async rotate(name: string): Promise<{ version: number; rotatedAt: string }> {
    return this.fetch(`/v1/secrets/${encodeURIComponent(name)}/rotate`, { method: 'POST' });
  }

  /**
   * List version history for a secret. Requires Builder tier.
   */
  async versions(name: string): Promise<Array<{ version: number; createdAt: string }>> {
    const res = await this.fetch(`/v1/secrets/${encodeURIComponent(name)}/versions`, {
      method: 'GET',
    });
    return res.versions;
  }

  // ─── Sharing ─────────────────────────────────────────────────────────────────

  /**
   * Create a time-limited share link for a secret. Builder+ tier required.
   *
   * @param name     Secret name to share
   * @param options  Share options (expiry, scope, read limits)
   * @returns        Share token and metadata
   */
  async share(
    name: string,
    options?: { scope?: string; expiresInSeconds?: number; expiresAt?: string; maxReads?: number },
  ): Promise<{ shareId: string; shareToken: string; expiresAt: string }> {
    return this.fetch(`/v1/secrets/${encodeURIComponent(name)}/share`, {
      method: 'POST',
      body: options ?? {},
    });
  }

  /**
   * List all active (non-revoked, non-expired) shares on the account. Builder+ tier required.
   *
   * @param secretName  Optional filter by secret name
   */
  async listShares(secretName?: string): Promise<{
    shares: Array<{
      shareId: string;
      secretName: string;
      scope: string | null;
      createdAt: string;
      expiresAt: string;
      maxReads: number | null;
      readCount: number;
    }>;
  }> {
    const params = secretName ? `?secretName=${encodeURIComponent(secretName)}` : '';
    return this.fetch(`/v1/shares${params}`, { method: 'GET' });
  }

  /**
   * Revoke a share link. Builder+ tier required.
   *
   * @returns true if revoked, false if not found
   */
  async revokeShare(shareId: string): Promise<boolean> {
    try {
      await this.fetch(`/v1/shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      if (err instanceof VaultError && err.status === 404) return false;
      throw err;
    }
  }

  /**
   * Retrieve a shared secret using a share token. No authentication required.
   * The share must be non-expired, non-revoked, and within its read limit.
   *
   * @param shareToken  The share token from a share link
   */
  async getShared(shareToken: string): Promise<{
    name: string;
    value: string;
    scope: string | null;
    expiresAt: string;
  } | null> {
    try {
      return await this.fetch(`/v1/shared/${encodeURIComponent(shareToken)}`, { method: 'GET' });
    } catch (err) {
      if (err instanceof VaultError && (err.status === 404 || err.status === 403)) return null;
      throw err;
    }
  }

  // ─── Account operations ──────────────────────────────────────────────────────

  /**
   * Get current account info and tier limits.
   */
  async account(): Promise<{
    id: string;
    tier: number;
    tierName: string;
    limits: Record<string, unknown>;
    usage: { secretCount: number };
  }> {
    return this.fetch('/v1/account', { method: 'GET' });
  }

  // ─── HTTP helper ─────────────────────────────────────────────────────────────

  private async fetch(path: string, options: { method: string; body?: unknown }): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await globalThis.fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': '@lobsterkit/vault/0.1.0',
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new VaultError(
          data.error ?? 'unknown_error',
          response.status,
          data.error ?? 'unknown_error',
        );
      }

      return data;
    } catch (err) {
      if (err instanceof VaultError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new VaultError(`Request timed out after ${this.timeoutMs}ms`, 408, 'timeout');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Named exports for convenience
export { LobsterVault as Vault };
export default LobsterVault;
