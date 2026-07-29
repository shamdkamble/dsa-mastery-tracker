/**
 * Build EngineerOS static site for live DSA Mantra (same domain /engineer-os).
 * Output is published to repo-root engineer-os/ so Vercel serves it worldwide.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const APP = path.join(ROOT, "apps", "engineer-os");
const OUT = path.join(APP, "out");
const PUBLISH = path.join(ROOT, "engineer-os");

if (!fs.existsSync(path.join(APP, "package.json"))) {
  console.error("Missing apps/engineer-os");
  process.exit(1);
}

function run(cmd, args, cwd, env = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!fs.existsSync(path.join(APP, "node_modules", "next"))) {
  run("npm", ["install"], APP);
}

// Live embed: same path + force admin check against DSA Mantra MongoDB API
run("npx", ["next", "build"], APP, {
  ENGINEEROS_STATIC_EXPORT: "1",
  NEXT_PUBLIC_BASE_PATH: "/engineer-os",
  NEXT_PUBLIC_REQUIRE_DSA_ADMIN: "true",
  NEXT_PUBLIC_DSA_MANTRA_URL: "/#/admin",
  // Empty API base → browser uses window.location.origin (live DSA Mantra host)
  NEXT_PUBLIC_DSA_API_BASE: "",
});

if (!fs.existsSync(OUT)) {
  console.error("Build finished but apps/engineer-os/out is missing.");
  process.exit(1);
}

// Patch service worker scope for /engineer-os base path
const swPath = path.join(OUT, "sw.js");
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, "utf8");
  // Ensure relative precache works under /engineer-os/
  if (!sw.includes("engineer-os")) {
    sw = sw.replace(
      'const PRECACHE = ["./", "./manifest.webmanifest"];',
      'const PRECACHE = ["./", "./manifest.webmanifest", "./index.html"];',
    );
    fs.writeFileSync(swPath, sw);
  }
}

fs.rmSync(PUBLISH, { recursive: true, force: true });
fs.cpSync(OUT, PUBLISH, { recursive: true });

// Marker for deploy verification
fs.writeFileSync(
  path.join(PUBLISH, "VERSION.txt"),
  `EngineerOS embed\nbuilt=${new Date().toISOString()}\nbasePath=/engineer-os\nadmin=live-dsa-mantra-api\n`,
);

console.log(`\n✅ Published live EngineerOS → ${PUBLISH}`);
console.log("   URL path: https://<your-dsa-mantra-domain>/engineer-os/");
console.log("   Auth: same dsa-auth-token + GET /api/auth/me (MongoDB admins only)\n");
