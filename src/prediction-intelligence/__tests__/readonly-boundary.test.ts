import { describe, expect, it } from "vitest";

/**
 * Read-only boundary guard.
 *
 * `import.meta.glob` is provided by Vite/Vitest; the repository does not load
 * `vite/client` types into `tsc`, so the directive below keeps typecheck green
 * while the runtime transform still supplies the raw modules.
 */
// @ts-expect-error Vite provides import.meta.glob at runtime.
const rawModules = import.meta.glob("../**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FORBIDDEN_IMPORT = /^(node:)?(fs|fs\/promises|path|http|https|net|tls|pg|pg-promise|postgres|prisma|@prisma\/client|knex|typeorm|mongoose|mongodb|neo4j-driver|kafkajs|ioredis|redis|better-sqlite3|sqlite3|drizzle-orm|@aws-sdk\/.+|axios)$/;
const FORBIDDEN_SOURCE = [
  /\bwriteFile(Sync)?\s*\(/,
  /\bappendFile(Sync)?\s*\(/,
  /\bcreateWriteStream\s*\(/,
  /\bINSERT\s+INTO\b/i,
  /\bUPSERT\b/i,
  /\.insert\s*\(/,
  /\.upsert\s*\(/,
  /\bpool\.query\s*\(/,
  /\bclient\.query\s*\(/,
  /\bnew\s+Pool\s*\(/,
  /\bfetch\s*\(/,
  /\baxios\b/,
];

function sourceModules(): Array<[string, string]> {
  return Object.entries(rawModules).filter(
    ([path]) => !path.includes("/__tests__/") && !path.endsWith(".test.ts"),
  );
}

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const fromPattern = /\bfrom\s+["']([^"']+)["']/g;
  const barePattern = /\bimport\s+["']([^"']+)["']/g;
  for (const pattern of [fromPattern, barePattern]) {
    let match = pattern.exec(source);
    while (match) {
      specifiers.push(match[1]);
      match = pattern.exec(source);
    }
  }
  return specifiers;
}

describe("prediction-intelligence read-only boundary", () => {
  it("imports only local read-model modules", () => {
    const modules = sourceModules();
    expect(modules.length).toBeGreaterThanOrEqual(3);

    for (const [path, source] of modules) {
      for (const specifier of importSpecifiers(source)) {
        expect(
          specifier.startsWith("./") || specifier.startsWith("../"),
          `${path} imports non-local module ${specifier}`,
        ).toBe(true);
        expect(FORBIDDEN_IMPORT.test(specifier), `${path} imports ${specifier}`).toBe(false);
      }
    }
  });

  it("contains no writer, DB, network or persistence call", () => {
    for (const [path, source] of sourceModules()) {
      for (const pattern of FORBIDDEN_SOURCE) {
        expect(pattern.test(source), `${path} matches ${pattern}`).toBe(false);
      }
    }
  });
});
