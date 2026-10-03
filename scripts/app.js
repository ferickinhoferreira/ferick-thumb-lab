/* ==========================================================================
   Ferick Thumb Lab — app.js
   Simulador de preview de thumbnail do YouTube (home, shorts, busca, watch)
   ________________________________________________________________________ */

'use strict';

/* ----------------------------- ESTADO GLOBAL ----------------------------- */
const DEFAULT_META = {
  title: 'Como eu faço THUMBNAILS que EXPLODEM em cliques (passo a passo)',
  channel: 'Ferick Studio',
  views: '128 mil visualizações',
  age: 'há 2 horas',
  duration: '14:32',
  shortTitle: 'o segredo das thumbs',
  keyword: 'THUMBNAILS',
  keywordColor: '#ff2b55',
  titleScale: 100
};

const state = {
  device: 'desktop',      // desktop | mobile | tv
  tab: 'home',            // home | shorts | search | watch | compare | library | score
  chip: 'Todos',
  chipLabel: '',
  query: 'thumbnail',
  meta: { ...DEFAULT_META },
  hideTitle: false,
  hideMeta: false,
  dimNeighbors: false,    // desligado: todos os cards iguais (imersão real do YouTube)
  isolate: false,
  trueScale: false,       // limita a thumb ativa aos px exibidos pelo YouTube
  revealOwn: false,       // tecla R: revela temporariamente onde seu vídeo está
  theme: 'dark',
  library: [],            // { id, name, src, title, channel, views, age, duration }
  activeId: null,
  compare: null,          // { a, aEntry, b, bEntry, winner } resultado do A/B
  abSel: null,
  abLoading: false,
  blind: null,
  score: null,
  scoreError: ''
};

const CHIPS = ['Todos', 'Shorts', 'Games', 'Design', 'Música', 'Tecnologia', 'Podcast', 'Ao vivo', 'Notícias', 'Filmes', 'Culinária', 'Viagens'];
/* Categorias atribuídas aos vídeos do feed (usadas pelo filtro de chips). */
const FEED_CATEGORIES = ['Games', 'Design', 'Música', 'Tecnologia', 'Podcast', 'Ao vivo', 'Notícias', 'Filmes', 'Culinária', 'Viagens'];

/* Thumbnails reais de concorrentes: imagens locais dentro do próprio projeto
   (assets/rivals) — funciona em file://, localhost, GitHub Pages e Vercel. */
const RIVAL_THUMB_DIR = './assets/rivals';
const RIVAL_THUMB_FILES = [
  'asdadasd.jpeg', 'dasdfafgsa.jpeg', 'dfvfgf.jpeg', 'fafsafsa.jpeg', 'fafsfa.jpeg',
  'fdsfgafsafsa.jpeg', 'fsafasfa.jpeg', 'gcb vbmfyhd.jpeg', 'ghgvcncv.jpeg', 'gsdgdsgsd.jpeg',
  'sadasdasd.jpeg', 'safafasfsa.jpeg', 'safsafsa.jpeg', 'safsafsaf.jpeg', 'sdads.jpeg',
  'sdadsa.jpeg', 'sdasdsa.jpeg', 'sfafsasa.jpeg', 'sfsafsafsa.jpeg', 'shgcvnbvnmhvjffg.jpeg'
];

function rivalThumbURL(i) {
  const file = RIVAL_THUMB_FILES[i % RIVAL_THUMB_FILES.length];
  // encodeURI (não encodeURIComponent): preserva as barras, codifica espaços/acentos
  return encodeURI(`${RIVAL_THUMB_DIR}/${file}`);
}

/* Fallback global para <img> de concorrentes.
   data-fb="N" = índice do blueprint canvas correspondente.
   Chamado via onerror inline (funciona em file:// e http). */
// eslint-disable-next-line no-unused-vars
function thumbErrorHandler(img) {
  if (!img || img.dataset.fbDone) return;
  img.dataset.fbDone = '1';
  const idx = Number(img.dataset.fb || 0) % RIVAL_BLUEPRINTS.length;
  try {
    img.src = makeRivalThumb(RIVAL_BLUEPRINTS[idx], hashCode('fb-' + idx + '-' + (img.alt || '')));
  } catch (err) { /* mantém o alt/background se até o canvas falhar */ }
}

const RIVAL_BLUEPRINTS = [
  { hue: 205, accent: '#ffe14d', label: 'TOP 10', shape: 'burst' },
  { hue: 350, accent: '#ffffff', label: 'E MUITO CUIDADO', shape: 'band' },
  { hue: 145, accent: '#ff5c39', label: 'PASSO A PASSO', shape: 'band' },
  { hue: 265, accent: '#49f2ff', label: 'NOVO MÉTODO', shape: 'burst' },
  { hue: 30,  accent: '#ffffff', label: 'ISSO MUDOU TUDO', shape: 'band' },
  { hue: 190, accent: '#ff2b55', label: 'TESTE REAL', shape: 'burst' },
  { hue: 300, accent: '#ffe14d', label: 'NINGUÉM FALA', shape: 'band' },
  { hue: 100, accent: '#ffffff', label: 'RESULTADO', shape: 'burst' },
  { hue: 15,  accent: '#7b5cff', label: 'ANTES E DEPOIS', shape: 'band' },
  { hue: 230, accent: '#2ecc71', label: 'GUIA COMPLETO', shape: 'burst' },
  { hue: 330, accent: '#ffffff', label: 'SEGREDO', shape: 'band' },
  { hue: 175, accent: '#ffb347', label: 'VOCÊ ERRA ISSO', shape: 'burst' }
];

const RIVAL_CHANNELS = ['Studio Nove', 'Canal Prático', 'Ponto Criativo', 'Aula em Foco', 'Modo Maker', 'Sinal Aberto', 'Corta Tudo', 'Base Zero'];
const RIVAL_TITLES = [
  'Fiz isso e o CTR dobrou em uma semana',
  'A thumbnail que todo mundo copia (e a certa)',
  'Este erro está matando o seu alcance',
  'Do zero ao viral: meu processo completo',
  'Testei 12 estratégias — só 3 funcionaram',
  'O detalhe invisível que muda o clique',
  'Por que seu vídeo não é clicado?',
  'Como escrever títulos que as pessoas querem',
  'Refazendo minha thumb 3 vezes (com você)',
  'A paleta de cores que prende o olhar',
  'Editei em 20 minutos e ficou melhor',
  'Gestos e expressão: o que funciona',
  'Meta-análise: 400 thumbs analisadas',
  'Do analógico ao digital sem perder estilo',
  'Checklist de 9 pontos antes de publicar',
  'Chega de thumb feia: regra dos terços',
  'Roteiro + thumb: a dupla que converte',
  'Cores que o YouTube gosta (e as que evitam)',
  'Mentorando um canal de 800 inscritos',
  '3 minutos para entender Retenção'
];
const RIVAL_VIEWS = ['1,2 mi', '845 mil', '312 mil', '98 mil', '1,8 mi', '443 mil', '76 mil', '2,3 mi', '520 mil', '67 mil', '1,1 mi', '289 mil', '905 mil', '154 mil', '38 mil'];
const RIVAL_AGES = ['há 3 semanas', 'há 1 mês', 'há 5 dias', 'há 1 ano', 'há 2 meses', 'há 8 horas', 'há 4 meses', 'há 2 dias', 'há 6 meses', 'há 11 meses'];

/* ----------------------------- UTILIDADES ----------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Normaliza uma cor para um formato seguro (#rgb, #rrggbb ou #rrggbbaa).
   Evita injeção de CSS caso o valor venha de localStorage/editado à mão. */
const safeColor = (v, fallback = '#ff2b55') => {
  const s = String(v ?? '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s) ? s : fallback;
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
/* PRNG determinístico: mesma seed => mesmo feed (até você embaralhar) */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const initials = (name) => (name || 'FS').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2200);
  setTimeout(() => el.remove(), 2600);
}

/* ----------------------------- YOUTUBE THUMB URLS ----------------------------- */
function extractVideoId(input) {
  const s = (input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/
  ];
  for (const p of patterns) { const m = s.match(p); if (m) return m[1]; }
  return null;
}
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/* ----------------------------- GERADOR DE THUMBS (CANVAS) ----------------------------- */
/* Gera thumbnails fictícias determinísticas: gradiente, formas, "pessoa" estilizada e rótulo.
   Motivo: o feed precisa de concorrentes plausíveis sem depender de rede. */
