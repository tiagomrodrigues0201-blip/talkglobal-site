import { mkdir, writeFile } from "node:fs/promises";

const characters = [
  {
    slug: "ban",
    name: "Ban",
    status: "ativo",
    classification: "humano sob observação",
    archive: "sem conclusão autorizada",
    image: "/public/studios/ban.jpg",
    cardLine: "Livre demais para obedecer ao medo.",
    description: [
      "Ban aparece como alguém que se move antes mesmo de pensar. Barulhento, impulsivo e impossível de ignorar, ele carrega uma energia completamente diferente da de Ren.",
      "Onde Ren é silêncio, Ban é movimento.",
      "O arquivo registra alterações incomuns no ambiente ao seu redor durante situações de tensão: deslocamento de ar, pressão instável e reações físicas difíceis de explicar.",
      "Ban não parece tratar o perigo como uma prisão.",
      "Parece tratá-lo como um desafio."
    ]
  },
  {
    slug: "kiwa",
    name: "Kiwa",
    status: "ativa",
    classification: "humana sob observação",
    archive: "suporte vital instável",
    image: "/public/studios/kiwa.jpg",
    cardLine: "Ela não deixa ninguém cair em silêncio.",
    description: [
      "Kiwa é registrada como uma presença quente dentro de um mundo cada vez mais frio.",
      "Sua ligação com Ban é evidente, mas o arquivo evita concluir até onde essa conexão influencia suas decisões em campo.",
      "Durante situações críticas, foram observadas manifestações térmicas ao redor de suas mãos, como linhas de calor capazes de reagir ao corpo humano de maneira anormal.",
      "Não há confirmação pública sobre a extensão desse fenômeno.",
      "Apenas uma observação permanece liberada:",
      "Kiwa não parece aceitar a ideia de perder alguém sem lutar contra isso."
    ]
  },
  {
    slug: "alaric",
    name: "Alaric",
    status: "ativo",
    classification: "guardião sob registro restrito",
    archive: "autorização parcial",
    image: "/public/studios/alaric.jpg",
    cardLine: "Ordem não é paz. É contenção.",
    description: [
      "Alaric surge como uma figura rígida, disciplinada e difícil de decifrar.",
      "Sua postura lembra a de um cavaleiro moderno, mas seus métodos parecem pertencer a algo mais antigo do que qualquer instituição conhecida.",
      "O arquivo registra manifestações douradas ao seu redor, especialmente em momentos de defesa ou contenção.",
      "Alaric não age por impulso.",
      "Ele observa, mede e responde.",
      "Como se soubesse que certos erros não podem ser cometidos duas vezes."
    ]
  },
  {
    slug: "izaya",
    name: "Izaya",
    status: "ativo",
    classification: "ameaça psicológica",
    archive: "altamente restrito",
    image: "/public/studios/izaya.jpg",
    cardLine: "O medo aprendeu a sorrir.",
    description: [
      "Izaya é registrado como uma presença elegante demais para parecer humana em situações de horror.",
      "Ele não demonstra pressa.",
      "Não demonstra raiva.",
      "E talvez por isso seja tão perigoso.",
      "Testemunhas relatam uma sensação de observação constante perto dele, como se algo invisível estivesse olhando através do ambiente.",
      "O arquivo não confirma a origem de sua influência, mas registra efeitos sobre percepção, memória e medo.",
      "Izaya não parece atacar apenas o corpo.",
      "Ele encontra a rachadura antes da pessoa perceber que está quebrando."
    ]
  },
  {
    slug: "zenkai",
    name: "Zenkai",
    status: "ativo",
    classification: "ameaça desconhecida",
    archive: "conclusão proibida",
    image: "/public/studios/zenkai.jpg",
    cardLine: "Ele não quer o mundo. Quer ultrapassá-lo.",
    description: [
      "Zenkai é uma das presenças mais enigmáticas registradas pelo arquivo.",
      "Calmo, elegante e frio, ele não se comporta como alguém movido por ambição comum.",
      "Seus diálogos indicam desprezo profundo pela humanidade, mas não simples ódio.",
      "Zenkai observa o mundo como se ele fosse uma falha em andamento.",
      "O arquivo registra uma relação ainda não explicada entre sua presença e distorções ligadas ao vazio, ao silêncio e à sensação de ausência.",
      "Não há conclusão pública autorizada.",
      "Apenas uma advertência:",
      "Zenkai não parece querer vencer dentro da realidade.",
      "Parece querer sair dela."
    ]
  },
  {
    slug: "mizuki",
    name: "Mizuki",
    status: "lacrado",
    classification: "presença não confirmada",
    archive: "acesso negado",
    image: "/public/studios/mizuki.jpg",
    cardLine: "Onde ela passa, o calor desaparece.",
    sealed: true,
    description: [
      "O nome Mizuki aparece em registros incompletos, sempre associado a quedas bruscas de temperatura e relatos de silêncio absoluto.",
      "Não há confirmação pública sobre sua origem, função ou ligação com os eventos principais.",
      "Alguns arquivos mencionam gelo escuro.",
      "Outros mencionam sombras.",
      "A maioria foi apagada antes da leitura completa.",
      "O dossiê permanece lacrado."
    ]
  },
  {
    slug: "daitetsu",
    name: "Daitetsu",
    status: "ativo",
    classification: "humano sob registro especial",
    archive: "parcialmente lacrado",
    image: "/public/studios/daitetsu.jpg",
    cardLine: "Algumas lendas ainda respiram.",
    description: [
      "Daitetsu é registrado como uma presença difícil de ignorar.",
      "Grande, intimidador e silenciosamente experiente, ele carrega a postura de alguém que viu mais do que deveria.",
      "O arquivo evita classificá-lo apenas como guerreiro.",
      "Há algo antigo em sua forma de observar o mundo.",
      "Ele parece reconhecer sinais que outros personagens ainda não compreendem.",
      "Não há conclusão pública sobre sua verdadeira força.",
      "Apenas uma anotação foi liberada:",
      "Daitetsu não parece surpreso com o horror.",
      "Parece familiarizado com ele."
    ]
  },
  {
    slug: "pippa",
    name: "Pippa",
    status: "ativa",
    classification: "humana sob risco emocional",
    archive: "observação sensível",
    image: "/public/studios/pippa.jpg",
    cardLine: "Ainda humana. Apesar de tudo.",
    description: [
      "Pippa é uma das presenças mais humanas registradas no arquivo.",
      "Em meio a forças impossíveis, silêncios violentos e pessoas que parecem carregar segredos antigos, ela ainda reage como alguém que sente o peso de cada acontecimento.",
      "O arquivo não registra nela uma ameaça evidente.",
      "Mas registra algo talvez mais raro:",
      "resistência emocional.",
      "Pippa sofre, questiona e continua.",
      "Em HESIDIO, permanecer humano pode ser mais perigoso do que parecer forte."
    ]
  },
  {
    slug: "mora",
    name: "Mora",
    status: "lacrado",
    classification: "antagonismo em observação",
    archive: "acesso parcial negado",
    image: "/public/studios/mora.jpg",
    cardLine: "Ela diz o que ninguém quer ouvir.",
    sealed: true,
    description: [
      "Mora aparece em registros fragmentados ligados a conflitos emocionais e ideológicos.",
      "O arquivo não confirma sua origem, intenção ou extensão de ameaça.",
      "Sua presença, porém, parece provocar instabilidade em pessoas ao redor.",
      "Não por força bruta.",
      "Mas por confronto.",
      "Mora não parece apenas atacar.",
      "Ela expõe.",
      "E alguns arquivos sugerem que certas verdades podem ferir mais do que qualquer lâmina."
    ]
  },
  {
    slug: "hachiro",
    name: "Hachiro",
    status: "ativo",
    classification: "humano sob observação",
    archive: "registro parcial",
    image: "/public/studios/hachiro.jpg",
    cardLine: "O nome apareceu antes da explicação.",
    description: [
      "Hachiro aparece nos registros como alguém ligado a treino, disciplina e leitura de combate.",
      "Sua presença não vem acompanhada de explicações completas.",
      "O arquivo evita concluir sua função dentro dos eventos atuais.",
      "O que permanece liberado é simples:",
      "Hachiro observa antes de agir.",
      "E quando age, o movimento parece carregar mais experiência do que ruído."
    ]
  },
  {
    slug: "sakuma",
    name: "Sakuma",
    status: "ativo",
    classification: "ameaça sob observação",
    archive: "registro instável",
    image: "/public/studios/sakuma.jpg",
    cardLine: "Ele não precisava tocar em ninguém.",
    description: [
      "Sakuma é registrado como uma presença opressiva.",
      "Testemunhas relatam sensação de peso no ar, dificuldade de movimento e alterações físicas no ambiente antes de qualquer contato direto.",
      "Seu comportamento é frio, contido e difícil de prever.",
      "O arquivo não confirma a natureza exata de sua força.",
      "Apenas registra que, perto dele, o ambiente parece ceder primeiro.",
      "Sakuma não precisa levantar a voz.",
      "O mundo ao redor já entende a ameaça."
    ]
  },
  {
    slug: "bakurai",
    name: "Bakurai",
    status: "ativo",
    classification: "manifestação instável",
    archive: "ruptura elétrica registrada",
    image: "/public/studios/bakurai.jpg",
    cardLine: "Se o corpo quebrar, ele avança quebrado.",
    description: [
      "Bakurai é registrado como uma presença violenta, instável e difícil de conter.",
      "Ao seu redor, os registros apontam manifestações de raios negros que não se comportam como eletricidade comum. As descargas surgem de forma irregular, atravessando o ar como rachaduras vivas, reagindo à dor, à raiva e ao movimento.",
      "O arquivo não confirma a origem dessa energia.",
      "Apenas registra que ela parece responder diretamente à vontade de Bakurai.",
      "Não há delicadeza em sua manifestação.",
      "Não há defesa.",
      "Não há recuo.",
      "Quando os raios negros aparecem, o ambiente parece entender que algo está prestes a ser destruído.",
      "Bakurai não demonstra medo de quebrar no processo.",
      "Pelo contrário.",
      "Quando o limite surge, ele continua andando.",
      "FRASE REGISTRADA:",
      "Se meu corpo quebrar... então eu avanço quebrado."
    ]
  }
];

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

