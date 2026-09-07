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
 * The script is intentionally non-fatal: if the environment is not
 * authenticated, or wrangler is unavailable, it prints a warning and exits 0
 * so the deploy can still report its own (clearer) error.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfgPath = path.join(root, "wrangler.jsonc");
const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";

const location = process.env.CF_D1_LOCATION ?? "weur";

function wranglerBin() {
  const name = process.platform === "win32" ? "wrangler.cmd" : "wrangler";
  const local = path.join(root, "node_modules", ".bin", name);
  return local;
}

function run(args) {
  return spawnSync(wranglerBin(), args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
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
    console.warn(`[ensure-d1] Could not list D1 databases: ${errText}`);
    console.warn(
      "[ensure-d1] Continuing without provisioning. Make sure you are authenticated " +
        "(wrangler login / CLOUDFLARE_API_TOKEN) or create the D1 database manually."
    );
    process.exit(0);
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
      console.warn(`[ensure-d1] Failed to create D1 database "${name}":`);
      console.warn(String(createResult.stderr || createResult.stdout));
      process.exit(0);
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
    console.warn("[ensure-d1] Could not determine the database id after provisioning.");
    process.exit(0);
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