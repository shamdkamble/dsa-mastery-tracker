/**
 * Build EngineerOS as static site for DSA Mantra (/engineer-os)
 * Usage: node scripts/build-embed.mjs [outputDir]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outTarget = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "out");

process.env.ENGINEEROS_STATIC_EXPORT = "1";
process.env.NEXT_PUBLIC_BASE_PATH = "/engineer-os";
process.env.NEXT_PUBLIC_REQUIRE_DSA_ADMIN = "true";
process.env.NEXT_PUBLIC_DSA_MANTRA_URL = "/#/admin";

console.log("Building EngineerOS static export (basePath=/engineer-os)…");
const result = spawnSync("npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const nextOut = path.join(root, "out");
if (outTarget !== nextOut) {
  fs.mkdirSync(path.dirname(outTarget), { recursive: true });
  fs.rmSync(outTarget, { recursive: true, force: true });
  fs.cpSync(nextOut, outTarget, { recursive: true });
  console.log(`Copied static build → ${outTarget}`);
}

// Ensure SW scope note
console.log("Embed build ready. Serve folder at URL path /engineer-os");