const renderPage = (character) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(character.name)} | Dossiê Oficial HESIDIO</title>
<meta name="description" content="Dossiê público de ${esc(character.name)} em HESIDIO. Registro parcial, sem conclusão autorizada.">
<link rel="canonical" href="https://talkglobalapp.com/personagens/${esc(character.slug)}/">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:title" content="${esc(character.name)} | Dossiê Oficial HESIDIO">
<meta property="og:description" content="${esc(character.cardLine)}">
<meta property="og:image" content="https://talkglobalapp.com${esc(character.image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/public/studios/hesidio-logo-site.png">
<link rel="stylesheet" href="/assets/talkglobal.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852370456334253" crossorigin="anonymous"></script>
</head>
<body class="archive-entry-page">
  <div class="archive-grain" aria-hidden="true"></div>
  <main class="archive-entry container">
    <a class="archive-back" href="/personagens/">Voltar aos dossiês públicos</a>
    <article>
      <header>
        <span class="kicker">${character.sealed ? "DOSSIÊ LACRADO" : "DOSSIÊ LIBERADO"} // TEMPORADA I</span>
        <h1>${esc(character.name)}</h1>
        <p>STATUS: ${esc(character.status)}<br>CLASSIFICAÇÃO: ${esc(character.classification)}<br>ARQUIVO: ${esc(character.archive)}</p>
      </header>
      <figure class="watermarked-image featured-evidence" oncontextmenu="return false">
        <img src="${esc(character.image)}" alt="Dossiê visual oficial de ${esc(character.name)} em HESIDIO" draggable="false">
        <span class="watermarked-image__center" aria-hidden="true">HESIDIO</span>
        <span class="watermarked-image__pattern" aria-hidden="true">HESIDIO · @hesidio</span>
        <span class="watermarked-image__diagonal" aria-hidden="true">HESIDIO</span>
        <span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span>
      </figure>
      <section>
        <h2>Registro parcial</h2>
