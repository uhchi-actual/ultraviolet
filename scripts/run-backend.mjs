#!/usr/bin/env node
/** Start FastAPI backend with D: drive env vars. Used by `npm run dev`. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const venvUvicorn = path.join(backend, ".venv", "Scripts", "uvicorn.exe");

if (!existsSync(venvUvicorn)) {
  console.error("\nBackend venv missing. Run once:\n");
  console.error("  cd backend");
  console.error("  python -m venv .venv");
  console.error('  .venv\\Scripts\\pip install -e ".[audio,demucs,dev]"');
  console.error("\nSee docs/SETUP.md\n");
  process.exit(1);
}

const env = {
  ...process.env,
  TORCH_HOME: "D:\\ultraviolet-data\\torch",
  HF_HOME: "D:\\ultraviolet-data\\huggingface",
  STEM_CACHE_DIR: "D:\\ultraviolet-data\\stems",
  CATALOG_DIR: "D:\\ultraviolet-data\\catalog",
  SESSION_DIR: "D:\\ultraviolet-data\\sessions",
};

const port = process.env.UV_BACKEND_PORT ?? "8001";

const child = spawn(
  venvUvicorn,
  ["src.main:app", "--host", "127.0.0.1", "--port", port, "--reload"],
  {
  cwd: backend,
  env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 0));
