const baseUrl = process.env.SITE_URL || "https://talkglobalapp.com";

const requiredRoutes = [
  "/",
  "/manga/",
  "/manga/episodios/ep-1/",
  "/artigos/",
  "/ecos/",
  "/ecos/enviar/",
  "/privacy.html",
  "/terms.html",
  "/contato.html",
  "/politica-editorial.html",
  "/copyright.html",
  "/ads.txt",
  "/robots.txt",
  "/sitemap.xml",
];

const failures = [];

async function checkRoute(pathname) {
  const url = new URL(pathname, baseUrl);
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual" });
    if (response.status >= 200 && response.status < 400) {
      console.log(`OK ${response.status} ${url.href}`);
      return;
    }

    failures.push(`${response.status} ${url.href}`);
    console.error(`FAIL ${response.status} ${url.href}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`NETWORK ${url.href} - ${message}`);
    console.error(`FAIL NETWORK ${url.href} - ${message}`);
  }
}

for (const route of requiredRoutes) {
  await checkRoute(route);
}

if (failures.length) {
  console.error("\nVERIFICACAO DE PRODUCAO FALHOU\n");
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("\nProducao OK: rotas criticas respondendo.");
