import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Guia do Caçador",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "pt-BR",
    // troque pelo endereço onde o site vai ficar (ex.: seu-usuario.github.io/andaluria)
    baseUrl: "pedroeu12.github.io/andaluria",
    ignorePatterns: ["private", "templates", ".obsidian", "LEIA-ME.txt"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: { name: "Cinzel", weights: [400, 700, 900] },
        body: { name: "Alegreya", weights: [400, 700], includeItalic: true },
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#fbf7ee",
          lightgray: "#d9cdb0",
          gray: "#85775c",
          darkgray: "#2c2720",
          dark: "#1b1814",
          secondary: "#8a6518",
          tertiary: "#6e1f2a",
          highlight: "rgba(154, 116, 33, 0.10)",
          textHighlight: "rgba(201, 162, 74, 0.40)",
        },
        darkMode: {
          light: "#16130f",
          lightgray: "#3a3224",
          gray: "#857657",
          darkgray: "#e3d6b2",
          dark: "#f6ebc9",
          secondary: "#d9b35a",
          tertiary: "#e08a97",
          highlight: "rgba(201, 162, 74, 0.09)",
          textHighlight: "rgba(201, 162, 74, 0.28)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      // blocos ficha/cartoes/mapa/relacionados do vault (precisa vir antes do CrawlLinks)
      Plugin.AndaluriaWiki(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