function makeRivalThumb(bp, seed, text) {
  const W = 640, H = 360;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rand = rng(seed);

  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `hsl(${bp.hue} 65% 26%)`);
  grad.addColorStop(0.55, `hsl(${(bp.hue + 24) % 360} 72% 42%)`);
  grad.addColorStop(1, `hsl(${(bp.hue + 320) % 360} 60% 14%)`);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);

  const vig = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.72)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);

  g.save();
  g.globalAlpha = 0.13; g.strokeStyle = '#fff'; g.lineWidth = 22;
  for (let i = -1; i < 7; i++) { g.beginPath(); g.moveTo(i * 130, H); g.lineTo(i * 130 + 340, -40); g.stroke(); }
  g.restore();

  const px = 150 + rand() * 90, py = 190;
  g.save();
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.beginPath(); g.ellipse(px, py + 150, 150, 46, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = `hsl(${(bp.hue + 40) % 360} 30% 22%)`;
  g.beginPath(); g.ellipse(px, py + 105, 132, 118, 0, Math.PI, 0); g.fill();
  g.fillStyle = `hsl(${(bp.hue + 20) % 360} 42% 62%)`;
  g.beginPath(); g.ellipse(px, py + 10, 62, 76, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = `hsl(${(bp.hue + 20) % 360} 38% 40%)`;
  g.beginPath(); g.ellipse(px, py - 40, 66, 54, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#111';
  g.beginPath(); g.ellipse(px - 24, py + 6, 8, 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(px + 24, py + 6, 8, 9, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath();
  g.arc(px, py + 22, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.restore();

  const bx = 470, by = 120;
  if (bp.shape === 'burst') {
    g.save(); g.translate(bx, by);
    g.fillStyle = bp.accent;
    g.beginPath();
    for (let i = 0; i < 20; i++) {
      const r = i % 2 ? 52 : 92, a = (i / 20) * Math.PI * 2;
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#141414'; g.font = '800 30px Roboto, Arial'; g.textAlign = 'center';
    g.fillText('!', bx, by + 11);
  } else {
    g.save(); g.translate(bx, by); g.rotate(-0.06);
    g.fillStyle = bp.accent; g.fillRect(-108, -34, 216, 68);
    g.fillStyle = '#141414'; g.font = '800 26px Roboto, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NOVO', 0, 2);
    g.restore();
  }

  const label = text || bp.label;
  const fs = label.length > 14 ? 40 : 52;
  g.font = `800 ${fs}px Roboto, Arial`;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,.92)';
  g.strokeText(label, 46, H - 46);
  g.fillStyle = bp.accent === '#ffffff' ? '#fff' : bp.accent;
  g.fillText(label, 46, H - 46);

  return c.toDataURL('image/jpeg', 0.82);
}

/* thumb do usuário quando ele ainda não subiu nada: placeholder com marca */
function makePlaceholderThumb() {
  const W = 640, H = 360;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#333'; g.lineWidth = 3;
  for (let x = -H; x < W; x += 44) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
  g.fillStyle = 'rgba(255,43,85,.14)';
  g.beginPath(); g.arc(W / 2, H / 2, 150, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ff2b55'; g.font = '800 46px Roboto, Arial'; g.textAlign = 'center';
  g.fillText('FERICK THUMB LAB', W / 2, H / 2 - 6);
  g.fillStyle = '#8a8a8a'; g.font = '500 24px Roboto, Arial';
  g.fillText('suba ou cole sua thumbnail', W / 2, H / 2 + 38);
  return c.toDataURL('image/jpeg', 0.8);
}

/* ----------------------------- SCORE DE IMPACTO ----------------------------- */
/* Heurística local: 6 métricas objetivas calculadas pixel a pixel no canvas.
   Tudo roda no navegador — nenhuma imagem é enviada para fora. */
/* Cache de análises por src: evita recalcular a mesma imagem em refreshScore,
   computeCompare e runBlindTest. Guarda a Promise para deduplicar chamadas. */
const _scoreCache = new Map();
function analyzeThumb(src, { fresh = false } = {}) {
  if (!src) return Promise.resolve(null);
  if (!fresh && _scoreCache.has(src)) return _scoreCache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 128, H = 72;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, W, H);
        const { data } = g.getImageData(0, 0, W, H);

        const lum = new Float32Array(W * H);
        let sumL = 0, sumSat = 0, n = 0, darkPx = 0, brightPx = 0, topL = 0, botL = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4, k = y * W + x;
            const r = data[i] / 255, gg = data[i + 1] / 255, b = data[i + 2] / 255;
            const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
            const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
            const s = mx === 0 ? 0 : (mx - mn) / mx;
            lum[k] = l; sumL += l; sumSat += s; n++;
            if (l < 0.2) darkPx++;
            if (l > 0.8) brightPx++;
            if (y < H / 2) topL += l; else botL += l;
          }
        }
        const meanL = sumL / n, meanSat = sumSat / n;
        let varL = 0;
        for (let k = 0; k < n; k++) varL += (lum[k] - meanL) ** 2;
        const stdL = Math.sqrt(varL / n);

        let grad = 0;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const k = y * W + x;
            grad += Math.abs(lum[k] - lum[k + 1]) + Math.abs(lum[k] - lum[k + W]);
          }
        }
        const sharp = clamp((grad / ((W - 2) * (H - 2)) - 0.015) / 0.085, 0, 1);

        let cSum = 0, cN = 0, bSum = 0, bN = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const k = y * W + x, l = lum[k];
            if (x > W * 0.3 && x < W * 0.7 && y > H * 0.22 && y < H * 0.78) { cSum += l; cN++; }
            else { bSum += l; bN++; }
          }
        }
        const centerFocus = clamp(Math.abs(cSum / cN - bSum / bN) / 0.24, 0, 1);
        const thirds = clamp(Math.abs(topL / (n / 2) - botL / (n / 2)) / 0.3, 0, 1);
        const cropSafe = clamp(1 - (darkPx / n) * 1.35, 0, 1);

        const metrics = [
          { key: 'contrast', label: 'Contraste', value: clamp((stdL - 0.075) / 0.16, 0, 1), weight: 0.24 },
          { key: 'saturation', label: 'Cores vivas', value: clamp(meanSat / 0.62, 0, 1), weight: 0.16 },
          { key: 'sharp', label: 'Nitidez', value: sharp, weight: 0.16 },
          { key: 'focus', label: 'Foco central', value: centerFocus, weight: 0.16 },
          { key: 'balance', label: 'Composição', value: clamp((thirds + cropSafe) / 2, 0, 1), weight: 0.14 },
          { key: 'exposure', label: 'Exposição', value: clamp(1 - Math.abs(meanL - 0.48) / 0.42, 0, 1), weight: 0.14 }
        ];

        let score = 0;
        metrics.forEach((m) => { score += m.value * m.weight; });
        score = Math.round(clamp(score, 0, 1) * 100);

        const notes = [];
        if (metrics[0].value < 0.45) notes.push('Aumente o contraste: o feed é claro e cheio de cores.');
        if (metrics[1].value < 0.45) notes.push('Cores mais vivas destacam a thumb na home.');
        if (metrics[2].value < 0.4) notes.push('A imagem parece suave/borrada em tamanho pequeno.');
        if (metrics[3].value < 0.4) notes.push('Centralize o elemento principal — o card é 16:9.');
        if (metrics[5].value < 0.4) notes.push(meanL < 0.48 ? 'A thumb está escura demais no feed.' : 'A thumb está estourada de brilho.');
        if (brightPx / n > 0.22) notes.push('Muito branco puro: em telas pequenas vira "luz estourada".');
        if (!notes.length) notes.push('Boa base! Teste variações de expressão/cor para subir mais.');

        resolve({ score, metrics, notes, error: null });
      } catch (err) {
        // getImageData falha quando a imagem externa não envia cabeçalhos CORS.
        resolve({ score: null, metrics: [], notes: [], error: 'cors' });
      }
    };
    img.onerror = () => resolve({ score: null, metrics: [], notes: [], error: 'load' });
    img.src = src;
  });
  _scoreCache.set(src, p);
  return p;
}

/* Invalida o cache de uma imagem (ex.: ao removê-la da biblioteca). */
function invalidateScore(src) {
  if (src) _scoreCache.delete(src);
}
/* ----------------------------- FEED / DADOS ----------------------------- */
function buildFeed(seedShift = 0) {
  const items = [];
  const N = 36;
  for (let i = 0; i < N; i++) {
    const seed = hashCode(`ferick-${i}-${seedShift}`);
    const rand = rng(seed);
    // Distribui as 20 imagens reais da pasta (data-fb + onerror cuidam do fallback)
    const thumbIdx = (i * 7 + seedShift * 3) % RIVAL_THUMB_FILES.length;
    const fb = (i + seedShift) % RIVAL_BLUEPRINTS.length;
    items.push({
      kind: 'video',
      id: 'r' + i,
      title: RIVAL_TITLES[(i * 3 + seedShift) % RIVAL_TITLES.length],
      channel: RIVAL_CHANNELS[(i + seedShift) % RIVAL_CHANNELS.length],
      views: RIVAL_VIEWS[(i * 5 + seedShift) % RIVAL_VIEWS.length] + ' visualizações',
      age: RIVAL_AGES[(i * 7 + seedShift) % RIVAL_AGES.length],
      duration: `${2 + Math.floor(rand() * 26)}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`,
      thumb: rivalThumbURL(thumbIdx),
      fb,
      category: FEED_CATEGORIES[(i + seedShift) % FEED_CATEGORIES.length]
    });
  }
  return items;
}

let FEED = [];
let USER_POS = 3; // posição do vídeo do usuário dentro do feed (rerolada aleatoriamente)

function userItem() {
  const active = state.library.find((t) => t.id === state.activeId) || state.library[0];
  const thumb = active ? active.src : makePlaceholderThumb();
  return {
    kind: 'video',
    id: 'user',
    own: true,
    userFb: true,          // usa fallback próprio (placeholder) se a URL do usuário quebrar
    title: state.meta.title,
    channel: state.meta.channel || 'Seu canal',
    views: state.meta.views,
    age: state.meta.age,
    duration: state.meta.duration,
    shortTitle: state.meta.shortTitle,
    thumb
  };
}

function orderedFeed() {
  // Filtro real pelo chip de categoria selecionado ("Todos" e "Shorts" não filtram).
  const cat = state.chip && state.chip !== 'Todos' && state.chip !== 'Shorts' ? state.chip : null;
  const base = cat ? FEED.filter((i) => i.category === cat) : FEED;
  const list = (base.length ? base : FEED).slice();
  const userIdx = clamp(USER_POS, 0, Math.max(0, list.length - 1));
  list.splice(userIdx, 0, userItem());
  return list;
}

/* Posição aleatória do vídeo do usuário no feed (não determinística).
   Chamado apenas em init() e em "Embaralhar" para mudar o encaixe. */
function rerollUserPosition() {
  USER_POS = 2 + Math.floor(Math.random() * Math.max(1, FEED.length - 3));
}

/* ----------------------------- COMPONENTES ----------------------------- */
function titleHTML(text) {
  const kw = state.meta.keyword.trim();
  if (!kw) return esc(text);
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return esc(text);
  const color = safeColor(state.meta.keywordColor, DEFAULT_META.keywordColor);
  return esc(text.slice(0, idx)) +
    `<span class="kw" style="--kw-color:${color}">${esc(text.slice(idx, idx + kw.length))}</span>` +
    esc(text.slice(idx + kw.length));
}

function metaLine(item) {
  if (state.hideMeta) return '';
  // Seu vídeo mostra canal igual aos demais (camuflagem total no feed)
  return `<p class="card-channel">${esc(item.channel)}</p>
          <p class="card-sub"><span>${esc(item.views)}</span><span>•</span><span>${esc(item.age)}</span></p>`;
}

const ICON = {
  more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5 19 12 8 18.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3c0 4.8-7.5 9.4-7.5 9.4z"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M4 19h16"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
};

function thumbShell(item, extraClass = '') {
  const fb = item.fb != null
    ? ` data-fb="${item.fb}" onerror="thumbErrorHandler(this)"`
    : item.userFb
      ? ` onerror="userThumbErrorHandler(this)"`
      : '';
  return `<div class="thumb-shell ${extraClass}">
      <img src="${item.thumb}" alt="${esc(item.title)}" loading="lazy" data-lightbox="${item.thumb}" tabindex="0" role="button" aria-label="Ampliar thumbnail: ${esc(item.title)}"${fb} />
      ${state.hideTitle ? '' : `<span class="badge-dur">${esc(item.duration)}</span>`}
      <div class="thumb-tools">
        <button class="round-tool" title="Ver imagem" data-action="zoom" data-src="${item.thumb}">${ICON.expand}</button>
      </div>
    </div>`;
}

