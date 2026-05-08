const canvas = document.getElementById('viralCanvas');
const ctx = canvas.getContext('2d');
const theme = document.getElementById('viralTheme');
const style = document.getElementById('viralStyle');
const signature = document.getElementById('viralSignature');
const copyBox = document.getElementById('viralCopy');
const generateBtn = document.getElementById('generateViral');
const variationBtn = document.getElementById('variationViral');
const downloadBtn = document.getElementById('downloadViral');
const copyBtn = document.getElementById('copyViral');

const ideas = {
  sabedoria: [
    'Você não precisa vencer o dia inteiro. Só precisa não abandonar o próximo passo.',
    'Disciplina é quando o seu futuro começa a mandar nas suas escolhas de hoje.',
    'A vida muda quando você para de negociar com aquilo que já decidiu.'
  ],
  ambicao: [
    'Daqui a dois anos, você vai agradecer por não ter parado hoje.',
    'O sonho parece longe até o dia em que a rotina começa a encurtar a distância.',
    'O tempo vai passar de qualquer forma. A diferença é o que você constrói enquanto ele passa.'
  ],
  vida: [
    'Eu nasci para viver com calma, amar com presença e trabalhar sem perder a alma.',
    'Nem tudo precisa ser grande. Algumas felicidades só precisam ser verdadeiras.',
    'A vida melhora quando você aprende a proteger o que te devolve paz.'
  ],
  noticia: [
    'A nova vantagem não é saber mais. É transformar informação em movimento antes da maioria.',
    'A tecnologia está mudando o trabalho. Quem entende cedo, decide melhor.',
    'O mundo ficou mais rápido. Clareza virou uma das maiores moedas da nova economia.'
  ],
  ia: [
    'O futuro não vai substituir quem pensa. Vai acelerar quem sabe perguntar.',
    'A inteligência artificial não elimina a humanidade. Ela revela quem ainda sabe criar sentido.',
    'No novo mundo, a pergunta certa vale mais do que a resposta rápida.'
  ]
};

const captions = {
  sabedoria: 'Salve para reler quando a pressa tentar te tirar do caminho.',
  ambicao: 'Mande isso para você mesmo. O futuro cobra constância, não perfeição.',
  vida: 'Às vezes, vencer é só lembrar do que realmente importa.',
  noticia: 'Uma frase para pensar no ritmo em que o mundo está mudando.',
  ia: 'O futuro pertence a quem aprende a pensar com novas ferramentas.'
};

let current = null;

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function wrapText(text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}
function fillRoundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}
function drawNoise(alpha = 0.05) {
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 16) {
    const v = 235 + Math.random() * 20;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255 * alpha;
  }
  ctx.putImageData(image, 0, 0);
}
function drawPost() {
  const selectedTheme = theme.value;
  const selectedStyle = style.value;
  const quote = pick(ideas[selectedTheme]);
  const brand = signature.value.trim() || 'TalkGlobal';
  current = { quote, theme: selectedTheme, style: selectedStyle, brand };

  ctx.clearRect(0, 0, 1080, 1350);
  if (selectedStyle === 'cinema') {
    const g = ctx.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#050814'); g.addColorStop(.55, '#111827'); g.addColorStop(1, '#1e3a8a'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350); ctx.fillStyle = 'rgba(22,163,74,.18)'; ctx.beginPath(); ctx.arc(880, 200, 260, 0, Math.PI * 2); ctx.fill();
  } else if (selectedStyle === 'papel') {
    ctx.fillStyle = '#f7f4ee'; ctx.fillRect(0, 0, 1080, 1350); drawNoise(.08);
  } else if (selectedStyle === 'impacto') {
    ctx.fillStyle = '#0a0f1f'; ctx.fillRect(0, 0, 1080, 1350); ctx.fillStyle = '#ffffff'; fillRoundRect(70, 86, 940, 220, 44);
  } else if (selectedStyle === 'premium') {
    const g = ctx.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#f8fbff'); g.addColorStop(.6, '#ffffff'); g.addColorStop(1, '#e6f7ed'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350); ctx.fillStyle = '#1e3a8a'; fillRoundRect(70, 72, 170, 18, 9); ctx.fillStyle = '#16a34a'; fillRoundRect(70, 104, 96, 18, 9);
  } else {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1080, 1350); ctx.fillStyle = '#ef4444'; ctx.font = 'bold 160px Georgia'; ctx.fillText('“', 78, 220);
  }

  const dark = selectedStyle === 'cinema' || selectedStyle === 'impacto';
  ctx.fillStyle = dark ? '#ffffff' : '#07111f';
  const isPaper = selectedStyle === 'papel';
  const font = isPaper ? 'bold 72px Georgia' : '900 78px Arial';
  const lines = wrapText(quote, selectedStyle === 'impacto' ? 910 : 880, font);
  ctx.font = font;
  ctx.textBaseline = 'top';
  const startY = selectedStyle === 'impacto' ? 430 : selectedStyle === 'papel' ? 300 : 360;
  lines.forEach((line, index) => ctx.fillText(line, 78, startY + index * 92));

  const footerY = 1120;
  ctx.fillStyle = selectedStyle === 'cinema' || selectedStyle === 'impacto' ? '#86efac' : '#16a34a';
  ctx.font = '900 52px Arial';
  ctx.fillText(brand, 78, footerY);
  ctx.fillStyle = dark ? 'rgba(255,255,255,.72)' : '#475569';
  ctx.font = '500 32px Arial';
  ctx.fillText(selectedTheme === 'ia' ? 'pensamento do futuro' : 'post criado com IA', 78, footerY + 62);
  ctx.fillStyle = dark ? 'rgba(255,255,255,.12)' : '#dbeafe';
  fillRoundRect(78, 1240, 924, 2, 1);
  ctx.fillStyle = dark ? 'rgba(255,255,255,.82)' : '#1e3a8a';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('salve · compartilhe · volte para criar outro', 78, 1268);

  copyBox.value = `${quote}\n\n${captions[selectedTheme]}\n\n#talkglobal #frases #motivacao #sabedoria #criadores #instagrambrasil`;
}
function downloadPost() {
  const link = document.createElement('a');
  link.download = 'talkglobal-post-viral.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
async function copyText() {
  await navigator.clipboard.writeText(copyBox.value);
  copyBtn.textContent = 'Copy copiada';
  setTimeout(() => { copyBtn.textContent = 'Copiar copy'; }, 1400);
}

generateBtn.addEventListener('click', drawPost);
variationBtn.addEventListener('click', drawPost);
downloadBtn.addEventListener('click', downloadPost);
copyBtn.addEventListener('click', copyText);
theme.addEventListener('change', drawPost);
style.addEventListener('change', drawPost);
signature.addEventListener('input', () => { if (current) drawPost(); });
drawPost();
