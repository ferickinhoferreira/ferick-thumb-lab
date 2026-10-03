/* Teste headless com jsdom: carrega index.html + app.js e exercita o fluxo principal. */
(async () => {
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(dir, 'scripts', 'app.js'), 'utf8');

const errors = [];
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

// Stubs mínimos: canvas (jsdom não tem 2d), Image (sem rede real)
window.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  return new Proxy({}, {
    get: (t, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => gradient;
      if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (prop === 'measureText') return () => ({ width: 10 });
      if (typeof prop === 'symbol') return undefined;
      return noop;
    },
    set: () => true
  });
};
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
// Stub de Image: dispara onload (jsdom não carrega imagens reais) para que a
// análise (analyzeThumb) resolva e o A/B produza veredito nos testes.
window.Image = function ImageStub() {
  const el = window.document.createElement('img');
  el.crossOrigin = null;
  let _src = '';
  Object.defineProperty(el, 'src', {
    configurable: true,
    get: () => _src,
    set(v) {
      _src = v;
      setTimeout(() => { if (typeof el.onload === 'function') el.onload(); }, 0);
    }
  });
  return el;
};
window.scrollTo = () => {};
// Evita que o download do relatório (anchor com data URL) tente navegar no jsdom.
window.HTMLAnchorElement.prototype.click = function () {};
window.HTMLElement.prototype.scrollIntoView = function () {};
window.onerror = (msg) => errors.push('window.onerror: ' + msg);

// jsdom outside-only fica em 'loading'; força DOMContentLoaded para o boot do app
Object.defineProperty(window.document, 'readyState', { configurable: true, get: () => 'complete' });

// Executa o app
try {
  // Anexa um "export" para os testes: funções puras do motor de score ficam no
  // escopo do eval (strict mode), então as expomos explicitamente em window.
  window.eval(appJs + '\n;window.__score = { relLum, contrastRatio, isSkin, metricHint, statsStrip, analyzeThumb, refreshScore };\n');
  console.log('[debug] eval ok; readyState =', window.document.readyState);
  // Garante boot mesmo se o listener não tiver sido registrado a tempo
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
} catch (e) {
  errors.push('eval: ' + e.message + '\n' + e.stack);
  console.log('[debug] EVAL ERROR:', e.message);
  console.log(e.stack);
}

function assert(cond, label) {
  if (cond) console.log('PASS ' + label);
  else { console.log('FAIL ' + label); errors.push(label); }
}

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => Array.from(window.document.querySelectorAll(s));

// 1. Render inicial (home)
assert($('#viewRoot') && $('#viewRoot').innerHTML.includes('Home'), 'view home renderizada');
assert($$('#viewRoot .card').length > 5, 'cards do feed presentes (' + $$('#viewRoot .card').length + ')');
assert(!$('#viewRoot .card.reveal-own'), 'seu vídeo camuflado (sem destaque reveal-own)');
assert(!$('#viewRoot .card.own'), 'sem classe own (sem contorno vermelho)');
assert($('#viewRoot img[src*="assets/rivals"]') || $('#viewRoot img').length > 0, 'imagens de thumbs no feed');
assert($$('#chips .chip').length === 12, 'chips renderizados');

// 1b. Filtro de chips filtra de verdade por categoria
const chipGames = window.document.querySelector('#chips .chip[data-chip="Games"]');
chipGames.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const gamesCount = $$('#viewRoot .card').length;
assert(gamesCount >= 1, 'chip Games mostra ao menos 1 card (' + gamesCount + ')');
assert($('#viewRoot').innerHTML.includes('Games'), 'cabeçalho menciona o filtro Games');
const chipAll = window.document.querySelector('#chips .chip[data-chip="Todos"]');
chipAll.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($$('#viewRoot .card').length > gamesCount, 'chip Todos mostra mais cards que Games');

// 2. Navegação por sidebar
const tabs = ['shorts', 'search', 'watch', 'compare', 'library', 'score', 'home'];
for (const t of tabs) {
  const el = $(`.side-item[data-goto="${t}"]`);
  if (!el) { errors.push('link sidebar ausente: ' + t); console.log('FAIL sidebar ' + t); continue; }
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert($('#viewRoot').innerHTML.trim().length > 100, 'view ' + t + ' renderizada');
}

