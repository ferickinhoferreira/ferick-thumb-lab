# Ferick Thumb Lab 🎬

Ferramenta estática (zero dependências) para **pre-visualizar thumbnails do YouTube** em contextos realistas antes de publicar.

## O que simula
- **Home / Shorts / Busca / Watch** — layouts fiéis ao YouTube
- **Dispositivos:** Desktop, Mobile e TV
- **Score de impacto local** — análise 100% no navegador (brilho, contraste, saturação, nitidez, regra dos terços, rosto, texto)
- **Comparar A/B** + **Teste cego**
- **Biblioteca** com persistência em `localStorage`
- Clique numa miniatura da biblioteca = ela vira a thumbnail **ATIVA** no preview

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
