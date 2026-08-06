import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const source = "social";
const destination = process.env.SOCIAL_SYNC_DESTINATION || "social-export";

function copyDirectory(from, to) {
  mkdirSync(to, { recursive: true });

  for (const name of readdirSync(from)) {
    const sourcePath = join(from, name);
    const destinationPath = join(to, name);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

if (!existsSync(source)) {
  throw new Error("Pasta social nao encontrada.");
}

copyDirectory(source, destination);
console.log(`Social sincronizado em: ${destination}`);