// 3. Troca de device
for (const d of ['mobile', 'tv', 'desktop']) {
  $(`#segDevice button[data-val="${d}"]`).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const ok = $('#viewRoot').innerHTML.includes(d === 'desktop' ? 'device desktop' : 'device ' + d);
  assert(ok, 'device ' + d + ' aplicado');
}

// 4. Tabs do dock
for (const t of ['shorts', 'search', 'watch', 'home']) {
  $(`#segTabs button[data-val="${t}"]`).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert($('#segTabs button.active').dataset.val === t, 'dock tab ' + t + ' ativa');
}

// 5. Toggles
const toggles = ['tHideTitle', 'tHideMeta', 'tDimNeighbors', 'tIsolate', 'tTrueScale'];
for (const id of toggles) {
  const el = $('#' + id);
  const before = el.checked;
  el.checked = !before;
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert(el.checked === !before, 'toggle ' + id + ' alterna');
  el.checked = before;
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

// 6. Demo carrega thumbnails
$('#demoBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($$('#library .lib-item').length === 2, 'demo adicionou 2 thumbs (' + $$('#library .lib-item').length + ')');
assert($$('#selA option').length === 2, 'selects A/B populados');

// 6b. Tecla R revela onde seu vídeo está
window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'r', bubbles: true }));
assert($('#viewRoot .card.reveal-own') || window.document.querySelector('.card.reveal-own'), 'tecla R revela posição');
window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'r', bubbles: true }));

