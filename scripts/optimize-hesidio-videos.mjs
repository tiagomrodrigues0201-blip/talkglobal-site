import { execFile } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ffmpeg = "/Users/tiago/Desktop/Site/node_modules/ffmpeg-static/ffmpeg";
const inputDir = process.argv[2] || "/Users/tiago/Desktop/Anime/hesidio-videos";
const outputDir = process.argv[3] || "public/videos";

await mkdir(outputDir, { recursive: true });

const files = (await readdir(inputDir))
  .filter((file) => /\.(mov|mp4|m4v)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

const mb = async (filePath) => {
  const size = (await stat(filePath)).size;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const run = async (args) => {
  await execFileAsync(ffmpeg, args, { maxBuffer: 1024 * 1024 * 20 });
};

for (const file of files) {
  const source = path.join(inputDir, file);
  const slug = path.basename(file, path.extname(file)).toLowerCase();
  const video = path.join(outputDir, `${slug}.mp4`);
  const poster = path.join(outputDir, `${slug}-poster.jpg`);

  console.log(`optimizing ${file}`);
  await run([
    "-y",
    "-i", source,
    "-vf", "fps=30,scale=w='min(960,iw)':h=-2",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "31",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", "96k",
    "-ac", "2",
    video
  ]);

  await run([
    "-y",
    "-ss", "0.8",
    "-i", source,
    "-vf", "scale=w='min(1280,iw)':h=-2",
    "-frames:v", "1",
    "-q:v", "4",
    poster
  ]);

  console.log(`done ${slug}: ${await mb(source)} -> ${await mb(video)}`);
}
