# Ferick Thumb Lab 🎬

Ferramenta estática (zero dependências) para **pre-visualizar thumbnails do YouTube** em contextos realistas antes de publicar.

## O que simula
- **Home / Shorts / Busca / Watch** — layouts fiéis ao YouTube
- **Dispositivos:** Desktop, Mobile e TV
- **Score de impacto local** — análise 100% no navegador (brilho, contraste, saturação, nitidez, regra dos terços, rosto, texto)
- **Escala real** — exibe sua thumb nos px reais do YouTube (home/busca/a seguir, desktop/mobile/TV)
- **Exportar relatório em PNG** — thumb + score + métricas + dicas num único arquivo (aba Score)
- **Comparar A/B** + **Teste cego**
- **Biblioteca** com persistência em `localStorage`
- Clique numa miniatura da biblioteca = ela vira a thumbnail **ATIVA** no preview
- Navegação por URL (`#/home`, `#/score`) com botão voltar do navegador

## Como usar
Só abrir o arquivo — não precisa de servidor nem build:

```
ferick-thumb-lab/index.html
```

Ou sirva localmente (opcional):

```bash
cd ferick-thumb-lab
npx serve .
# ou
python -m http.server 8000
```

## Qualidade de código

```bash
npm run lint     # ESLint (erros reais)
npm run format   # Prettier
npm test         # suíte headless (jsdom)
```

> CI: `.github/workflows/ci.yml` roda `npm install && npm test` em push/PR.

## Atalhos
| Tecla | Ação |
|-------|------|
| `D` | Alternar tema claro/escuro |
| `P` | Alternar isolamento (fundo neutro) |
| `M` | Menu lateral |
| `S` | Embaralhar feed |
| `R` | Revelar posição do seu vídeo |
| `Esc` | Fechar lightbox |

## Estrutura
```
ferick-thumb-lab/
├── index.html        # App completo
├── styles/app.css   # Todos os estilos
├── scripts/app.js   # Toda a lógica
└── _test_app.js     # Suite de testes headless (jsdom)
```

## Testes
```bash
npm install jsdom
node _test_app.js
```
