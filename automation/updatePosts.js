import { readFileSync, writeFileSync } from "node:fs";

export function readPosts(path = "posts.js") {
  const source = readFileSync(path, "utf8");
  const match = source.match(/(?:const posts|window\.TALKGLOBAL_POSTS) = (\[[\s\S]*?\]);/);
  if (!match) throw new Error(`Não consegui ler ${path}`);
  return JSON.parse(match[1]);
}

export function writePosts(posts, path = "posts.js") {
  const source = readFileSync(path, "utf8");
  const variableName = source.includes("window.TALKGLOBAL_POSTS") ? "window.TALKGLOBAL_POSTS" : "const posts";
  writeFileSync(path, `${variableName} = ${JSON.stringify(posts, null, 2)};\n`);
}

function postTimestamp(post) {
  const value = post.date || post.publishedAt || post.createdAt || "";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function newestFirst(posts) {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => postTimestamp(b.post) - postTimestamp(a.post) || a.index - b.index)
    .map(({ post }) => post);
}

export function upsertPosts(newPosts, path = "posts.js") {
  const current = readPosts(path);
  const incoming = [...newPosts].reverse();
  const incomingLinks = new Set(incoming.map((post) => post.link));
  const withoutDuplicates = current.filter((post) => !incomingLinks.has(post.link));
  const next = newestFirst([...incoming, ...withoutDuplicates]);
  writePosts(next, path);
  return next;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const approval = JSON.parse(readFileSync("automation/approval.json", "utf8"));
  const posts = approval.articles.map((article) => ({
    titulo: article.title,
    categoria: article.category,
    descricao: article.description,
    link: `/blog/${article.filename}`,
    tempo: article.read || "5 min",
    date: article.date,
    theme: article.theme,
  }));
  const next = upsertPosts(posts);
  console.log(`posts.js atualizado com ${posts.length} artigo(s). Total: ${next.length}`);
}
