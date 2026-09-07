#!/usr/bin/env node
/**
 * ensure-d1.mjs
 *
 * Best-effort, one-time D1 database provisioning so the project can be
 * deployed from the Cloudflare dashboard (Git integration) or any CI
 * without manually creating the database first.
 *
 *  1. Reads `wrangler.jsonc` and looks for the D1 binding named `DB`.
 *  2. If the configured `database_id` is still the placeholder, it lists the
 *     account's D1 databases and creates `bbs-db` if it does not exist.
 *  3. Patches `wrangler.jsonc` with the real `database_id` so the subsequent
 *     `vinext-cloudflare deploy` step succeeds.
 *
 * Exit behaviour:
 *  - Local interactive shells (no CLOUDFLARE_API_TOKEN): warnings + exit 0,
 *    so a human can finish setup themselves.
 *  - Automated deploy environments (CLOUDFLARE_API_TOKEN or CI set):
 *    provisioning failures exit non-zero so the broken deploy stops loudly
 *    instead of failing later with an opaque placeholder-id error.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfgPath = path.join(root, "wrangler.jsonc");
const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";

const location = process.env.CF_D1_LOCATION ?? "weur";
/** True when running inside an automated deploy pipeline. */
const automated = Boolean(process.env.CI || process.env.CLOUDFLARE_API_TOKEN);

function fail(message) {
  if (automated) {
    console.error(`[ensure-d1] ${message}`);
    process.exit(1);
  }
  console.warn(`[ensure-d1] ${message}`);
  process.exit(0);
}

function wranglerBin() {
  const name = process.platform === "win32" ? "wrangler.cmd" : "wrangler";
  return path.join(root, "node_modules", ".bin", name);
}

function run(args) {
  // `shell` is required to spawn .cmd shims on Windows (Node >= 18.20).
  return spawnSync(wranglerBin(), args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    shell: process.platform === "win32",
  });
}

function readConfig() {
  return readFileSync(cfgPath, "utf8");
}

function findD1Entry(configText) {
  // Extract the D1 binding entry for `DB` (name + database_id).
  const bindingIdx = configText.indexOf('"binding": "DB"');
  if (bindingIdx === -1) return null;
  const tail = configText.slice(bindingIdx);
  const nameMatch = tail.match(/"database_name"\s*:\s*"([^"]+)"/);
  const idMatch = tail.match(/"database_id"\s*:\s*"([^"]+)"/);
  if (!nameMatch) return null;
  return {
    name: nameMatch[1],
    id: idMatch ? idMatch[1] : "",
  };
}

function patchDatabaseId(configText, newId) {
  const bindingIdx = configText.indexOf('"binding": "DB"');
  const head = configText.slice(0, bindingIdx);
  const tail = configText.slice(bindingIdx);
  const replaced = tail.replace(/"database_id"\s*:\s*"[^"]*"/, `"database_id": "${newId}"`);
  return head + replaced;
}

async function main() {
  const dbName = process.env.CF_D1_NAME;

  let configText;
  try {
    configText = readConfig();
  } catch (err) {
    console.warn("[ensure-d1] Could not read wrangler.jsonc:", err.message);
    process.exit(0);
  }

  const entry = findD1Entry(configText);
  if (!entry) {
    console.warn("[ensure-d1] No D1 binding named `DB` found in wrangler.jsonc; skipping.");
    process.exit(0);
  }

  const name = dbName || entry.name;
  const currentId = entry.id;
  console.log(`[ensure-d1] D1 database: "${name}" (configured id: ${currentId || "none"})`);

  if (currentId && currentId !== PLACEHOLDER_ID && !/^0+$/.test(currentId)) {
    console.log("[ensure-d1] database_id is already set; nothing to do.");
    process.exit(0);
  }

  // Listing the account's databases requires authentication.
  const listResult = run(["d1", "list", "--json"]);
  if (listResult.status !== 0) {
    const errText = (listResult.stderr || listResult.stdout || "").trim();
    fail(
      `Could not list D1 databases (${errText}). Make sure the environment is ` +
        "authenticated (CLOUDFLARE_API_TOKEN) and the token has D1 edit permission, " +
        "or create the database manually and set database_id in wrangler.jsonc."
    );
  }

  let databases = [];
  try {
    databases = JSON.parse(listResult.stdout || "[]");
  } catch {
    databases = [];
  }

  let found = databases.find((d) => d && d.name === name);
  if (!found) {
    console.log(`[ensure-d1] Database "${name}" does not exist; creating it...`);
    const createResult = run(["d1", "create", name, "--location", location]);
    if (createResult.status !== 0) {
      fail(
        `Failed to create D1 database "${name}":\n${String(createResult.stderr || createResult.stdout)}`
      );
    }
    // Re-list to fetch the new id.
    const relist = run(["d1", "list", "--json"]);
    try {
      databases = JSON.parse(relist.stdout || "[]");
    } catch {
      databases = [];
    }
    found = databases.find((d) => d && d.name === name);
  }

  if (!found || !found.uuid) {
    fail("Could not determine the database id after provisioning.");
  }

  if (currentId !== found.uuid) {
    const patched = patchDatabaseId(readConfig(), found.uuid);
    writeFileSync(cfgPath, patched, "utf8");
    console.log(`[ensure-d1] Updated wrangler.jsonc with real database_id: ${found.uuid}`);
  } else {
    console.log("[ensure-d1] database_id is already correct.");
  }
}

main().catch((err) => {
  console.warn("[ensure-d1] Unexpected error:", err);
  process.exit(0);
});