import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("node", ["scripts/predeploy-check.mjs"]);
run("npx", ["vercel", "--prod", "--yes"]);
run("node", ["scripts/verify-production.mjs"]);
