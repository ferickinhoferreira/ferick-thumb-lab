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
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = function () {};
window.onerror = (msg) => errors.push('window.onerror: ' + msg);

// jsdom outside-only fica em 'loading'; força DOMContentLoaded para o boot do app
Object.defineProperty(window.document, 'readyState', { configurable: true, get: () => 'complete' });

// Executa o app
try {
  window.eval(appJs);
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
assert($('#viewRoot img[src*="thumbnails"]') || $('#viewRoot img').length > 0, 'imagens de thumbs no feed');
assert($$('#chips .chip').length === 12, 'chips renderizados');

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
const toggles = ['tHideTitle', 'tHideMeta', 'tDimNeighbors', 'tIsolate'];
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
} else {
  console.log('SKIP lightbox (sem data-lightbox visível)');
}

console.log('\n==== RESULTADO ====');
if (errors.length) {
  console.log('ERROS (' + errors.length + '):');
  errors.forEach((e) => console.log(' - ' + e));
  process.exit(1);
} else {
  console.log('TODOS OS TESTES PASSARAM');
}
})();

