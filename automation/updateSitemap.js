import { readdirSync, writeFileSync } from "node:fs";

function loadSiteUrl() {
  return process.env.SITE_URL || "https://talkglobalapp.com";
}

export function updateSitemap({
  siteUrl = loadSiteUrl(),
  output = "sitemap.xml",
  lastmod = new Date().toISOString().slice(0, 10),
} = {}) {
  const blogUrls = readdirSync("blog")
    .filter((file) => file.endsWith(".html"))
    .map((file) => (file === "index.html" ? "/blog/" : `/blog/${file}`))
    .sort((a, b) => {
      if (a === "/blog/") return -1;
      if (b === "/blog/") return 1;
      return a.localeCompare(b);
    });

  const urls = [
    "/",
    ...blogUrls,
    "/extensao.html",
    "/privacy.html",
    "/terms.html",
  ];

  writeFileSync(output, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join("\n\n")}
</urlset>
`);

  return urls;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const urls = updateSitemap();
  console.log(`sitemap.xml atualizado com ${urls.length} URLs.`);
}