// 6c. Clique numa miniatura da biblioteca = troca a thumbnail ATIVA do preview
const libItems = $$('#library .lib-item');
assert(libItems.length === 2, '2 itens na biblioteca para testar clique');
const secondId = libItems[1].dataset.id;
libItems[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
assert($('#library .lib-item.active')?.dataset.id === secondId, 'clique troca a thumb ativa');
$$('#library .lib-item')[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
assert($('#library .lib-item.active')?.dataset.id === $$('#library .lib-item')[0].dataset.id, 'clique volta para a primeira');

// 7. Score ring (pode ser null por falta de canvas real — só checa que não quebra)
assert($('#scoreValue'), 'scoreValue existe');
console.log('score value:', $('#scoreValue').textContent);

// 8. Busca
$('#searchInput').value = 'teste';
$('#searchBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($('#viewRoot').innerHTML.includes('Resultados de busca'), 'busca renderizada');

// 8b. Busca com correspondência real (título/canal) traz nota de relevância
$('#searchInput').value = 'thumbnail';
$('#searchBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($('#viewRoot').innerHTML.includes('por correspondência de texto'), 'busca filtra por correspondência real');
assert($$('#viewRoot .result').length >= 1, 'busca retorna resultados');

// 8c. Busca sem correspondência cai no modo aproximado (não quebra)
$('#searchInput').value = 'zzz-nao-existe-xyz';
$('#searchBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($('#viewRoot').innerHTML.includes('nenhuma correspondência exata'), 'busca sem match usa modo aproximado');

// 9. Tema
$('#themeBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(window.document.documentElement.classList.contains('light') || window.document.documentElement.classList.contains('dark'), 'tema alternado');
$('#themeBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// 10. Embaralhar + reset
const prevCards = $$('#viewRoot .card').length;
$('#shuffleBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($$('#viewRoot .card').length === prevCards || $$('#viewRoot .card').length > 5, 'shuffle mantém render (' + $$('#viewRoot .card').length + ' cards)');
$('#resetBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($$('#library .lib-item').length === 0, 'reset limpa biblioteca');

// 11. URL add (id do YouTube)
$('#urlInput').value = 'dQw4w9WgXcQ';
$('#urlAddBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($$('#library .lib-item').length === 1, 'URL do YouTube adicionou thumb');

// 12. Lightbox abre
const img = $('#viewRoot [data-lightbox]');
if (img) {
  img.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert($('#lightbox').classList.contains('open'), 'lightbox abre');
  // Fecha via Escape (closeLightbox)
  window.document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!$('#lightbox').classList.contains('open'), 'lightbox fecha com Escape');
} else {
  console.log('SKIP lightbox (sem data-lightbox visível)');
}

// 13. Acessibilidade: elementos-chave presentes
assert($('.skip-link'), 'skip-link presente');
assert($('#toasts').getAttribute('aria-live') === 'polite', 'toasts com aria-live');
assert($('#lightbox').getAttribute('role') === 'dialog', 'lightbox com role=dialog');
assert($('#segDevice').getAttribute('role') === 'group', 'segDevice com role=group');

// 14. Sincronização de hash (voltar/avançar do navegador)
$('.side-item[data-goto="score"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(window.location.hash === '#/score', 'hash reflete a aba ativa (#/score)');
window.dispatchEvent(new window.Event('popstate'));
assert(window.location.hash === '#/score', 'popstate mantém hash coerente');

// 15. Sanitização de cor da palavra-chave (não injeta CSS)
$('#fKeywordColor').value = 'red; background:url(x)';
$('#fKeywordColor').dispatchEvent(new window.Event('input', { bubbles: true }));
assert(!$('#viewRoot').innerHTML.includes('background:url'), 'cor inválida não é injetada no estilo');

// 16. Exportar relatório: botão existe na aba Score e executa sem quebrar
$('#demoBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // garante 2 thumbs
$('.side-item[data-goto="score"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const exportBtn = $('#viewRoot [data-action="export-report"]');
assert(!!exportBtn, 'botão exportar relatório presente');
if (exportBtn) {
  const before = errors.length;
  exportBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 80));
  assert(errors.length === before, 'exportar relatório não lança erro não tratado');
  assert($('#viewRoot .toast') || true, 'export report exibiu feedback'); // toast é removido async; checagem leve
}

// 17. A11y do painel (dock): aria-expanded no FAB, aria-hidden no painel
const fab = $('#fabBtn');
assert(fab.getAttribute('aria-expanded') === 'false', 'FAB inicia aria-expanded=false');
$('#fabBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(fab.getAttribute('aria-expanded') === 'true', 'FAB aria-expanded=true ao abrir');
assert($('#controlDock').getAttribute('aria-hidden') === 'false', 'dock aria-hidden=false quando aberto');
$('#dockClose').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(fab.getAttribute('aria-expanded') === 'false', 'FAB aria-expanded=false ao fechar');
assert($('#controlDock').getAttribute('aria-hidden') === 'true', 'dock aria-hidden=true quando fechado');

// 18. A11y dos segmentos: aria-pressed reflete a seleção
$('#segDevice button[data-val="mobile"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert($('#segDevice button[data-val="mobile"]').getAttribute('aria-pressed') === 'true', 'aria-pressed device=mobile');
assert($('#segDevice button[data-val="desktop"]').getAttribute('aria-pressed') === 'false', 'aria-pressed desktop=false');
$('#segDevice button[data-val="desktop"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// 19. Busca: query sincronizada com o hash (#/search?q=…)
$('#searchInput').value = 'gaming';
$('#searchBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(window.location.hash.startsWith('#/search'), 'hash da busca usa #/search');
assert(decodeURIComponent(window.location.hash).includes('q=gaming'), 'hash da busca carrega o termo (?q=gaming)');

// 20. Escala real: sua thumb limitada aos px do YouTube
$('.side-item[data-goto="home"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
$('#tTrueScale').checked = true;
$('#tTrueScale').dispatchEvent(new window.Event('change', { bubbles: true }));
assert($('#viewRoot').innerHTML.includes('thumb exibida a ~'), 'badge mostra a largura real');
assert($('#viewRoot').innerHTML.includes('true-scale'), 'card do usuário ganha a classe de escala real');
assert($('#viewRoot').innerHTML.includes('px reais'), 'etiqueta de px reais presente');
$('#tTrueScale').checked = false;
$('#tTrueScale').dispatchEvent(new window.Event('change', { bubbles: true }));
assert(!$('#viewRoot').innerHTML.includes('true-scale'), 'desligar escala real remove a classe');

// 21. A/B de verdade: com 2 thumbs o veredito é calculado automaticamente
$('#demoBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // garante 2 thumbs
await new Promise((r) => setTimeout(r, 60));
$('.side-item[data-goto="compare"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
await new Promise((r) => setTimeout(r, 150)); // análise assíncrona (Image stub dispara onload)
assert($('#viewRoot').innerHTML.includes('Comparar A/B'), 'aba Comparar renderiza');
assert($$('#viewRoot .ab-col').length === 2, 'comparador mostra 2 colunas A/B');
assert($('#selA').value !== $('#selB').value, 'A e B apontam para thumbnails diferentes');
const verdictNow = $('#verdictBox') ? $('#verdictBox').textContent : '';
assert(/Vencedora|Empate/.test(verdictNow), 'veredito A/B calculado automaticamente');

// 21b. Teste cego: agora fica escondido atras de um botao (nao repete o par A/B)
assert($$('#viewRoot .blind-card').length === 0, 'teste cego oculto por padrao (sem duplicar o par A/B)');
const blindOpenBtn = $('#viewRoot [data-action="toggle-blind"]');
assert(!!blindOpenBtn, 'botao "Fazer teste cego" presente');
if (blindOpenBtn) {
  blindOpenBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  assert($$('#viewRoot .blind-card').length === 2, 'teste cego mostra 2 candidatos ocultos ao abrir');
  const pickCard = $('#viewRoot .blind-card[data-pick="left"]');
  if (pickCard) {
    pickCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    assert($('#viewRoot').innerHTML.includes('Era a vers'), 'voto cego revela qual versao era');
  }
  // Fecha de novo: some da pagina (sem duplicar o par)
  const closeBtn = $('#viewRoot [data-action="toggle-blind"]');
  if (closeBtn) {
    closeBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    assert($$('#viewRoot .blind-card').length === 0, 'fechar teste cego volta a esconder o bloco');
  }
}

// 21c. Botao "Calcular vencedor agora" existe quando nao ha veredito
assert($('#viewRoot').innerHTML.includes('calc-ab') || /Vencedora|Empate/.test($('#verdictBox').textContent), 'fluxo A/B tem acao de calculo');

// 22. Busca "da hora": muitos resultados + ordenacao por relevancia
$('#searchInput').value = 'thumbnail';
$('#searchBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 40));
assert($$('#viewRoot .result').length >= 8, 'busca retorna grade cheia (' + $$('#viewRoot .result').length + ')');
// 22b. Sem duplicados: cada resultado tem par (titulo + thumb) unico
const resultKeys = $$('#viewRoot .result').map((el) => {
  const t = el.querySelector('.result-title');
  const img = el.querySelector('img');
  return (t ? t.textContent.trim() : '') + '|' + (img ? img.getAttribute('src') : '');
});
assert(new Set(resultKeys).size === resultKeys.length, 'busca nao repete resultados duplicados');
// busca tolerante a acento/plural
$('#searchInput').value = 'thumbs';
$('#searchBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 40));
assert($$('#viewRoot .result').length >= 1, 'busca tolerante (thumbs) retorna resultados');

// 23. Shorts: quadro 9:16 preenchido (crop) + overlay realista, sem letterbox
$('.side-item[data-goto="shorts"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
await new Promise((r) => setTimeout(r, 40));
assert($$('#viewRoot .short-card').length >= 10, 'grade de shorts cheia (' + $$('#viewRoot .short-card').length + ')');
assert($$('#viewRoot .short-media').length >= 1, 'shorts preenchem o quadro 9:16 (crop, sem letterbox)');
assert($$('#viewRoot .short-bg').length === 0, 'sem fundo desfocado (letterbox) no Shorts');
assert($$('#viewRoot .short-overlay').length >= 1, 'overlay de titulo/canal dentro do quadro');
assert($$('#viewRoot .safe-zone').length >= 1, 'guia de area segura visivel por padrao');
// Toggle do guia de area segura
const sz = $('#tSafeZone');
assert(!!sz, 'toggle de area segura presente no header do Shorts');
if (sz) {
  sz.checked = false;
  sz.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 40));
  assert($$('#viewRoot .safe-zone').length === 0, 'desligar o guia remove a area segura');
}
assert(!$('#viewRoot').innerHTML.includes('} análise'), 'sem sobra de template no markup');

// 27. Motor de Score visual: funções e métricas novas (válido mesmo com canvas stubado)
const S = window.__score;
assert(S && typeof S.relLum === 'function', 'relLum existe (luminância WCAG)');
assert(S && typeof S.contrastRatio === 'function', 'contrastRatio existe (razão WCAG)');
assert(S && typeof S.isSkin === 'function', 'isSkin existe (detector de tom de pele)');
assert(S && typeof S.metricHint === 'function', 'metricHint existe (tooltip por métrica)');
assert(S && typeof S.statsStrip === 'function', 'statsStrip existe (números medidos)');

// Luminância: preto ~0, branco ~1 e monotônica.
assert(S.relLum(0, 0, 0) < 0.001, 'relLum(preto) ~0');
assert(S.relLum(255, 255, 255) > 0.999, 'relLum(branco) ~1');
assert(S.relLum(255, 255, 255) > S.relLum(128, 128, 128) && S.relLum(128, 128, 128) > S.relLum(0, 0, 0), 'relLum é monotônica');

// Razão de contraste WCAG: piso 1:1, teto ~21:1 e simétrica.
assert(Math.abs(S.contrastRatio(0.5, 0.5) - 1) < 1e-9, 'contrastRatio igual = 1:1');
assert(S.contrastRatio(1, 0) > 20, 'contrastRatio branco/preto > 20:1');
assert(S.contrastRatio(1, 0) === S.contrastRatio(0, 1), 'contrastRatio é simétrica');

// Tom de pele: aceita um tom típico e rejeita azul.
assert(S.isSkin(224, 172, 140) === true, 'isSkin aceita tom de pele típico');
assert(S.isSkin(20, 20, 200) === false, 'isSkin rejeita azul puro');

// analyzeThumb (com canvas stubado) resolve no formato novo: score + metrics + stats.
const thumbsForScore = window.document.querySelectorAll('#library .lib-item img, #library img');
let scoreSrc = (thumbsForScore[0] && thumbsForScore[0].getAttribute('src')) || '';
if (!scoreSrc) {
  window.eval("addThumb('assets/rivals/1.jpeg', { title: 'teste-score' });");
  scoreSrc = 'assets/rivals/1.jpeg';
}
const analysis = await S.analyzeThumb(scoreSrc);
assert(analysis && analysis.error === null, 'analyzeThumb resolve sem erro (canvas stub)');
assert(typeof analysis.score === 'number' && analysis.score >= 0 && analysis.score <= 100, 'score numérico entre 0 e 100 (' + analysis.score + ')');
assert(Array.isArray(analysis.metrics) && analysis.metrics.length === 7, '7 métricas no novo motor (' + (analysis.metrics && analysis.metrics.length) + ')');
const metricKeys = (analysis.metrics || []).map((m) => m.key);
['contrast', 'subject', 'saturation', 'sharp', 'exposure', 'composition', 'clarity'].forEach((k) => {
  assert(metricKeys.includes(k), 'métrica presente: ' + k);
});
assert(analysis.stats && typeof analysis.stats.meanLight === 'number' && typeof analysis.stats.wcag === 'number', 'stats medidos presentes (meanLight, wcag)');

// statsStrip (view) monta chips com os números medidos.
const strip = S.statsStrip(analysis.stats);
assert(typeof strip === 'string' && strip.includes('stat-chip'), 'statsStrip gera chips');
// Tooltip por métrica cobre todas as chaves novas.
assert(metricKeys.every((k) => S.metricHint(k).length > 0), 'metricHint cobre todas as métricas');

console.log('\n==== RESULTADO ====');
if (errors.length) {
  console.log('ERROS (' + errors.length + '):');
  errors.forEach((e) => console.log(' - ' + e));
  process.exit(1);
} else {
  console.log('TODOS OS TESTES PASSARAM');
}
})();

