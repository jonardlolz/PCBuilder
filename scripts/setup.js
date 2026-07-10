#!/usr/bin/env node
/**
 * Cross-platform setup script for pc-builder dev environment.
 * Detects OS (Windows/WSL/Linux/macOS), checks prerequisites, writes .env files.
 */

import { execSync } from "child_process";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { platform } from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isTTY = process.stdout.isTTY;

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) { console.log(`\n  ${msg}`); }
function ok(msg)  { console.log(`  ✓  ${msg}`); }
function warn(msg){ console.warn(`  ⚠  ${msg}`); }
function fail(msg){ console.error(`  ✗  ${msg}`); }

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts }).trim();
  } catch {
    return null;
  }
}

// ─── OS Detection ────────────────────────────────────────────────────────────

function detectOS() {
  const p = platform();
  if (p === "darwin") return "macOS";
  if (p === "win32") return "Windows";
  // Linux — check if running inside WSL
  try {
    const release = readFileSync("/proc/version", "utf-8").toLowerCase();
    if (release.includes("microsoft") || release.includes("wsl")) return "WSL";
  } catch {}
  return "Linux";
}

const OS = detectOS();
log(`Detected OS: ${OS}`);

// ─── Prerequisite checks ─────────────────────────────────────────────────────

const checks = [
  {
    name: "Node.js ≥ 20",
    cmd: "node --version",
    validate: (v) => {
      const major = parseInt(v?.replace("v", "").split(".")[0]);
      return major >= 20;
    },
    fix: "Install from https://nodejs.org or use nvm/fnm",
  },
  {
    name: "Docker",
    cmd: "docker --version",
    validate: (v) => !!v,
    fix:
      OS === "Windows"
        ? "Install Docker Desktop: https://docs.docker.com/desktop/windows/"
        : OS === "macOS"
        ? "Install Docker Desktop: https://docs.docker.com/desktop/mac/"
        : "Install: https://docs.docker.com/engine/install/",
  },
  {
    name: "Docker Compose",
    cmd: "docker compose version",
    validate: (v) => !!v,
    fix: "Comes bundled with Docker Desktop; on Linux: https://docs.docker.com/compose/install/",
  },
  {
    name: "Git",
    cmd: "git --version",
    validate: (v) => !!v,
    fix: "Install from https://git-scm.com",
  },
];

let allGood = true;
console.log("\n  Checking prerequisites...");
for (const check of checks) {
  const result = run(check.cmd);
  if (check.validate(result)) {
    ok(`${check.name} — ${result}`);
  } else {
    fail(`${check.name} not found`);
    warn(`Fix: ${check.fix}`);
    allGood = false;
  }
}

if (!allGood) {
  console.log("\n  ✗  Fix the above before continuing.\n");
  process.exit(1);
}

// ─── .env generation ─────────────────────────────────────────────────────────

function writeEnvIfMissing(filePath, content) {
  if (existsSync(filePath)) {
    ok(`${filePath} already exists — skipping`);
    return;
  }
  writeFileSync(filePath, content.trimStart());
  ok(`Created ${filePath}`);
}

console.log("\n  Writing .env files...");

writeEnvIfMissing(path.join(ROOT, ".env"), `
# Root env — shared values consumed by Docker Compose
POSTGRES_USER=pcbuilder
POSTGRES_PASSWORD=changeme
POSTGRES_DB=pcbuilder
POSTGRES_PORT=5432

# n8n (not initialized yet — here for when you add it)
N8N_PORT=5678
`);

writeEnvIfMissing(path.join(ROOT, "api", ".env"), `
# Express API
PORT=4000
DATABASE_URL=postgresql://pcbuilder:changeme@localhost:5432/pcbuilder

# CORS — set to your frontend dev URL
CORS_ORIGIN=http://localhost:5173
`);

writeEnvIfMissing(path.join(ROOT, "scraper", ".env"), `
# Shopee guest cookie — grab from DevTools > Network > any api/v4 request
# Refresh this whenever scraper starts returning 403 / empty results
SHOPEE_COOKIE=

# Optional: OpenClaw endpoint (add later when OpenClaw is running)
# OPENCLAW_URL=http://localhost:3001
`);

writeEnvIfMissing(path.join(ROOT, "frontend", ".env"), `
# Vite exposes vars prefixed with VITE_ to the browser bundle
VITE_API_URL=http://localhost:4000
`);

// ─── OS-specific notes ───────────────────────────────────────────────────────

console.log("\n  OS-specific notes:");
if (OS === "WSL") {
  warn("WSL detected — Docker Desktop must be running on Windows with WSL2 integration enabled.");
  warn("If 'docker' commands fail inside WSL, enable: Docker Desktop → Settings → Resources → WSL Integration.");
} else if (OS === "Windows") {
  warn("Running on native Windows — use PowerShell or Git Bash for npm/node commands.");
  warn("Line ending: make sure Git is set to 'core.autocrlf=input' to avoid CRLF issues in Docker.");
} else if (OS === "macOS") {
  warn("macOS: if you see Docker socket errors, ensure Docker Desktop is running.");
}

// ─── Next steps ──────────────────────────────────────────────────────────────

console.log(`
  ✓  Setup complete. Next steps:

     1.  npm install              — install all workspace deps
     2.  docker compose up -d     — start Postgres
     3.  npm run dev              — start Express API + React frontend
     4.  npm run scrape           — run a manual scrape (fill SHOPEE_COOKIE first)

  Edit .env files before running if you want different ports or credentials.
`);
