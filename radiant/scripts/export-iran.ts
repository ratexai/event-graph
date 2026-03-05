/**
 * Export Iran conflict demo data to JSON for the radiant data pipeline.
 * Run: npx tsx radiant/scripts/export-iran.ts
 */
import { iranConflictData } from "../../demo/data/iran-conflict";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../data/maps/iran-war-2026.json");

writeFileSync(outPath, JSON.stringify(iranConflictData, null, 2), "utf-8");
console.log(`Exported to ${outPath} (${JSON.stringify(iranConflictData).length} bytes)`);