function videoCard(item) {
  const dim = state.dimNeighbors && !item.own ? 'dim' : '';
  // Sem classe "own": o vídeo do usuário se mistura aos demais (sem destaque visual).
  // A classe "reveal-own" só aparece com a tecla R (revelar posição).
  const own = item.own && state.revealOwn ? 'reveal-own' : '';
  // Com "Escala real", a thumb do usuário é limitada aos px exibidos pelo YouTube.
  const w = item.own && state.trueScale ? realThumbWidth(state.tab, state.device) : null;
  const scale = w ? ` style="--own-w:${w}px"` : '';
  const scaleTag = w ? `<span class="scale-tag">${w}px reais</span>` : '';
  return `<article class="card ${own} ${dim}${w ? ' true-scale' : ''}" data-id="${item.id}"${scale}>
      ${thumbShell(item, 'own-thumb')}
      ${scaleTag}
      <div class="card-body">
        <div class="card-avatar">${esc(initials(item.channel))}</div>
        <div class="card-meta">
          ${state.hideTitle ? '' : `<h3 class="card-title">${titleHTML(item.title)}</h3>`}
          ${metaLine(item)}
        </div>
        <button class="icon-btn round-tool-ghost" data-action="more" title="Menu">${ICON.more}</button>
      </div>
    </article>`;
}

function shortCard(item) {
  const own = item.own && state.revealOwn ? 'reveal-own' : '';
  const dim = state.dimNeighbors && !item.own ? 'dim' : '';
  const fb = item.fb != null ? ` data-fb="${item.fb}" onerror="thumbErrorHandler(this)"` : '';
  return `<article class="short-card ${own} ${dim}" data-id="${item.id}">
      <div class="short-thumb short-thumb--fit" data-lightbox="${item.thumb}">
        <img class="short-bg" src="${item.thumb}" alt="" aria-hidden="true" loading="lazy" />
        <img class="short-fg" src="${item.thumb}" alt="${esc(item.title)}" loading="lazy"${fb} />
        <div class="short-tools">
          <button class="round-tool" data-action="zoom" data-src="${item.thumb}" title="Ver imagem">${ICON.expand}</button>
          <button class="round-tool" data-action="more" title="Menu">${ICON.more}</button>
        </div>
        ${state.hideTitle ? '' : `<div class="short-overlay">${esc(item.shortTitle || item.title)}</div>`}
      </div>
      ${state.hideTitle ? '' : `<h3 class="short-title">${titleHTML(item.title)}</h3>`}
      ${state.hideMeta ? '' : `<p class="short-views">${esc(item.views)}</p>`}
    </article>`;
}
/* ----------------------------- VIEW: HOME ----------------------------- */
function viewHome() {
  const list = orderedFeed();
  const kicker = state.chipLabel ? `<p><b>${esc(state.chipLabel)}</b> — simulação do feed inicial</p>` : '<p>Simulação do feed inicial do YouTube</p>';
  return `
    <div class="view-head">
      <div><h1>Home — feed inicial</h1>${kicker}</div>
      <span class="view-badge"><i></i>${list.length} vídeos · ${esc(deviceLabel())}</span>
    </div>
    <div class="grid" style="--card-min:${cardMin()}px">
      ${list.map(videoCard).join('')}
    </div>`;
}

/* ----------------------------- VIEW: SHORTS ----------------------------- */
function viewShorts() {
  // Shorts de verdade: grade cheia 9:16.
  const arr = orderedFeed().slice(0, 16);
  return `
    <div class="shorts-head">
      <span class="shorts-logo">${ICON.play}</span>
      <h1>Shorts</h1>
      <span class="view-badge"><i></i>formato 9:16</span>
    </div>
    <div class="shorts-grid" style="--short-min:${shortMin()}px">
      ${arr.map((item) => shortCard({ ...item, shortTitle: item.own ? state.meta.shortTitle : item.shortTitle })).join('')}
    </div>`;
}

/* ----------------------------- VIEW: BUSCA ----------------------------- */
function viewSearch() {
  const q = state.query.trim() || 'thumbnail';
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tokens = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const all = orderedFeed();
  // Filtro real por texto (título/canal) + sempre inclui o vídeo do usuário.
  const rivals = all.filter((i) => !i.own);
  const scored = rivals.map((i) => {
    const hay = norm(i.title + ' ' + i.channel);
    let pts = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) pts += 3;
      else if (tok.length > 4 && hay.includes(tok.slice(0, 5))) pts += 1;
      else if (tok.endsWith('s') && hay.includes(tok.slice(0, -1))) pts += 2;
    }
    return { item: i, rel: tokens.length ? pts / (tokens.length * 3) : 1 };
  }).sort((x, y) => y.rel - x.rel);
  const strong = scored.filter((r) => r.rel >= 0.34);
  const base = (strong.length >= 4 ? strong : scored).slice(0, 11).map((r) => r.item);
  const results = base.slice();
  const ownIdx = clamp(USER_POS, 0, results.length);
  results.splice(ownIdx, 0, userItem());
  const exact = strong.length;
  const relevanceNote = exact
    ? `Filtro aplicado: <b>${esc(q)}</b> · ${exact} resultado(s) por correspondência de texto`
    : `Filtro aplicado: <b>${esc(q)}</b> · nenhuma correspondência exata — exibindo resultados aproximados`;
  return `
    <div class="view-head">
      <div><h1>Resultados de busca</h1><p>Como seu vídeo aparece quando alguém pesquisa</p></div>
      <span class="view-badge"><i></i>${results.length} resultados</span>
    </div>
    <div class="search-query-note">${relevanceNote}</div>
    <div class="results">
      ${results.map((item) => `
        <article class="result ${item.own && state.revealOwn ? 'reveal-own' : ''}">
          <div class="result-thumb" data-lightbox="${item.thumb}">
            <img src="${item.thumb}" alt="${esc(item.title)}" loading="lazy"${item.fb != null ? ` data-fb="${item.fb}" onerror="thumbErrorHandler(this)"` : ''} />
            ${state.hideTitle ? '' : `<span class="badge-dur">${esc(item.duration)}</span>`}
          </div>
          <div class="result-info">
            ${state.hideTitle ? '' : `<h3 class="result-title">${titleHTML(item.title)}</h3>`}
            ${state.hideMeta ? '' : `<p class="result-sub">${esc(item.views)} • ${esc(item.age)}</p>`}
            <div class="result-channel">
              <div class="card-avatar">${esc(initials(item.channel))}</div>
              <span>${esc(item.channel)}</span>
            </div>
            ${state.hideMeta ? '' : `<p class="result-desc">Mostramos como ${esc(item.channel)} monta a estratégia de thumbnail: contraste, expressão, texto curto e testes A/B antes de publicar.</p>`}
          </div>
        </article>`).join('')}
    </div>`;
}

/* ----------------------------- VIEW: WATCH ----------------------------- */
function viewWatch() {
  const own = userItem();
  const recs = orderedFeed().filter((i) => !i.own).slice(0, 8);
  return `
    <div class="view-head">
      <div><h1>Página de reprodução</h1><p>Seu vídeo em destaque + recomendados ao lado</p></div>
      <span class="view-badge"><i></i>${esc(deviceLabel())}</span>
    </div>
    <div class="watch">
      <div>
        <div class="player">
          <img src="${own.thumb}" alt="player" onerror="userThumbErrorHandler(this)" />
          <div class="player-scrim"></div>
          <div class="player-center"><div class="pulse"><svg viewBox="0 0 24 24">${ICON.play.slice(12, -6)}</svg></div></div>
          <div class="player-bar">
            <svg viewBox="0 0 24 24"><path d="M8 5.5 19 12 8 18.5z"/></svg>
            <svg viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9H5z"/></svg>
            <span class="time">${esc(own.duration)}</span>
            <div class="track"></div>
            <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
          </div>
        </div>
        ${state.hideTitle ? '' : `<h2 class="watch-title">${titleHTML(own.title)}</h2>`}
        <div class="watch-row">
          <div class="watch-channel">
            <div class="card-avatar">${esc(initials(own.channel))}</div>
            <div><b>${esc(own.channel)}</b><small>128 mil inscritos</small></div>
            <button class="subscribe-btn">Inscrever-se</button>
          </div>
          <div class="watch-actions">
            <button class="pill">${ICON.heart} 4,2 mil</button>
            <button class="pill">Compartilhar</button>
            <button class="pill">${ICON.upload} Baixar</button>
          </div>
        </div>
        ${state.hideMeta ? '' : `<div class="watch-desc"><b>${esc(own.views)} • ${esc(own.age)}</b><br/>Neste vídeo eu mostro, passo a passo, como testo a thumbnail antes de publicar e quais ajustes mais impactam o clique.</div>`}
      </div>
      <div>
        <div class="rec-head"><span>Recomendados</span><span>${esc(deviceLabel())}</span></div>
        <div class="rec-list">
          ${recs.map((item) => `
            <article class="rec ${item.own && state.revealOwn ? 'reveal-own' : ''}">
              <div class="rec-thumb" data-lightbox="${item.thumb}">
                <img src="${item.thumb}" alt="${esc(item.title)}" loading="lazy"${item.fb != null ? ` data-fb="${item.fb}" onerror="thumbErrorHandler(this)"` : ''} />
                ${state.hideTitle ? '' : `<span class="badge-dur">${esc(item.duration)}</span>`}
              </div>
              <div>
                ${state.hideTitle ? '' : `<h4 class="rec-title">${titleHTML(item.title)}</h4>`}
                ${state.hideMeta ? '' : `<div class="rec-sub">${esc(item.channel)}</div><div class="rec-sub">${esc(item.views)} • ${esc(item.age)}</div>`}
              </div>
            </article>`).join('')}
        </div>
      </div>
    </div>`;
}
function ensureAB(a, b) {
  if (!a || !b || a.id === b.id) { state.compare = null; state.abLoading = false; return; }
  const cur = state.compare;
  if (cur && cur.aEntry === a.id && cur.bEntry === b.id) { state.abLoading = false; return; }
  state.abLoading = true;
  state.blind = null;
  Promise.all([analyzeThumb(a.src), analyzeThumb(b.src)]).then(([ra, rb]) => {
    const A = { score: ra.score, metrics: ra.metrics };
    const B = { score: rb.score, metrics: rb.metrics };
    state.compare = { a: A, b: B, aEntry: a.id, bEntry: b.id, winner: A.score === B.score ? 'empate' : (A.score > B.score ? 'A' : 'B') };
    state.abLoading = false;
    if (state.tab === 'compare') render(); else syncComparePanel();
  }).catch(() => { state.abLoading = false; });
}
function blindOrder(aId, bId) { return ((hashCode(aId + '|' + bId) % 2) + 2) % 2 === 0 ? ['A', 'B'] : ['B', 'A']; }
function runBlindVote(pick) {
  const lib = state.library;
  if (!lib.length || !state.abSel) return;
  const a = lib.find((x) => x.id === state.abSel.a) || lib[0];
  const b = lib.find((x) => x.id === state.abSel.b) || lib[1];
  state.blind = { order: blindOrder(a.id, b.id), pick, aId: a.id, bId: b.id };
  if (state.tab === 'compare') render(); else syncComparePanel();
}
/* ----------------------------- VIEW: COMPARAR A/B ----------------------------- */
function viewCompare() {
  const lib = state.library;
  if (lib.length < 2) {
    return `<div class="view-head"><div><h1>Comparar A/B</h1><p>Escolha dois candidatos para comparar lado a lado</p></div></div>
      ${emptyState('Envie pelo menos 2 thumbnails para comparar', 'Use o painel de controle (upload, colar ou URL) e volte aqui.')}`;
  }
  const selA = $('#selA') ? $('#selA').value : (state.abSel && state.abSel.a) || '';
  const selB = $('#selB') ? $('#selB').value : (state.abSel && state.abSel.b) || '';
  let a = lib.find((t) => t.id === selA) || lib[0];
  let b = lib.find((t) => t.id === selB) || lib[1];
  // Garante dois candidatos DIFERENTES (o comparador nunca deve apontar A e B
  // para a mesma thumbnail, senão o veredito e o teste cego somem).
  if (a.id === b.id) b = lib.find((t) => t.id !== a.id) || lib[1];
  if (a.id === b.id) a = lib[0];
  state.abSel = { a: a.id, b: b.id };
  ensureAB(a, b);
  return `
    <div class="view-head">
      <div><h1>Comparar A/B</h1><p>Duas versões, mesma posição de feed. Veja para qual seu olho vai primeiro.</p></div>
      <span class="view-badge"><i></i>${esc(deviceLabel())}</span>
    </div>
    <div class="ab-grid">
      ${abColumn('A', a, state.compare && state.compare.aEntry === a.id ? state.compare.a : null)}
      ${abColumn('B', b, state.compare && state.compare.bEntry === b.id ? state.compare.b : null)}
    </div>
    <div class="verdict" id="verdictBox">${verdictHTML()}</div>
    ${blindHTML()}
    <div style="margin-top:26px">
      <div class="view-head"><div><h1 style="font-size:17px">Os dois no mesmo feed</h1><p>Comparação de impacto dentro da grade</p></div></div>
      <div class="grid" style="--card-min:${cardMin()}px">
        ${videoCard(userItemFrom(a, 'A'))}
        ${videoCard(userItemFrom(b, 'B'))}
        ${orderedFeed().filter((i) => !i.own).slice(0, 6).map(videoCard).join('')}
      </div>
    </div>`;
}

