import type { NextConfig } from "next";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// In the monorepo, .env.local lives at the repo root, not apps/web/.
// Load it here so middleware and route handlers see the vars.
const rootEnvPath = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnvPath)) {
  for (const line of readFileSync(rootEnvPath, "utf-8").split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const eq = clean.indexOf("=");
    if (eq < 0) continue;
    const key = clean.slice(0, eq).trim();
    const val = clean.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@organizaTUM/shared"],
};

export default nextConfig;