${character.description.map((paragraph) => `        <p>${esc(paragraph)}</p>`).join("\n")}
        <blockquote>${esc(character.cardLine)}</blockquote>
      </section>
    </article>
  </main>
</body>
</html>
`;

const renderIndex = () => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Personagens | Dossiês Públicos HESIDIO</title>
<meta name="description" content="Dossiês públicos de personagens de HESIDIO. Registros parciais, lacrados e sem conclusão autorizada.">
<link rel="canonical" href="https://talkglobalapp.com/personagens/">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:title" content="Personagens | Dossiês Públicos HESIDIO">
<meta property="og:description" content="Arquivo público de personagens de HESIDIO, com registros parciais liberados pela Temporada I.">
<meta property="og:image" content="https://talkglobalapp.com/public/studios/hesidio-poster.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/public/studios/hesidio-logo-site.png">
<link rel="stylesheet" href="/assets/talkglobal.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852370456334253" crossorigin="anonymous"></script>
</head>
<body class="archive-entry-page">
  <div class="archive-grain" aria-hidden="true"></div>
  <main class="archive-entry container">
    <a class="archive-back" href="/hesidio/">Voltar ao arquivo HESIDIO</a>
    <section class="hub-release-panel hub-character-panel character-index-panel" aria-label="Dossiês públicos de personagens">
      <span class="kicker">DOSSIÊS LACRADOS</span>
      <h1>Personagens</h1>
      <p>Os dossiês públicos acompanham o ritmo do arquivo oficial. O restante permanece lacrado.</p>
      <div class="hub-character-grid" data-hesidio-characters>
        <a class="hub-character-card" href="/personagens/ren-hazama/">
          <figure class="watermarked-image watermarked-image--page watermarked-image--soft-center" oncontextmenu="return false">
            <img src="/public/studios/ren-dossie.png" alt="Dossiê visual oficial de Ren Hazama em HESIDIO" draggable="false" loading="lazy" decoding="async">
            <span class="watermarked-image__center" aria-hidden="true">DOSSIÊ LIBERADO</span>
            <span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span>
          </figure>
          <small>Arquivo público</small>
          <h3>Ren Hazama</h3>
          <p>Silencioso, ferido e perigoso sem querer ser.</p>
        </a>
      </div>
    </section>
  </main>
  <script src="/assets/hesidio-site-state.js" defer></script>
</body>
</html>
`;

await mkdir("personagens", { recursive: true });
for (const character of characters) {
  await mkdir(`personagens/${character.slug}`, { recursive: true });
  await writeFile(`personagens/${character.slug}/index.html`, renderPage(character));
}
await writeFile("personagens/index.html", renderIndex());
