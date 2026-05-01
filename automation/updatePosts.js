import { readFileSync, writeFileSync } from "node:fs";

export function readPosts(path = "posts.js") {
  const source = readFileSync(path, "utf8");
  const match = source.match(/const posts = (\[[\s\S]*?\]);/);
  if (!match) throw new Error(`Não consegui ler ${path}`);
  return JSON.parse(match[1]);
}

export function writePosts(posts, path = "posts.js") {
  writeFileSync(path, `const posts = ${JSON.stringify(posts, null, 2)};\n`);
}

export function upsertPosts(newPosts, path = "posts.js") {
  const current = readPosts(path);
  const withoutDuplicates = current.filter(
    (post) => !newPosts.some((newPost) => newPost.link === post.link)
  );
  const next = [...newPosts, ...withoutDuplicates];
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
  }));
  const next = upsertPosts(posts);
  console.log(`posts.js atualizado com ${posts.length} artigo(s). Total: ${next.length}`);
}