function blindHTML() {
  const lib = state.library;
  if (lib.length < 2 || !state.abSel) return '';
  const a = lib.find((x) => x.id === state.abSel.a) || lib[0];
  const b = lib.find((x) => x.id === state.abSel.b) || lib[1];
  if (a.id === b.id) return '<p class="tiny">Escolha dois candidatos diferentes para o teste cego.</p>';
  const ok = state.blind && state.blind.aId === a.id && state.blind.bId === b.id;
  const order = ok ? state.blind.order : blindOrder(a.id, b.id);
  const pick = ok ? state.blind.pick : null;
  const byTag = { A: a, B: b };
  const left = byTag[order[0]];
  const right = byTag[order[1]];
  const verdict = pick
    ? (order[pick === 'left' ? 0 : 1] === (state.compare ? state.compare.winner : null)
        ? 'Seu olho concordou com o algoritmo. Boa consistencia.'
        : 'Seu olho discordou do algoritmo — confie no seu instinto e no contexto do nicho.')
    : 'Clique na thumb que te puxa primeiro — sem ver os rotulos A/B.';
  return `<div class="blind-box">
      <div class="view-head"><div><h1 style="font-size:17px">Teste cego</h1><p>${verdict}</p></div>
      ${pick ? `<button class="mini-btn" data-action="blind-retry" style="max-width:170px">Embaralhar de novo</button>` : ''}</div>
      <div class="blind-grid">
        <button class="blind-card" data-action="blind-pick" data-pick="left" aria-label="Escolher thumbnail da esquerda">
          <img src="${left.src}" alt="Candidato oculto 1" onerror="userThumbErrorHandler(this)" />
          <span class="blind-tag">${pick ? ('Era a versao ' + order[0]) : 'Opcao 1'}</span>
        </button>
        <button class="blind-card" data-action="blind-pick" data-pick="right" aria-label="Escolher thumbnail da direita">
          <img src="${right.src}" alt="Candidato oculto 2" onerror="userThumbErrorHandler(this)" />
          <span class="blind-tag">${pick ? ('Era a versao ' + order[1]) : 'Opcao 2'}</span>
        </button>
      </div>
    </div>`;
}
function userItemFrom(entry, tag) {
  return {
    kind: 'video', id: 'ab-' + tag + entry.id, own: true,
    title: (entry.title || state.meta.title) + ` (${tag})`,
    channel: state.meta.channel, views: state.meta.views,
    age: state.meta.age, duration: state.meta.duration,
    thumb: entry.src
  };
}

function abColumn(tag, entry, analysis) {
  const isWinner = state.compare && state.compare.winner === tag;
  const score = analysis ? analysis.score : '--';
  const metrics = analysis ? analysis.metrics : [];
  return `<div class="ab-col">
    <h3>Versão ${tag} ${isWinner ? '<span class="tag" style="color:#2ecc71">VENCEDORA</span>' : `<span class="tag">score ${score}</span>`}</h3>
    <div class="ab-card ${isWinner ? 'ab-winner' : ''}">
      <div class="ab-thumb" data-lightbox="${entry.src}"><img src="${entry.src}" alt="Candidato ${tag}" onerror="userThumbErrorHandler(this)" /></div>
      ${state.hideTitle ? '' : `<h4 class="card-title" style="font-size:14px">${titleHTML((entry.title || state.meta.title) + ` (${tag})`)}</h4>`}
      <div class="ab-metrics">
        ${metrics.map((m) => `<div class="row"><span>${m.label}</span><b>${Math.round(m.value * 100)}</b></div>`).join('') || '<div class="row"><span class="ab-loading">Analisando thumbnail…</span></div>'}
      </div>
      <div class="tile-actions" style="display:flex;gap:8px;margin-top:12px">
        <button class="mini-btn" data-action="use-thumb" data-id="${entry.id}">Usar como ativa</button>
        <button class="mini-btn primary" data-action="zoom" data-src="${entry.src}">Ampliar</button>
      </div>
    </div>
  </div>`;
}

