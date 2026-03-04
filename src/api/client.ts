/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — API Client
   Backend endpoints + typed fetch wrappers with caching & retry
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventNode, KolNode, NarrativeNode,
  KolAggregateStats, NarrativeAggregateStats, ProjectInfo,
  EventFlowRequest, EventFlowResponse,
  KolFlowRequest, KolFlowResponse,
  NarrativeFlowRequest, NarrativeFlowResponse,
} from "../types";

// ─── Configuration ──────────────────────────────────────────────

export interface ApiConfig {
  /** Base URL (e.g., "https://api.ratexai.com/v1") */
  baseUrl: string;
  /** Bearer token */
  token?: string;
  headers?: Record<string, string>;
  /** Request timeout ms (default: 30000) */
  timeout?: number;
  /** Retry count on failure (default: 2) */
  retries?: number;
  /** Cache TTL ms (default: 60000) */
  cacheTtl?: number;
  /** Max cached entries (default: 200) */
  maxCacheSize?: number;
}

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: "/api/v1",
  timeout: 30000,
  retries: 2,
  cacheTtl: 60000,
  maxCacheSize: 200,
};

// ─── In-memory cache ────────────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number }>();

function evictStaleEntries(ttl: number, maxSize: number): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.ts >= ttl) cache.delete(key);
  }
  // If still over limit, remove oldest entries
  if (cache.size > maxSize) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    const toRemove = sorted.slice(0, cache.size - maxSize);
    for (const [key] of toRemove) cache.delete(key);
  }
}

function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.data as T;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttl: number, maxSize: number): void {
  if (cache.size >= maxSize) evictStaleEntries(ttl, maxSize);
  cache.set(key, { data, ts: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

// ─── Request deduplication ──────────────────────────────────────

const inflight = new Map<string, Promise<unknown>>();

// ─── Fetch wrapper ──────────────────────────────────────────────

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function apiFetch<T>(
  config: ApiConfig,
  path: string,
  body?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const cacheKey = `${method}:${url}:${JSON.stringify(body ?? {})}`;

  const cached = getCached<T>(cacheKey, config.cacheTtl || 60000);
  if (cached) return cached;

  // Deduplicate concurrent identical requests
  const existing = inflight.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const promise = apiFetchInner<T>(config, cacheKey, path, body, method);
  inflight.set(cacheKey, promise);
  promise.finally(() => inflight.delete(cacheKey));
  return promise;
}

async function apiFetchInner<T>(
  config: ApiConfig,
  cacheKey: string,
  path: string,
  body: unknown | undefined,
  method: "GET" | "POST",
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.headers,
  };
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`;

  let lastError: Error | null = null;
  const maxRetries = config.retries ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), config.timeout || 30000);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(tid);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new ApiError(
          errBody?.error?.message || `HTTP ${response.status}`,
          errBody?.error?.code || `HTTP_${response.status}`,
          response.status,
        );
      }

      const data = (await response.json()) as T;
      setCache(cacheKey, data, config.cacheTtl || 60000, config.maxCacheSize || 200);
      return data;
    } catch (err) {
      lastError = err as Error;
      // Only retry on server errors or network failures
      if (err instanceof ApiError && err.status < 500) break;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Unknown API error");
}

// ─── Client ─────────────────────────────────────────────────────

export class EventGraphApiClient {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(updates: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** POST /event-flow/graph — Fetch event flow graph for a project */
  async getEventFlow(request: EventFlowRequest): Promise<EventFlowResponse> {
    return apiFetch<EventFlowResponse>(this.config, "/event-flow/graph", request);
  }

  /** GET /event-flow/node/:id — Single event node detail */
  async getEventNode(nodeId: string): Promise<{ data: EventNode }> {
    return apiFetch(this.config, `/event-flow/node/${encodeURIComponent(nodeId)}`, undefined, "GET");
  }

  /** POST /kol-flow/graph — Fetch KOL influence graph */
  async getKolFlow(request: KolFlowRequest): Promise<KolFlowResponse> {
    return apiFetch<KolFlowResponse>(this.config, "/kol-flow/graph", request);
  }

  /** GET /kol-flow/kol/:id — Single KOL detail with posts */
  async getKolDetail(kolId: string): Promise<{ data: KolNode }> {
    return apiFetch(this.config, `/kol-flow/kol/${encodeURIComponent(kolId)}`, undefined, "GET");
  }

  /** GET /kol-flow/stats — Aggregate KOL stats for a project */
  async getKolStats(projectId: string): Promise<{ data: KolAggregateStats }> {
    return apiFetch(this.config, `/kol-flow/stats?projectId=${encodeURIComponent(projectId)}`, undefined, "GET");
  }

  /** POST /narrative-flow/graph — Fetch narrative flow graph */
  async getNarrativeFlow(request: NarrativeFlowRequest): Promise<NarrativeFlowResponse> {
    return apiFetch<NarrativeFlowResponse>(this.config, "/narrative-flow/graph", request);
  }

  /** GET /narrative-flow/node/:id — Single narrative node detail */
  async getNarrativeNode(nodeId: string): Promise<{ data: NarrativeNode }> {
    return apiFetch(this.config, `/narrative-flow/node/${encodeURIComponent(nodeId)}`, undefined, "GET");
  }

  /** GET /narrative-flow/stats — Aggregate narrative stats */
  async getNarrativeStats(narrativeId: string): Promise<{ data: NarrativeAggregateStats }> {
    return apiFetch(this.config, `/narrative-flow/stats?narrativeId=${encodeURIComponent(narrativeId)}`, undefined, "GET");
  }

  /** GET /projects/:id */
  async getProject(projectId: string): Promise<{ data: ProjectInfo }> {
    return apiFetch(this.config, `/projects/${encodeURIComponent(projectId)}`, undefined, "GET");
  }
}

// ─── Singleton factory ──────────────────────────────────────────

let defaultClient: EventGraphApiClient | null = null;
let defaultClientConfigKey: string | null = null;

export function getApiClient(config?: Partial<ApiConfig>): EventGraphApiClient {
  const configKey = config ? JSON.stringify(config) : "__default__";
  if (!defaultClient || configKey !== defaultClientConfigKey) {
    defaultClient = new EventGraphApiClient(config);
    defaultClientConfigKey = configKey;
  }
  return defaultClient;
}
