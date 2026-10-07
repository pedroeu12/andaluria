# Guia do Caçador — site (Quartz)

Este é o vault **Andaluria - Guia do Caçador** transformado em site com o
[Quartz 4](https://quartz.jzhao.xyz). As notas ficam em `content/`, do jeito que
estão no Obsidian.

## O que foi adaptado

- **Plugin `andaluria-wiki` → Quartz.** Os blocos `ficha`, `cartoes`, `mapa`,
  `relacionados` e `navegacao` são montados na hora de gerar o site, pelo arquivo
  `quartz/plugins/transformers/andaluria.ts`. Capa, caixa de informações, cartões, mapa
  com pinos (arrastar e aproximar), "Aparece em" e o zoom de imagem funcionam como no
  Obsidian. O script do navegador está em `quartz/components/scripts/andaluria.inline.ts`.
- **Tema.** As cores e fontes (Cinzel + Alegreya) do tema Andaluria estão em
  `quartz/styles/custom.scss` e em `quartz.config.ts`. Claro = pergaminho;
  escuro = preto e ouro (botão de lua/sol no topo).
- **Ilustrações.** As imagens da internet (Wikimedia) foram baixadas para
  `content/_midia/gravuras/`, com o mesmo nome que o plugin do Obsidian usa. O site não
  depende de links externos, e o Obsidian também passa a achá-las sem internet.
- **Página inicial.** O Quartz exige `content/index.md`, então `Início.md` virou
  `index.md` com o apelido (`aliases`) "Início". Links `[[Início]]` continuam funcionando.

## Para atualizar o conteúdo

Edite as notas em `content/` (dá para abrir essa pasta como cofre no Obsidian) e gere o
site de novo. Página nova: crie a nota com o mesmo frontmatter das outras (`tipo`,
`subtipo`, `resumo`, `capa`/`imagem`, `ficha`...) e os blocos `ficha` e `relacionados`.

Uma `capa` ou `imagem` com link da internet funciona direto pelo link. Para guardá-la
junto do site, abra o vault no Obsidian com o plugin ligado (ele baixa para
`_midia/gravuras`) antes de publicar.

## Ver no computador

Precisa do [Node.js](https://nodejs.org) 22 ou mais novo.

```bash
npm ci
npx quartz build --serve
```

Abra http://localhost:8080.

## Publicar de graça no GitHub Pages

1. Crie um repositório no GitHub (ex.: `andaluria`) e envie esta pasta inteira para ele
   (no GitHub Desktop: *Add local repository* → *Publish repository*).
2. No repositório: **Settings → Pages → Source: GitHub Actions**.
3. Em `quartz.config.ts`, troque `baseUrl` por `SEU-USUARIO.github.io/andaluria`.
4. Cada envio para a branch `main` publica o site sozinho
   (`.github/workflows/deploy.yml`). O endereço fica
   `https://SEU-USUARIO.github.io/andaluria`.

Outras opções (Cloudflare Pages, Netlify, Vercel): comando de build `npx quartz build`,
pasta de saída `public`.