function verdictHTML() {
  if (state.abLoading) return '<b>Analisando thumbnails…</b> o veredito aparece sozinho.';
  if (!state.compare) return '<button class="mini-btn primary" data-action="calc-ab" style="max-width:280px">Calcular vencedor agora</button>';
  const { a, b, winner } = state.compare;
  if (winner === 'empate') return '<b>Empate técnico.</b> As duas pontuaram igual — mude uma variável (texto, rosto, contraste) e compare de novo.';
  const win = winner === 'A' ? a : b;
  const lose = winner === 'A' ? b : a;
  const diff = Math.abs(a.score - b.score);
  const closer = diff <= 4
    ? 'A diferença é pequena — vale rodar um teste real antes de decidir.'
    : 'Vantagem clara desta versão nas métricas objetivas.';
  return `Vencedora: <b>Versão ${winner}</b> com <b>${win.score}/100</b> (a outra ficou em ${lose.score}). ${closer}`;
}
/* ----------------------------- VIEW: BIBLIOTECA ----------------------------- */
function viewLibrary() {
  const lib = state.library;
  if (!lib.length) {
    return `<div class="view-head"><div><h1>Minha biblioteca</h1><p>Suas thumbnails ficam salvas neste navegador</p></div></div>
      ${emptyState('Nenhuma thumbnail ainda', 'Arraste imagens para o painel de controle, cole da área de transferência ou informe uma URL do YouTube.')}`;
  }
  return `
    <div class="view-head">
      <div><h1>Minha biblioteca</h1><p>${lib.length} thumbnail(s) · salvas localmente</p></div>
      <span class="view-badge"><i></i>privado, offline</span>
    </div>
    <div class="lib-page">
      ${lib.map((t, i) => `
        <div class="tile">
          <img src="${t.src}" alt="${esc(t.title)}" data-lightbox="${t.src}" loading="lazy" onerror="userThumbErrorHandler(this)" />
          <div class="tile-body">
            <h4>${esc(t.title || 'Sem título ' + (i + 1))}</h4>
            <p class="tiny">${t.id === state.activeId ? '✅ em uso no preview' : 'Fora do preview'}</p>
            <div class="score-big"><span>${t.score ?? '--'}</span><span class="bar"><i style="width:${t.score ?? 0}%"></i></span></div>
            <div class="tile-actions">
              <button class="mini-btn primary" data-action="use-thumb" data-id="${t.id}">Usar</button>
              <button class="mini-btn" data-action="zoom" data-src="${t.src}">Ampliar</button>
              <button class="mini-btn" data-action="del-thumb" data-id="${t.id}">Remover</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

/* ----------------------------- VIEW: SCORE ----------------------------- */
function viewScore() {
  const active = state.library.find((t) => t.id === state.activeId) || state.library[0];
  if (!active) {
    return `<div class="view-head"><div><h1>Score de impacto</h1><p>Análise local da sua thumbnail</p></div></div>
      ${emptyState('Nenhuma thumbnail para analisar', 'Envie uma imagem para receber o score de 0 a 100 com métricas detalhadas.')}`;
  }
  const a = state.score || { score: 0, metrics: [], notes: ['Envie uma imagem para calcular.'] };
  return `
    <div class="view-head">
      <div><h1>Score de impacto</h1><p>Análise 100% local: brilho, contraste, cores, nitidez e composição</p></div>
      <span class="view-badge"><i></i>${a.score}/100</span>
    </div>
    <div class="ab-grid">
      <div>
        <div class="ab-thumb" data-lightbox="${active.src}" style="border-radius:14px"><img src="${active.src}" alt="thumb" onerror="userThumbErrorHandler(this)" /></div>
      </div>
      <div>
        <div class="score-wrap" style="margin-bottom:18px">
          <div class="score-ring ${ringClass(a.score)}">
            <svg viewBox="0 0 120 120">
              <circle class="ring-bg" cx="60" cy="60" r="52" />
              <circle class="ring-fg" cx="60" cy="60" r="52" style="stroke-dashoffset:${arcOffset(a.score)}" />
            </svg>
            <div class="score-center"><span>${a.score}</span><small>${gradeLabel(a.score)}</small></div>
          </div>
          <ul class="score-metrics">
            ${a.metrics.map((m) => `<li><span>${m.label}</span><span class="m-bar"><i style="width:${Math.round(m.value * 100)}%"></i></span><b>${Math.round(m.value * 100)}</b></li>`).join('')}
          </ul>
        </div>
        <div class="verdict">
          <b>Dicas automáticas</b>
          <ul style="margin:8px 0 0;padding-left:18px">${a.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        </div>
        <div style="margin-top:16px">
          <button class="solid-btn" data-action="export-report">Exportar relatório (PNG)</button>
        </div>
      </div>
    </div>`;
}

function emptyState(title, desc) {
  return `<div class="empty-state">
    ${ICON.upload}
    <h3>${esc(title)}</h3>
    <p>${esc(desc)}</p>
    <button class="solid-btn" data-action="open-dock">Abrir painel de controle</button>
  </div>`;
}
/* ----------------------------- HELPERS DE DEVICE ----------------------------- */
/* Tamanhos aproximados (px) com que o YouTube exibe thumbnails por contexto.
   Valores de referência do layout 2023–2025 (variam conforme a resolução);
   usados para simular a escala real de leitura da thumb. */
const YT_THUMB_SIZES = {
  home:   { desktop: [360, 202], mobile: [375, 211], tv: [480, 270] },
  search: { desktop: [360, 202], mobile: [160, 90],  tv: [360, 202] },
  watch:  { desktop: [168, 94],  mobile: [375, 211], tv: [480, 270] }, // player + "a seguir"
  shorts: { desktop: [160, 284], mobile: [220, 391], tv: [270, 480] }
};
/* Largura real (px) da thumb no contexto/dispositivo atual. */
function realThumbWidth(tab, device) {
  const t = YT_THUMB_SIZES[tab];
  if (!t) return null;
  const d = t[device] || t.desktop;
  return d[0];
}
function deviceLabel() {
  const base = { desktop: 'Desktop 1600px', mobile: 'Mobile 400px', tv: 'TV 1920px' }[state.device];
  const w = realThumbWidth(state.tab, state.device);
  return w ? `${base} · thumb exibida a ~${w}px` : base;
}
function cardMin() { return state.device === 'mobile' ? 148 : state.device === 'tv' ? 380 : 300; }
function shortMin() { return state.device === 'mobile' ? 128 : state.device === 'tv' ? 230 : 175; }
function ringClass(score) { return score >= 75 ? 'good' : score >= 50 ? 'mid' : ''; }
function arcOffset(score) { const C = 2 * Math.PI * 52; return C - (clamp(score, 0, 100) / 100) * C; }
function gradeLabel(score) {
  if (score >= 85) return 'excelente';
  if (score >= 70) return 'forte';
  if (score >= 55) return 'ok';
  if (score >= 40) return 'fraca';
  return 'critica';
}

/* Envolve o conteúdo da view no frame do device escolhido (desktop/mobile/tv) */
function wrapDevice(innerHTML) {
  if (state.device === 'mobile') {
    return `<div class="device-stage"><div class="device mobile">
        <span class="notch"></span>
        <div class="screen">${simBar()}${innerHTML}</div>
      </div></div>`;
  }
  if (state.device === 'tv') {
    return `<div class="device-stage"><div class="device tv">
        <div class="screen">${simBar()}${innerHTML}</div>
      </div></div>`;
  }
  return `<div class="device-stage"><div class="device desktop">
      <div class="device-bar"><i></i><i></i><i></i><span class="url">youtube.com — ${esc(tabLabel())}</span></div>
      <div class="device-inner">${innerHTML}</div>
    </div></div>`;
}
function tabLabel() {
  return { home: 'feed', shorts: 'shorts', search: 'resultados?search_query=' + encodeURIComponent(state.query), watch: 'watch', compare: 'comparar', library: 'biblioteca', score: 'score' }[state.tab] || '';
}
function simBar() {
  return `<div class="sim-bar">
    <span class="mini-logo">${ICON.play}</span>
    <span class="mini-search">${state.tab === 'search' ? 'Pesquisar: ' + esc(state.query) : 'Pesquisar'}</span>
  </div>`;
}

/* ----------------------------- RENDER PRINCIPAL ----------------------------- */
function render() {
  FEED = FEED.length ? FEED : buildFeed(0);

  let inner = '';
  if (state.tab === 'home') inner = viewHome();
  else if (state.tab === 'shorts') inner = viewShorts();
  else if (state.tab === 'search') inner = viewSearch();
  else if (state.tab === 'watch') inner = viewWatch();
  else if (state.tab === 'compare') inner = viewCompare();
  else if (state.tab === 'library') inner = viewLibrary();
  else if (state.tab === 'score') inner = viewScore();

  $('#viewRoot').innerHTML = wrapDevice(inner);
  document.body.classList.toggle('isolate', state.isolate);
  renderChips();
  renderLibrary();
  renderScorePanel();
  syncSelects();
  bindViewEvents();
}

function renderChips() {
  const chips = $('#chips');
  const showChips = state.tab === 'home';
  chips.classList.toggle('hidden', !showChips);
  if (!showChips) return;
  chips.innerHTML = CHIPS.map((c) =>
    `<button class="chip ${c === state.chip ? 'active' : ''}" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
}

/* Delegação de eventos para elementos dentro da view renderizada */
function bindViewEvents() {
  const root = $('#viewRoot');
  root.onclick = (e) => {
    const act = e.target.closest('[data-action]');
    if (act) {
      const a = act.dataset.action;
      if (a === 'zoom') openLightbox(act.dataset.src);
      else if (a === 'calc-ab') {
        const lib = state.library;
        const x = lib.find((y) => y.id === (state.abSel && state.abSel.a)) || lib[0];
        const y = lib.find((y) => y.id === (state.abSel && state.abSel.b)) || lib[1];
        if (x && y && x.id !== y.id) { state.compare = null; ensureAB(x, y); render(); }
        return;
      }
      else if (a === 'blind-pick') { runBlindVote(act.dataset.pick === 'right' ? 'right' : 'left'); return; }
      else if (a === 'blind-retry') { state.blind = null; if (state.tab === 'compare') render(); else syncComparePanel(); return; }
      else if (a === 'more') toast('Menu do vídeo é apenas decorativo nesta simulação.');
      else if (a === 'use-thumb') setActive(act.dataset.id);
      else if (a === 'del-thumb') removeThumb(act.dataset.id);
      else if (a === 'open-dock') toggleDock(true);
      else if (a === 'export-report') exportReport();
      return;
    }
    const zoomTarget = e.target.closest('[data-lightbox]');
    if (zoomTarget && !e.target.closest('[data-action]')) openLightbox(zoomTarget.dataset.lightbox);
  };
  // Ativação por teclado (Enter/Espaço) dos alvos de lightbox
  root.onkeydown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const zoomTarget = e.target.closest('[data-lightbox]');
    if (!zoomTarget || e.target.closest('[data-action]')) return;
    e.preventDefault();
    openLightbox(zoomTarget.dataset.lightbox);
  };
}

let _lightboxReturnFocus = null;
function openLightbox(src) {
  if (!src) return;
  const lb = $('#lightbox');
  $('#lightboxImg').src = src;
  lb.classList.add('open');
  // Acessibilidade: guarda o foco atual e move o foco para o diálogo.
  _lightboxReturnFocus = document.activeElement;
  lb.setAttribute('tabindex', '-1');
  lb.focus();
}

function closeLightbox() {
  const lb = $('#lightbox');
  if (!lb.classList.contains('open')) return;
  lb.classList.remove('open');
  if (_lightboxReturnFocus && typeof _lightboxReturnFocus.focus === 'function') {
    _lightboxReturnFocus.focus();
  }
  _lightboxReturnFocus = null;
}
/* Mensagem amigável para falhas na análise (CORS vs. imagem inválida). */
function scoreErrorMessage(res) {
  if (!res || res.error === 'load') return 'Não foi possível carregar a imagem para análise. Envie o arquivo em vez da URL.';
  if (res.error === 'cors') return 'A imagem externa não permite leitura de pixels (CORS). Envie o arquivo para analisar.';
  return '';
}

/* ----------------------------- PAINEL DE SCORE ----------------------------- */
async function refreshScore() {
  const active = state.library.find((t) => t.id === state.activeId) || state.library[0];
  if (!active) { state.score = null; renderScorePanel(); return; }
  const res = await analyzeThumb(active.src);
  state.score = res && res.score != null ? res : null;
  state.scoreError = res && res.score == null ? scoreErrorMessage(res) : '';
  active.score = res && res.score != null ? res.score : null;
  renderScorePanel();
  saveLibrary();
  if (state.tab === 'score' || state.tab === 'library') render();
}

function renderScorePanel() {
  const val = $('#scoreValue'), grade = $('#scoreGrade'), ring = $('#scoreRing'), arc = $('#scoreArc');
  const list = $('#scoreMetrics');
  const a = state.score;
  if (!a) {
    val.textContent = '--';
    grade.textContent = state.scoreError ? 'indisponível' : 'sem thumb';
    arc.style.strokeDashoffset = 327;
    ring.className = 'score-ring';
    list.innerHTML = state.scoreError
      ? `<li class="score-error">${esc(state.scoreError)}</li>`
      : '';
    return;
  }
  val.textContent = a.score;
  grade.textContent = gradeLabel(a.score);
  ring.className = 'score-ring ' + ringClass(a.score);
  arc.style.strokeDashoffset = arcOffset(a.score);
  list.innerHTML = a.metrics.map((m) =>
    `<li>${m.label}<span class="m-bar"><i style="width:${Math.round(m.value * 100)}%"></i></span><b>${Math.round(m.value * 100)}</b></li>`).join('');
}

/* ----------------------------- EXPORTAR RELATÓRIO ----------------------------- */
/* Gera um PNG (1200×675 aprox.) com a thumbnail + score + métricas + dicas,
   tudo desenhado em canvas (100% local, sem servidor). Dispara o download. */
async function exportReport() {
  const active = state.library.find((t) => t.id === state.activeId) || state.library[0];
  if (!active) { toast('Envie uma thumbnail antes de exportar.', 'warn'); return; }
  toast('Gerando relatório…');

  const a = state.score || await analyzeThumb(active.src);
  if (!a || a.score == null) { toast('Não foi possível analisar para o relatório.', 'warn'); return; }

  try {
    const W = 1200, H = 760;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    // Fundo
    g.fillStyle = '#0f0f0f';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff2b55';
    g.fillRect(0, 0, W, 8);

    // Cabeçalho
    g.fillStyle = '#f1f1f1';
    g.font = '700 34px Roboto, Arial, sans-serif';
    g.textAlign = 'left';
    g.fillText('Ferick Thumb Lab — Relatório de impacto', 48, 72);
    g.fillStyle = '#909090';
    g.font = '400 16px Roboto, Arial, sans-serif';
    g.fillText(new Date().toLocaleString('pt-BR'), 48, 100);

    // Thumbnail (16:9)
    const img = await loadImage(active.src).catch(() => null);
    const tw = 520, th = 292, tx = 48, ty = 140;
    g.fillStyle = '#1c1c1c';
    g.fillRect(tx, ty, tw, th);
    if (img) {
      g.save();
      g.beginPath(); g.rect(tx, ty, tw, th); g.clip();
      drawCover(g, img, tx, ty, tw, th);
      g.restore();
    }
    g.strokeStyle = 'rgba(255,255,255,.12)';
    g.lineWidth = 2;
    g.strokeRect(tx + 1, ty + 1, tw - 2, th - 2);

    g.fillStyle = '#f1f1f1';
    g.font = '600 20px Roboto, Arial, sans-serif';
    g.fillText(truncate(g, (active.title || 'Thumbnail'), tw), tx, ty + th + 40);
    g.fillStyle = '#909090';
    g.font = '400 15px Roboto, Arial, sans-serif';
    g.fillText(truncate(g, (state.meta.channel || 'Seu canal') + ' · ' + (state.meta.title || ''), tw), tx, ty + th + 66);

    // Score grande
    const sx = 640;
    g.fillStyle = ringColor(a.score);
    g.font = '800 96px Roboto, Arial, sans-serif';
    g.fillText(String(a.score), sx, ty + 96);
    g.fillStyle = '#f1f1f1';
    g.font = '600 22px Roboto, Arial, sans-serif';
    g.fillText(gradeLabel(a.score), sx, ty + 136);

    // Métricas com barras
    let my = ty + 180;
    g.font = '500 16px Roboto, Arial, sans-serif';
    a.metrics.forEach((m) => {
      const val = Math.round(m.value * 100);
      g.fillStyle = '#aaaaaa';
      g.textAlign = 'left';
      g.fillText(m.label, sx, my);
      // barra
      const barX = sx + 180, barW = 300;
      g.fillStyle = '#303030';
      g.fillRect(barX, my - 13, barW, 14);
      g.fillStyle = ringColor(val);
      g.fillRect(barX, my - 13, barW * (val / 100), 14);
      g.fillStyle = '#f1f1f1';
      g.textAlign = 'right';
      g.fillText(String(val), barX + barW + 40, my);
      g.textAlign = 'left';
      my += 44;
    });

    // Dicas
    let dy = ty + th + 120;
    g.fillStyle = '#f1f1f1';
    g.font = '600 18px Roboto, Arial, sans-serif';
    g.fillText('Dicas automáticas', 48, dy);
    g.font = '400 15px Roboto, Arial, sans-serif';
    g.fillStyle = '#aaaaaa';
    (a.notes || []).slice(0, 6).forEach((n) => {
      dy += 26;
      if (dy < H - 40) g.fillText('• ' + n, 56, dy);
    });

    // Rodapé
    g.fillStyle = '#717171';
    g.font = '400 13px Roboto, Arial, sans-serif';
    g.fillText('Análise 100% local — nenhum dado sai do seu navegador.', 48, H - 28);

    // Download
    const url = c.toDataURL('image/png');
    triggerDownload(url, `ferick-relatorio-${a.score}.png`);
    toast('Relatório PNG exportado.', 'good');
  } catch (err) {
    toast('Falha ao gerar o relatório.', 'warn');
  }
}

/* Carrega uma imagem (data:, http:, file:) como Promise. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    if (!src.startsWith('data:')) im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

/* Desenha a imagem cobrindo a área (object-fit: cover). */
function drawCover(g, img, x, y, w, h) {
  const ir = img.width / img.height, tr = w / h;
  let sw, sh, sx, sy;
  if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function ringColor(score) {
  return score >= 75 ? '#2ecc71' : score >= 50 ? '#f5a623' : '#ff2b55';
}

function truncate(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

/* Dispara o download de um data URL. */
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ----------------------------- BIBLIOTECA / UPLOAD ----------------------------- */
// Nota: makeRivalThumb (canvas) continua disponível como gerador de fallback
// e é usado pelo botão "Carregar demo" para criar variações A/B sintéticas.
/* Fallback para imagens do usuário (URL externa quebrada ou sem permissão).
   Substitui por um placeholder gerado no canvas — evita ícone de imagem quebrada. */
// eslint-disable-next-line no-unused-vars
function userThumbErrorHandler(img) {
  if (!img || img.dataset.fbDone) return;
  img.dataset.fbDone = '1';
  try { img.src = makePlaceholderThumb(); } catch (err) { /* sem canvas: mantém alt */ }
}

function renderLibrary() {
  const box = $('#library');
  if (!state.library.length) {
    box.innerHTML = '<p class="lib-empty">Nenhuma thumbnail ainda.</p>';
    return;
  }
  box.innerHTML = state.library.map((t) => `
    <div class="lib-item ${t.id === state.activeId ? 'active' : ''}" data-id="${t.id}" title="${esc(t.title || 'thumb')}">
      <img src="${t.src}" alt="${esc(t.title)}" loading="lazy" onerror="userThumbErrorHandler(this)" />
      <button class="lib-del" data-del="${t.id}" title="Remover">${ICON.close}</button>
    </div>`).join('');
}

function addThumb(src, meta = {}) {
  const id = uid();
  const entry = {
    id, src,
    title: meta.title || state.meta.title,
    channel: meta.channel || state.meta.channel,
    views: meta.views || state.meta.views,
    age: meta.age || state.meta.age,
    duration: meta.duration || state.meta.duration,
    score: null
  };
  state.library.unshift(entry);
  setActive(id, true);
  return entry;
}

function setActive(id, skipRender) {
  if (!state.library.some((t) => t.id === id)) return;
  state.activeId = id;
  saveLibrary();
  refreshScore();
  if (!skipRender) render(); else renderLibrary();
}

function removeThumb(id) {
  const removed = state.library.find((t) => t.id === id);
  if (removed) invalidateScore(removed.src);
  state.library = state.library.filter((t) => t.id !== id);
  if (state.activeId === id) state.activeId = state.library[0] ? state.library[0].id : null;
  saveLibrary();
  refreshScore();
  render();
  toast('Thumbnail removida.');
}

function applyMetaToLibrary() {
  const entry = state.library.find((t) => t.id === state.activeId);
  if (!entry) return;
  entry.title = state.meta.title;
  entry.channel = state.meta.channel;
  entry.views = state.meta.views;
  entry.age = state.meta.age;
  entry.duration = state.meta.duration;
  saveLibrary();
}

function syncSelects() {
  const opts = state.library.map((t, i) => `<option value="${t.id}">${esc(t.title || 'Thumb ' + (i + 1))}</option>`).join('');
  const a = $('#selA'), b = $('#selB');
  const prevA = a.value, prevB = b.value;
  a.innerHTML = opts || '<option value="">—</option>';
  b.innerHTML = opts || '<option value="">—</option>';
  if (state.library.some((t) => t.id === prevA)) a.value = prevA;
  if (state.library.some((t) => t.id === prevB)) b.value = prevB;
  if (!b.value && state.library[1]) b.value = state.library[1].id;
  if (state.abSel) {
    if (state.library.some((x) => x.id === state.abSel.a)) a.value = state.abSel.a;
    if (state.library.some((x) => x.id === state.abSel.b)) b.value = state.abSel.b;
  }
  // Nunca deixa A e B apontarem para a mesma thumbnail.
  if (state.library.length > 1 && a.value === b.value) {
    const other = state.library.find((x) => x.id !== a.value);
    if (other) b.value = other.id;
  }
  // Inicializa a seleção A/B com dois candidatos distintos.
  if (!state.abSel && state.library.length > 1) {
    state.abSel = { a: a.value || state.library[0].id, b: b.value || state.library[1].id };
  } else if (state.abSel) {
    state.abSel = { a: a.value, b: b.value };
  }
  syncComparePanel();
}
function syncComparePanel() {
  const box = $('#blindResult');
  if (!box) return;
  if (state.library.length < 2 || !state.abSel) { box.innerHTML = ''; return; }
  const lib = state.library;
  const a = lib.find((x) => x.id === state.abSel.a) || lib[0];
  const b = lib.find((x) => x.id === state.abSel.b) || lib[1];
  const c = state.compare && state.compare.aEntry === a.id && state.compare.bEntry === b.id ? state.compare : null;
  const line = c
    ? (c.winner === 'empate' ? `Empate tecnico: A ${c.a.score} x B ${c.b.score}` : `Vencedora: <b>${c.winner}</b> (A ${c.a.score} x B ${c.b.score})`)
    : (state.abLoading ? 'Analisando thumbnails...' : 'Comparando automaticamente...');
  const bl = state.blind && state.blind.pick ? `<br>Voto cego: Opcao ${state.blind.pick === 'left' ? '1' : '2'}` : '';
  box.innerHTML = line + bl;
}

/* ----------------------------- PERSISTÊNCIA ----------------------------- */
const STORE_KEY = 'ferick-thumb-lab-v1';

function saveLibrary() {
  const buildPayload = (list) => JSON.stringify({
    meta: state.meta,
    activeId: state.activeId,
    theme: state.theme,
    library: list.slice(0, 12).map((t) => ({ ...t }))
  });
  try {
    localStorage.setItem(STORE_KEY, buildPayload(state.library));
  } catch (err) {
    // QuotaExceededError: tenta salvar menos itens antes de desistir.
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      try {
        localStorage.setItem(STORE_KEY, buildPayload(state.library.slice(0, 4)));
        toast('Espaço local cheio: apenas as 4 thumbnails mais recentes foram salvas.', 'warn');
      } catch (err2) {
        toast('Não foi possível salvar no navegador (espaço cheio). Sua sessão continua ativa.', 'warn');
      }
    }
  }
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.meta) state.meta = { ...DEFAULT_META, ...data.meta };
    if (Array.isArray(data.library)) state.library = data.library;
    if (data.activeId) state.activeId = data.activeId;
    if (data.theme) state.theme = data.theme;
    return state.library.length > 0;
  } catch (err) { return false; }
}

/* ----------------------------- LEITURA DE ARQUIVOS ----------------------------- */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* Redimensiona/reencoda uma imagem para caber confortavelmente no localStorage.
   Mantém a proporção 16:9 e limita a largura a maxW. Se o canvas falhar,
   devolve o data URL original (nunca quebra o upload). */
function compressImage(dataURL, maxW = 1280) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        if (img.width <= maxW) return resolve(dataURL);
        const scale = maxW / img.width;
        const W = Math.round(img.width * scale);
        const H = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        if (!g) return resolve(dataURL);
        g.drawImage(img, 0, 0, W, H);
        const out = c.toDataURL('image/jpeg', 0.85);
        // Só usa a versão comprimida se ela for realmente menor.
        resolve(out && out.length < dataURL.length ? out : dataURL);
      } catch (err) { resolve(dataURL); }
    };
    img.onerror = () => resolve(dataURL);
    img.src = dataURL;
  });
}

async function handleFiles(files) {
  const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
  if (!imgs.length) { toast('Nenhuma imagem válida selecionada.', 'warn'); return; }
  if (imgs.length > 1) toast('Processando ' + imgs.length + ' imagens…');
  for (const f of imgs) {
    try {
      let url = await fileToDataURL(f);
      url = await compressImage(url, 1280);
      addThumb(url, { title: f.name.replace(/\.[^.]+$/, ''), duration: state.meta.duration });
    } catch (err) { toast('Falha ao ler ' + f.name, 'warn'); }
  }
  render();
  toast(imgs.length + ' thumbnail(s) adicionada(s).', 'good');
}

function addFromUrl() {
  const raw = $('#urlInput').value.trim();
  if (!raw) return;
  const vid = extractVideoId(raw);
  if (vid) {
    const url = ytThumb(vid);
    addThumb(url, { title: 'Thumbnail do YouTube ' + vid, duration: state.meta.duration });
    render();
    toast('Thumbnail do vídeo carregada.', 'good');
    $('#urlInput').value = '';
    return;
  }
  if (/^https?:\/\//.test(raw)) {
    addThumb(raw, { title: 'Imagem externa', duration: state.meta.duration });
    render();
    toast('Imagem adicionada por URL.', 'good');
    $('#urlInput').value = '';
    return;
  }
  toast('Informe um ID/URL do YouTube ou uma URL de imagem.', 'warn');
}
/* ----------------------------- TESTE CEGO ----------------------------- */
async function runBlindTest() {
  const lib = state.library;
  if (lib.length < 2) { toast('Envie ao menos 2 thumbnails.', 'warn'); return; }
  const a = lib.find((x) => x.id === (state.abSel && state.abSel.a)) || lib[0];
  const b = lib.find((x) => x.id === (state.abSel && state.abSel.b)) || lib[1];
  state.abSel = { a: a.id, b: b.id };
  state.blind = null;
  ensureAB(a, b);
  if (state.tab !== 'compare') { state.tab = 'compare'; syncHash('compare', false); document.body.classList.remove('dock-open'); }
  render();
  $$('.side-item').forEach((el) => el.classList.toggle('active', el.dataset.goto === 'compare'));
  syncComparePanel();
  const target = document.querySelector('.blind-box');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function computeCompare() {
  const lib = state.library;
  if (lib.length < 2) return;
  const a = lib.find((t) => t.id === ($('#selA') ? $('#selA').value : (state.abSel && state.abSel.a))) || lib[0];
  const b = lib.find((t) => t.id === ($('#selB') ? $('#selB').value : (state.abSel && state.abSel.b))) || lib[1];
  state.abSel = { a: a.id, b: b.id };
  state.abLoading = true;
  const ra = await analyzeThumb(a.src);
  const rb = await analyzeThumb(b.src);
  if (!ra || ra.score == null || !rb || rb.score == null) {
    const vb = $('#verdictBox');
    if (vb) vb.innerHTML = esc(scoreErrorMessage(ra && ra.score == null ? ra : rb) || 'Não foi possível analisar as imagens.');
    return;
  }
  state.compare = { a: ra, aEntry: a.id, b: rb, bEntry: b.id, winner: ra.score === rb.score ? 'empate' : (ra.score > rb.score ? 'A' : 'B') };
  state.abLoading = false;
  syncComparePanel();
  const vb = $('#verdictBox');
  if (vb) vb.innerHTML = verdictHTML();
  if (state.tab === 'compare') render();
}

/* ----------------------------- DEMO ----------------------------- */
function loadDemo() {
  const samples = [
    { bp: RIVAL_BLUEPRINTS[0], label: 'CLIQUE AQUI', title: 'Minha thumb principal — versão agressiva' },
    { bp: RIVAL_BLUEPRINTS[3], label: 'VERSÃO B', title: 'Variação B — mais limpa e colorida' },
  ];
  samples.forEach((s, i) => {
    addThumb(makeRivalThumb(s.bp, hashCode('demo' + i), s.label), {
      title: s.title, channel: state.meta.channel, duration: state.meta.duration
    });
  });
  render();
  toast('Demo carregada com 2 thumbnails de teste.', 'good');
}

/* ----------------------------- UI: ESTADO / TEMA ----------------------------- */
function applyTheme() {
  document.documentElement.classList.toggle('light', state.theme === 'light');
  document.documentElement.classList.toggle('dark', state.theme !== 'light');
  document.documentElement.style.colorScheme = state.theme === 'light' ? 'light' : 'dark';
  saveLibrary();
}

function toggleDock(open) {
  const on = open === undefined ? !document.body.classList.contains('dock-open') : open;
  document.body.classList.toggle('dock-open', on);
  const dock = $('#controlDock');
  const fab = $('#fabBtn');
  if (fab) fab.setAttribute('aria-expanded', on ? 'true' : 'false');
  if (dock) dock.setAttribute('aria-hidden', on ? 'false' : 'true');
  if (on) {
    // Move o foco para o painel (diálogo) e guarda o elemento de origem.
    _dockReturnFocus = document.activeElement;
    const first = dock.querySelector('button, [href], input, select, textarea');
    if (first) { try { first.focus(); } catch (err) { /* noop */ } }
  } else {
    // Devolve o foco ao FAB (ou a quem abriu) ao fechar.
    const target = (_dockReturnFocus && _dockReturnFocus.focus) ? _dockReturnFocus : $('#fabBtn');
    _dockReturnFocus = null;
    if (target) { try { target.focus(); } catch (err) { /* noop */ } }
  }
}
let _dockReturnFocus = null;

/* Anuncia a seleção dos segmentos (device/tabs) para leitores de tela. */
function syncSegAria() {
  $$('#segDevice button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === state.device ? 'true' : 'false'));
  $$('#segTabs button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === state.tab ? 'true' : 'false'));
}

function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

/* Sincroniza a aba atual com o hash da URL (#/home, #/score, #/search?q=…)
   para permitir compartilhar links e usar os botões voltar/avançar. */
const TAB_SLUGS = ['home', 'shorts', 'search', 'watch', 'compare', 'library', 'score'];
function tabFromHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const slug = raw.split('?')[0].split('/')[0];
  return TAB_SLUGS.includes(slug) ? slug : null;
}
/* Extrai o termo de busca (?q=…) do hash atual, se houver. */
function queryFromHash() {
  const raw = (location.hash || '');
  const q = raw.indexOf('?') >= 0 ? new URLSearchParams(raw.slice(raw.indexOf('?') + 1)).get('q') : null;
  return q ? q.slice(0, 80) : null;
}
/* Monta o hash de uma seção, incluindo a query da busca quando aplicável. */
function hashFor(section) {
  if (section === 'search') {
    const q = (state.query || '').trim();
    return q && q !== 'thumbnail' ? '#/search?q=' + encodeURIComponent(q) : '#/search';
  }
  return '#/' + section;
}
function syncHash(section, replace) {
  const next = hashFor(section);
  if (location.hash === next) return;
  try {
    if (replace) history.replaceState({ tab: section }, '', next);
    else history.pushState({ tab: section }, '', next);
  } catch (err) { /* ambientes sem history (file://) — ignora */ }
}

function goto(section, { push = true } = {}) {
  if (section === 'upload') { toggleDock(true); flashSection('#sec-upload'); return; }
  if (!TAB_SLUGS.includes(section)) return;
  state.tab = section;
  syncHash(section, !push);
  toggleDock(false); // fecha o painel e restaura aria/foco
  render();
  scrollTop();
  $$('.side-item').forEach((el) => el.classList.toggle('active', el.dataset.goto === section));
  syncSegAria();
}

function flashSection(sel) {
  const el = $(sel);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('highlight');
  void el.offsetWidth;
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 1300);
}

function updateMeta(key, value) {
  state.meta[key] = value;
  applyMetaToLibrary();
}

function resetAll() {
  localStorage.removeItem(STORE_KEY);
  state.meta = { ...DEFAULT_META };
  state.library = [];
  state.activeId = null;
  state.score = null;
  state.compare = null;
  state.chip = 'Todos';
  state.chipLabel = '';
  state.tab = 'home';
  state.device = 'desktop';
  state.theme = 'dark';
  state.hideTitle = false;
  state.hideMeta = false;
  state.dimNeighbors = false;
  state.isolate = false;
  state.trueScale = false;
  state.revealOwn = false;
  FEED = buildFeed(0);
  syncFormFromState();
  applyTheme();
  render();
  toast('Padrões restaurados.');
}
/* ----------------------------- UI: SINCRONIZAÇÃO DO FORM ----------------------------- */
function syncFormFromState() {
  $('#fTitle').value = state.meta.title;
  $('#fChannel').value = state.meta.channel;
  $('#fViews').value = state.meta.views;
  $('#fAge').value = state.meta.age;
  $('#fDuration').value = state.meta.duration;
  $('#fShortTitle').value = state.meta.shortTitle;
  $('#fKeyword').value = state.meta.keyword;
  $('#fKeywordColor').value = state.meta.keywordColor;
  $('#fTitleScale').value = state.meta.titleScale;
  $('#titleScaleVal').textContent = state.meta.titleScale + '%';
  $('#tHideTitle').checked = state.hideTitle;
  $('#tHideMeta').checked = state.hideMeta;
  $('#tDimNeighbors').checked = state.dimNeighbors;
  $('#tIsolate').checked = state.isolate;
  $('#tTrueScale').checked = state.trueScale;
  document.documentElement.style.setProperty('--title-size', (15 * state.meta.titleScale / 100).toFixed(2) + 'px');
  $$('#segDevice button').forEach((b) => b.classList.toggle('active', b.dataset.val === state.device));
  $$('#segTabs button').forEach((b) => b.classList.toggle('active', b.dataset.val === state.tab));
}

/* Atualiza só a grade, preservando o scroll (evita "pulo" ao digitar) */
function renderPreviewOnly() {
  if (['home', 'shorts', 'search', 'watch'].includes(state.tab)) {
    const scroll = window.scrollY;
    render();
    window.scrollTo({ top: scroll });
  }
}

/* ----------------------------- UI: LISTENERS ----------------------------- */
function bindUI() {
  $('#themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
  });

  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('no-sidebar'));

  $$('[data-goto]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    goto(el.dataset.goto);
  }));

  const doSearch = () => {
    state.query = $('#searchInput').value.trim() || 'thumbnail';
    state.tab = 'search';
    syncHash('search', false);
    render();
    scrollTop();
  };
  $('#searchBtn').addEventListener('click', doSearch);
  $('#searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  $('#searchInput').addEventListener('input', (e) => {
    $('#searchClear').classList.toggle('show', !!e.target.value);
  });
  $('#searchClear').addEventListener('click', () => {
    $('#searchInput').value = '';
    $('#searchClear').classList.remove('show');
    $('#searchInput').focus();
  });

  $('#shuffleBtn').addEventListener('click', () => {
    FEED = buildFeed(Math.floor(Math.random() * 9999));
    rerollUserPosition();
    render();
    toast('Feed embaralhado (posição do seu vídeo mudou).');
  });

  $('#resetBtn').addEventListener('click', resetAll);

  $('#fabBtn').addEventListener('click', () => toggleDock(true));
  $('#dockClose').addEventListener('click', () => toggleDock(false));

  const metaMap = {
    fTitle: 'title', fChannel: 'channel', fViews: 'views', fAge: 'age',
    fDuration: 'duration', fShortTitle: 'shortTitle', fKeyword: 'keyword', fKeywordColor: 'keywordColor'
  };
  Object.entries(metaMap).forEach(([id, key]) => {
    $('#' + id).addEventListener('input', (e) => { updateMeta(key, e.target.value); renderPreviewOnly(); });
  });
  $('#fTitleScale').addEventListener('input', (e) => {
    updateMeta('titleScale', Number(e.target.value));
    $('#titleScaleVal').textContent = e.target.value + '%';
    document.documentElement.style.setProperty('--title-size', (15 * e.target.value / 100).toFixed(2) + 'px');
    renderPreviewOnly();
  });

  $('#tHideTitle').addEventListener('change', (e) => { state.hideTitle = e.target.checked; renderPreviewOnly(); });
  $('#tHideMeta').addEventListener('change', (e) => { state.hideMeta = e.target.checked; renderPreviewOnly(); });
  $('#tDimNeighbors').addEventListener('change', (e) => { state.dimNeighbors = e.target.checked; renderPreviewOnly(); });
  $('#tIsolate').addEventListener('change', (e) => { state.isolate = e.target.checked; render(); });
  $('#tTrueScale').addEventListener('change', (e) => {
    state.trueScale = e.target.checked;
    renderPreviewOnly();
    if (state.trueScale) {
      const w = realThumbWidth(state.tab, state.device);
      if (w) toast(`Modo escala real: sua thumb exibida a ~${w}px (como no YouTube).`);
    }
  });

  $('#segDevice').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.device = b.dataset.val;
    $$('#segDevice button').forEach((x) => x.classList.toggle('active', x === b));
    syncSegAria();
    render();
  });
  $('#segTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.tab = b.dataset.val;
    syncHash(state.tab, false);
    $$('#segTabs button').forEach((x) => x.classList.toggle('active', x === b));
    syncSegAria();
    render();
    scrollTop();
  });

  // Filtro de chips (categorias) — o container #chips fica fora de #viewRoot,
  // por isso o handler é delegado aqui, não em bindViewEvents.
  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.chip = chip.dataset.chip;
    state.chipLabel = state.chip === 'Todos' ? '' : state.chip;
    render();
    const n = $$('#viewRoot .card').length;
    toast(state.chip === 'Todos' ? 'Mostrando todos os vídeos.' : `Filtrando por “${state.chip}” (${n} vídeos).`);
  });

  bindUploadUI();
  bindCompareUI();
  bindKeyboardAndPaste();
}

/* ----------------------------- UPLOAD ----------------------------- */
function bindUploadUI() {
  const dz = $('#dropzone');
  $('#fileInput').addEventListener('change', (e) => {
    if (e.target.files.length) handleFiles(e.target.files);
    e.target.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  // Soltar imagens em qualquer lugar da página (overlay de página inteira)
  const overlay = $('#dropOverlay');
  let dragDepth = 0;
  const hasFiles = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    if (overlay) overlay.classList.add('show');
  });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0 && overlay) overlay.classList.remove('show');
  });
  window.addEventListener('drop', (e) => {
    dragDepth = 0;
    if (overlay) overlay.classList.remove('show');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    }
  });

  $('#urlAddBtn').addEventListener('click', addFromUrl);
  $('#urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addFromUrl(); });

  $('#demoBtn').addEventListener('click', loadDemo);

  // Clique numa miniatura da biblioteca = torna ela a thumbnail ATIVA no preview.
  // Delegação no container (persiste entre re-renderizações do grid).
  $('#library').addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      e.stopPropagation();
      removeThumb(delBtn.dataset.del);
      return;
    }
    const item = e.target.closest('.lib-item');
    if (item && item.dataset.id) setActive(item.dataset.id);
  });

  $('#clearBtn').addEventListener('click', () => {
    if (!state.library.length) { toast('Não há thumbnails para limpar.'); return; }
    state.library = [];
    state.activeId = null;
    state.score = null;
    state.compare = null;
    saveLibrary();
    render();
    toast('Biblioteca limpa.');
  });
}

/* ----------------------------- COMPARAR A/B ----------------------------- */
function bindCompareUI() {
  $('#selA').addEventListener('change', computeCompare);
  $('#selB').addEventListener('change', computeCompare);
  $('#blindBtn').addEventListener('click', runBlindTest);
}


/* ----------------------------- COLAR / TECLADO / LIGHTBOX / SCROLL ----------------------------- */
function bindKeyboardAndPaste() {
  // Lightbox
  $('#lightbox').addEventListener('click', closeLightbox);

  // Colar imagem ou link do YouTube
  document.addEventListener('paste', (e) => {
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    const imgItem = items.find((it) => it.type && it.type.startsWith('image/'));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) {
        handleFiles([file]);
        toggleDock(true);
        flashSection('#sec-upload');
        return;
      }
    }
    const text = e.clipboardData && e.clipboardData.getData('text');
    const vid = text ? extractVideoId(text) : null;
    if (vid) {
      addThumb(ytThumb(vid), { title: 'Thumbnail do YouTube ' + vid });
      render();
      toggleDock(true);
      flashSection('#sec-upload');
      toast('Thumbnail colada do link.', 'good');
    }
  });

  // Sombra do topbar ao rolar
  window.addEventListener('scroll', () => {
    document.documentElement.classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });

  // Navegação por hash (voltar/avançar do navegador)
  window.addEventListener('popstate', () => {
    const tab = tabFromHash() || 'home';
    if (tab !== state.tab) goto(tab, { push: false });
  });

  // Focus trap: enquanto o painel está aberto, Tab circula só dentro dele.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (!document.body.classList.contains('dock-open')) return;
    const dock = $('#controlDock');
    if (!dock) return;
    const focusables = dock.querySelectorAll('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !dock.contains(active)) { e.preventDefault(); last.focus(); }
    } else if (active === last || !dock.contains(active)) { e.preventDefault(); first.focus(); }
  });

  // Atalhos: D=tema, P=painel, M=menu, S=embaralhar, R=revelar posição, Esc=lightbox
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'd') {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme();
      toast('Tema: ' + (state.theme === 'light' ? 'claro' : 'escuro'));
    } else if (k === 'p') {
      toggleDock();
    } else if (k === 'm') {
      document.body.classList.toggle('no-sidebar');
    } else if (k === 's') {
      FEED = buildFeed(Math.floor(Math.random() * 9999));
      rerollUserPosition();
      render();
      toast('Feed embaralhado (posição do seu vídeo mudou).');
    } else if (k === 'r') {
      state.revealOwn = !state.revealOwn;
      render();
      toast(state.revealOwn ? 'Revelando onde seu vídeo está…' : 'Posição oculta novamente.', state.revealOwn ? 'warn' : '');
    } else if (e.key === 'Escape') {
      closeLightbox();
      if (document.body.classList.contains('dock-open')) toggleDock(false);
    }
  });
}


/* ----------------------------- INIT ----------------------------- */
function init() {
  loadLibrary(); // restaura tema/meta/biblioteca persistidos (por efeito colateral)
  FEED = buildFeed(0);
  rerollUserPosition(); // sorteia onde o vídeo do usuário entra no feed
  const hasStoredPrefs = !!localStorage.getItem(STORE_KEY);

  // Aba inicial: o hash da URL (#/score, #/search?q=…) vale mesmo em navegação
  // anônima / primeira visita (compartilhamento de link deve funcionar sempre).
  const fromHash = tabFromHash();
  if (fromHash) state.tab = fromHash;
  const qFromHash = queryFromHash();
  if (qFromHash && state.tab === 'search') {
    state.query = qFromHash;
    $('#searchInput').value = qFromHash;
    $('#searchClear').classList.add('show');
  }

  // Tema inicial: respeita a preferência do sistema se o usuário nunca escolheu
  // (nenhuma escolha persistida no localStorage = primeira visita real).
  if (!hasStoredPrefs && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    state.theme = 'light';
  }

  applyTheme();
  syncFormFromState();
  bindUI();
  syncHash(state.tab, true);

  // Estado inicial dos segmentos (seguindo o estado real)
  $$('#segDevice button').forEach((b) => b.classList.toggle('active', b.dataset.val === state.device));
  $$('#segTabs button').forEach((b) => b.classList.toggle('active', b.dataset.val === state.tab));
  $$('.side-item').forEach((el) => el.classList.toggle('active', el.dataset.goto === state.tab));
  syncSegAria(); // anuncia a seleção dos segmentos para leitores de tela

  render();

  // Analisa a thumb ativa restaurada (se houver)
  if (state.activeId) refreshScore();

  // Mostra o dock automaticamente na primeira visita
  if (!hasStoredPrefs) {
    setTimeout(() => toggleDock(true), 500);
  }
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

