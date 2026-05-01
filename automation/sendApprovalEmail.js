import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const env = readFileSync(".env", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && !(key in process.env)) process.env[key] = rest.join("=");
    }
  } catch {
    // .env is optional in CI.
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function articleHtml(article) {
  const sources = article.sources
    .map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a> <small>${escapeHtml(source.source)} · ${escapeHtml(source.publishedAt || "")}</small></li>`)
    .join("");
  const facts = (article.facts || [])
    .map((fact) => `<li>${escapeHtml(fact.text)}</li>`)
    .join("");

  return `
    <article style="border:1px solid #dbeafe;border-radius:18px;padding:18px;margin:18px 0;background:#ffffff">
      <p style="margin:0 0 8px;color:#1e3a8a;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(article.category)}</p>
      <h2 style="margin:0 0 8px;color:#07111f;font-size:24px;line-height:1.15">${escapeHtml(article.title)}</h2>
      <p style="margin:0 0 12px;color:#475569">${escapeHtml(article.description)}</p>
      <p style="margin:0 0 12px;color:#334155"><strong>Arquivo:</strong> blog/${escapeHtml(article.filename)}</p>
      <p style="margin:0 0 8px;color:#334155"><strong>Dados/fatos extraídos:</strong></p>
      <ul style="margin-top:0;color:#334155">${facts}</ul>
      <p style="margin:0 0 8px;color:#334155"><strong>Fontes usadas:</strong></p>
      <ul style="margin-top:0;color:#334155">${sources}</ul>
      <p style="margin:16px 0 6px;color:#334155"><strong>Copy Instagram:</strong></p>
      <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px;color:#334155;font-family:Arial,sans-serif">${escapeHtml(article.instagramCopy || "")}</pre>
      <p style="margin:16px 0 6px;color:#334155"><strong>Prompt de imagem:</strong></p>
      <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px;color:#334155;font-family:Arial,sans-serif">${escapeHtml(article.imagePrompt || "")}</pre>
    </article>`;
}

export async function sendApprovalEmail(approval) {
  loadEnv();

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.APPROVAL_EMAIL;
  const siteUrl = process.env.SITE_URL || "https://www.talkglobalapp.com";

  if (!apiKey || !to) {
    console.warn("Email não enviado: configure RESEND_API_KEY e APPROVAL_EMAIL no .env.");
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#07111f">
      <div style="max-width:720px;margin:auto;background:#fff;border:1px solid #dbeafe;border-radius:24px;padding:28px">
        <p style="margin:0 0 8px;color:#16a34a;font-weight:800;text-transform:uppercase;letter-spacing:.08em">TalkGlobal</p>
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.1">Aprovação pendente: ${approval.articles.length} artigos</h1>
        <p style="color:#475569">Revise títulos, resumos, fatos extraídos, fontes recentes, copy de Instagram e prompt de imagem. Nada será publicado até o arquivo <strong>automation/approval.json</strong> estar com <strong>"status": "approved"</strong>.</p>
        ${approval.articles.map(articleHtml).join("")}
        <div style="margin-top:22px;padding:16px;border-radius:16px;background:#eff6ff;color:#1e3a8a">
          <strong>Como aprovar:</strong>
          <p style="margin:8px 0 0">No terminal, rode <code>npm run approve</code> dentro da pasta do site. Depois rode <code>npm run publish</code>.</p>
        </div>
        <p style="color:#64748b;margin-top:20px">Site: <a href="${siteUrl}">${siteUrl}</a></p>
      </div>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TalkGlobal Automation <onboarding@resend.dev>",
      to,
      subject: `TalkGlobal: aprovar ${approval.articles.length} novos artigos`,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar email via Resend: ${response.status} ${body}`);
  }

  console.log(`Email de aprovação enviado para ${to}`);
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnv();
  const approval = JSON.parse(readFileSync("automation/approval.json", "utf8"));
  sendApprovalEmail(approval).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
