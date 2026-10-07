/* Andaluria Wiki — plugin do Guia do Caçador
   Blocos: ficha, cartoes, mapa, relacionados, navegacao
   Extras: página inicial ao abrir, botões na lateral, zoom de imagem */
const { Plugin, MarkdownRenderer, MarkdownRenderChild, TFile, parseYaml, Notice, setIcon, Modal, Setting, normalizePath, requestUrl } = require('obsidian');

const INICIO = 'index'; // no site o Início virou index.md
const PASTA_CACHE = '_midia/gravuras';
const TIPOS = {
  lugar:    { rotulo: 'Lugar',     icone: 'map-pin' },
  pessoa:   { rotulo: 'Pessoa',    icone: 'user' },
  faccao:   { rotulo: 'Facção',    icone: 'shield' },
  criatura: { rotulo: 'Bestiário', icone: 'skull' },
  mundo:    { rotulo: 'O Mundo',   icone: 'book-open' },
  cacador:  { rotulo: 'Caçador',   icone: 'swords' },
  diario:   { rotulo: 'Diário de Caça', icone: 'scroll' },
  item:     { rotulo: 'Arsenal',   icone: 'sword' },
  guia:     { rotulo: 'Guia',      icone: 'compass' },
};
const SECOES = [
  ['Início', 'home', 'index'],
  ['O Mundo', 'book-open', 'O Mundo'],
  ['Lugares', 'map-pin', 'Lugares'],
  ['Mapa', 'map', 'Mapa de Andaluria'],
  ['Pessoas', 'users', 'Pessoas'],
  ['Facções', 'shield', 'Facções'],
  ['Bestiário', 'skull', 'Bestiário'],
  ['Caçadores', 'swords', 'Os Caçadores'],
  ['Diário', 'scroll', 'Diário de Caça'],
];

const MODELOS = {
  pessoa:   { rotulo: 'Pessoa (alguém que o grupo conheceu)', pasta: '3 - Pessoas', sub: 'Pessoa', ficha: ['Papel', 'Onde encontrar', 'Situação'], corpo: '## Quem é\n\n\n## O que sabemos\n\n- \n\n## O que ainda não sabemos\n\n- \n' },
  lugar:    { rotulo: 'Lugar', pasta: '2 - Lugares', sub: 'Lugar', ficha: ['Tipo', 'Região'], corpo: '## Como é\n\n\n## O que aconteceu aqui\n\n- \n' },
  criatura: { rotulo: 'Criatura (algo que o grupo enfrentou)', pasta: '5 - Bestiário', sub: 'Criatura', ficha: ['Onde foi vista', 'Fraqueza'], corpo: '## O que é\n\n\n## Como age\n\n- \n\n## Fraquezas\n\n- \n' },
  faccao:   { rotulo: 'Facção ou grupo', pasta: '4 - Facções', sub: 'Grupo', ficha: ['Sede', 'Quem manda'], corpo: '## O que é\n\n\n## O que quer\n\n- \n' },
  diario:   { rotulo: 'Registro de sessão', pasta: '7 - Diário de Caça', sub: 'Registro de sessão', ficha: ['Data'], corpo: '## O que aconteceu\n\n\n## Quem conhecemos\n\n- \n\n## O que descobrimos\n\n- \n\n## Para a próxima\n\n- \n' },
};
class NovaPagina extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; this.tipo = 'pessoa'; this.nome = ''; this.resumo = ''; this.img = ''; }
  onOpen() {
    const { contentEl } = this; contentEl.addClass('aw-modal');
    contentEl.createEl('h2', { text: 'Nova página' });
    new Setting(contentEl).setName('O que é?').addDropdown(d => { for (const k in MODELOS) d.addOption(k, MODELOS[k].rotulo); d.setValue(this.tipo); d.onChange(v => this.tipo = v); });
    new Setting(contentEl).setName('Nome').addText(t => { t.setPlaceholder('Ex.: Dona Inês, a padeira'); t.onChange(v => this.nome = v); setTimeout(() => t.inputEl.focus(), 50); t.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') this.criar(); }); });
    new Setting(contentEl).setName('Uma frase sobre').setDesc('Aparece nos cartões e no topo da página.').addText(t => { t.onChange(v => this.resumo = v); t.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') this.criar(); }); });
    new Setting(contentEl).setName('Imagem (opcional)').setDesc('Cole o link de uma imagem da internet. Pode deixar em branco.').addText(t => { t.setPlaceholder('https://...'); t.onChange(v => this.img = v); });
    new Setting(contentEl).addButton(b => b.setButtonText('Criar página').setCta().onClick(() => this.criar()));
  }
  async criar() {
    const nome = this.nome.replace(/[\\/:*?"<>|#^\[\]]/g, '').trim();
    if (!nome) { new Notice('Dê um nome para a página.'); return; }
    const mo = MODELOS[this.tipo];
    const caminho = normalizePath(mo.pasta + '/' + nome + '.md');
    if (this.app.vault.getAbstractFileByPath(caminho)) { new Notice('Já existe uma página com esse nome.'); this.close(); this.app.workspace.openLinkText(caminho, '', false); return; }
    if (!this.app.vault.getAbstractFileByPath(mo.pasta)) await this.app.vault.createFolder(mo.pasta).catch(() => {});
    const q = (s) => JSON.stringify(String(s));
    const fm = ['---', 'tipo: ' + this.tipo, 'subtipo: ' + q(mo.sub)];
    if (this.resumo.trim()) fm.push('resumo: ' + q(this.resumo.trim()));
    if (this.img.trim()) fm.push('imagem: ' + q(this.img.trim()));
    fm.push('ordem: 50', '---', '```ficha'); for (const c of mo.ficha) fm.push(c + ': ');
    fm.push('```', '', mo.corpo, '```relacionados', '```', '');
    const f = await this.app.vault.create(caminho, fm.join('\n'));
    this.close();
    const folha = this.app.workspace.getLeaf(false);
    await folha.openFile(f, { state: { mode: 'source' } });
    new Notice('Página criada. Preencha os campos da ficha depois dos dois-pontos e escreva à vontade. O livro, no canto superior direito, volta para a leitura.', 9000);
  }
  onClose() { this.contentEl.empty(); }
}

function yaml(src) {
  try { const o = parseYaml(src || ''); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; }
}
function lista(v) { if (v == null) return []; return Array.isArray(v) ? v : [v]; }
function semLink(s) { return String(s == null ? '' : s).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1'); }
function iniciais(nome) {
  const p = String(nome || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(w => w && !/^(de|da|do|dos|das|e|o|a|os|as|del|em)$/i.test(w));
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

module.exports = class AndaluriaWiki extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor('ficha', (src, el, ctx) => this.bloco(el, ctx, (c) => this.ficha(src, el, ctx, c)));
    this.registerMarkdownCodeBlockProcessor('cartoes', (src, el, ctx) => this.bloco(el, ctx, () => this.cartoes(src, el, ctx)));
    this.registerMarkdownCodeBlockProcessor('mapa', (src, el, ctx) => this.bloco(el, ctx, () => this.mapa(src, el, ctx), false));
    this.registerMarkdownCodeBlockProcessor('relacionados', (src, el, ctx) => this.bloco(el, ctx, () => this.relacionados(src, el, ctx)));
    this.registerMarkdownCodeBlockProcessor('navegacao', (src, el, ctx) => this.bloco(el, ctx, () => this.navegacao(el, ctx), false));

    this.addRibbonIcon('home', 'Início', () => this.abrir(INICIO));
    this.addRibbonIcon('map', 'Mapa de Andaluria', () => this.abrir('Mapa de Andaluria'));
    this.addRibbonIcon('dices', 'Página aleatória', () => this.aleatoria());
    this.addRibbonIcon('file-plus', 'Nova página', () => new NovaPagina(this.app, this).open());
    this.addCommand({ id: 'nova', name: 'Nova página', callback: () => new NovaPagina(this.app, this).open() });
    this.addCommand({ id: 'inicio', name: 'Ir para o Início', callback: () => this.abrir(INICIO) });
    this.addCommand({ id: 'mapa', name: 'Abrir o mapa', callback: () => this.abrir('Mapa de Andaluria') });
    this.addCommand({ id: 'aleatoria', name: 'Página aleatória', callback: () => this.aleatoria() });

    // zoom de imagem
    this.registerDomEvent(document, 'click', (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLImageElement)) return;
      if (!t.closest('.markdown-reading-view, .markdown-rendered')) return;
      if (t.closest('a, .aw-card, .aw-mapa, .aw-lightbox, .aw-nozoom')) return;
      this.lightbox(t.src, t.getAttribute('alt') || t.dataset.legenda || '');
    });

    this.app.workspace.onLayoutReady(() => {
      const temNota = this.app.workspace.getLeavesOfType('markdown').some(l => l.view && l.view.file);
      if (!temNota) this.abrir(INICIO);
      window.setTimeout(() => this.preCarregar(), 4000);
    });
  }

  /* ---------- ilustrações: baixa uma vez e guarda no vault ---------- */
  nomeCache(url) {
    let h = 5381; for (let i = 0; i < url.length; i++) h = (((h << 5) + h) + url.charCodeAt(i)) >>> 0;
    const m = url.split('?')[0].match(/\.(jpe?g|png|gif|webp)$/i);
    return PASTA_CACHE + '/' + h.toString(16) + '.' + (m ? m[1].toLowerCase() : 'jpg');
  }
  baixar(url) {
    if (!this.fila) { this.fila = []; this.pedidos = new Set(); this.ativos = 0; this.salvos = 0; }
    if (this.pedidos.has(url)) return;
    this.pedidos.add(url); this.fila.push(url); this.bombear();
  }
  bombear() {
    while (this.ativos < 2 && this.fila.length) {
      const url = this.fila.shift(); this.ativos++;
      this.guardar(url).catch(() => {}).finally(() => {
        this.ativos--;
        if (!this.fila.length && !this.ativos && this.salvos) { new Notice('Ilustrações guardadas no vault (' + this.salvos + '). Agora elas abrem sem internet.'); this.salvos = 0; }
        setTimeout(() => this.bombear(), 350);
      });
    }
  }
  async guardar(url) {
    const nome = this.nomeCache(url);
    if (this.app.vault.getAbstractFileByPath(nome)) return;
    const r = await requestUrl({ url, throw: false });
    if (r.status !== 200 || !r.arrayBuffer || r.arrayBuffer.byteLength < 3000) return;
    const tipo = String((r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '');
    if (tipo && !/^image\//i.test(tipo)) return;
    if (!this.app.vault.getAbstractFileByPath(PASTA_CACHE)) await this.app.vault.createFolder(PASTA_CACHE).catch(() => {});
    await this.app.vault.createBinary(nome, r.arrayBuffer);
    this.salvos++;
  }
  preCarregar() {
    for (const f of this.app.vault.getMarkdownFiles()) {
      const m = this.fm(f);
      for (const k of ['capa', 'imagem']) { const v = m[k] && semLink(m[k]).trim(); if (v && /^https?:\/\//i.test(v) && !this.app.vault.getAbstractFileByPath(this.nomeCache(v))) this.baixar(v); }
    }
  }

  /* ---------- utilidades ---------- */
  bloco(el, ctx, desenhar, atualizar = true) {
    const filho = new MarkdownRenderChild(el);
    ctx.addChild(filho);
    const seguro = () => { try { el.empty(); desenhar(filho); } catch (e) { console.error('Andaluria Wiki', e); el.setText('Não foi possível montar este bloco.'); } };
    el._awFilho = filho;
    seguro();
    if (atualizar) {
      let t = null;
      filho.registerEvent(this.app.metadataCache.on('resolved', () => { clearTimeout(t); t = setTimeout(seguro, 400); }));
    }
  }
  arquivo(nome, origem) {
    if (!nome) return null;
    const f = this.app.metadataCache.getFirstLinkpathDest(semLink(nome).trim(), origem || '');
    return f instanceof TFile ? f : null;
  }
  fm(f) { const c = f && this.app.metadataCache.getFileCache(f); return (c && c.frontmatter) || {}; }
  abrir(nome, novaAba) {
    const f = this.arquivo(nome, '');
    if (!f) { new Notice('Página não encontrada: ' + nome); return; }
    this.app.workspace.openLinkText(f.path, '', !!novaAba);
  }
  aleatoria() {
    const fs = this.app.vault.getMarkdownFiles().filter(f => { const t = this.fm(f).tipo; return t && !this.fm(f).indice; });
    if (fs.length) this.app.workspace.openLinkText(fs[Math.floor(Math.random() * fs.length)].path, '', false);
  }
  src(valor, origem) {
    if (!valor) return null;
    const v = semLink(valor).trim();
    if (/^https?:\/\//i.test(v)) {
      const nome = this.nomeCache(v);
      const local = this.app.vault.getAbstractFileByPath(nome);
      if (local instanceof TFile) return { url: this.app.vault.getResourcePath(local), remota: true };
      this.baixar(v);
      return { url: v, remota: true };
    }
    const f = this.arquivo(v, origem);
    return f ? { url: this.app.vault.getResourcePath(f), remota: false } : null;
  }
  imagem(pai, valor, origem, nome, classe, foco) {
    const s = this.src(valor, origem);
    const caixa = pai.createDiv({ cls: 'aw-img ' + (classe || '') });
    const marca = () => { caixa.empty(); caixa.addClass('aw-semimg'); caixa.createSpan({ cls: 'aw-monograma', text: iniciais(nome) }); };
    if (!s) { marca(); return caixa; }
    const img = caixa.createEl('img', { attr: { src: s.url, alt: nome || '', loading: 'lazy', referrerpolicy: 'no-referrer' } });
    if (s.remota) img.addClass('aw-gravura');
    if (foco) img.style.objectPosition = String(foco);
    else if (classe === 'aw-card-img' && !caixa.closest('.aw-retrato')) img.addEventListener('load', () => { if (img.naturalHeight > img.naturalWidth * 1.1) img.style.objectPosition = '50% 20%'; });
    img.addEventListener('error', marca);
    return caixa;
  }
  link(pai, f, texto, origem, cls) {
    const a = pai.createEl('a', { cls: 'internal-link ' + (cls || ''), text: texto, attr: { href: f.path, 'data-href': f.path } });
    a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.app.workspace.openLinkText(f.path, origem || '', ev.ctrlKey || ev.metaKey); });
    a.addEventListener('mouseover', (ev) => { this.app.workspace.trigger('hover-link', { event: ev, source: 'preview', hoverParent: { hoverPopover: null }, targetEl: a, linktext: f.path, sourcePath: origem || '' }); });
    return a;
  }
  ligar(el, origem) {
    el.querySelectorAll('a.internal-link').forEach(a => {
      if (a._aw) return; a._aw = true;
      a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.app.workspace.openLinkText(a.getAttribute('data-href') || a.getAttribute('href'), origem, ev.ctrlKey || ev.metaKey); });
    });
  }
  async md(texto, el, origem, filho) {
    await MarkdownRenderer.render(this.app, String(texto), el, origem, filho);
    const p = el.querySelector(':scope > p');
    if (p && el.children.length === 1) { while (p.firstChild) el.appendChild(p.firstChild); p.remove(); }
    this.ligar(el, origem);
  }
  lightbox(src, legenda) {
    const fundo = document.body.createDiv({ cls: 'aw-lightbox' });
    fundo.createEl('img', { attr: { src } });
    if (legenda) fundo.createDiv({ cls: 'aw-lightbox-legenda', text: legenda });
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    fundo.addEventListener('click', fechar);
    document.addEventListener('keydown', tecla);
  }

  /* ---------- barra de navegação ---------- */
  navegacao(el, ctx, ativo) {
    const nav = el.createDiv({ cls: 'aw-nav' });
    for (const [rotulo, icone, nota] of SECOES) {
      const f = this.arquivo(nota, ctx.sourcePath);
      if (!f) continue;
      const a = this.link(nav, f, '', ctx.sourcePath, 'aw-nav-item');
      setIcon(a.createSpan({ cls: 'aw-nav-icone' }), icone);
      a.createSpan({ text: rotulo });
      if (f.path === ctx.sourcePath || ativo === nota) a.addClass('is-ativo');
    }
    return nav;
  }

  /* ---------- ficha: capa + título + caixa de informações ---------- */
  ficha(src, el, ctx, filho) {
    const f = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    const m = Object.assign({}, this.fm(f), yaml(src));
    const titulo = m.titulo || (f ? f.basename : '');
    const tipo = TIPOS[m.tipo] || null;
    el.addClass('aw-ficha');

    const secao = m.secao || ({ lugar: 'Lugares', pessoa: 'Pessoas', faccao: 'Facções', criatura: 'Bestiário', item: 'Bestiário', mundo: 'O Mundo', cacador: 'Os Caçadores', diario: 'Diário de Caça' })[m.tipo];
    this.navegacao(el, ctx, secao);

    const temCapa = !!this.src(m.capa, ctx.sourcePath);
    const topo = el.createDiv({ cls: 'aw-topo' + (temCapa ? ' tem-capa' : '') + (m.indice ? ' aw-indice' : '') });
    if (temCapa) {
      const s = this.src(m.capa, ctx.sourcePath);
      const img = topo.createEl('img', { cls: 'aw-capa aw-nozoom' + (s.remota ? ' aw-gravura' : ''), attr: { src: s.url, alt: '', referrerpolicy: 'no-referrer' } });
      if (m.capa_foco) img.style.objectPosition = String(m.capa_foco);
      else img.addEventListener('load', () => { if (img.naturalHeight > img.naturalWidth * 1.1) img.style.objectPosition = '50% 22%'; });
      img.addEventListener('error', () => { img.remove(); topo.removeClass('tem-capa'); });
      topo.createDiv({ cls: 'aw-capa-sombra' });
    }
    const txt = topo.createDiv({ cls: 'aw-topo-texto' });
    const trilha = txt.createDiv({ cls: 'aw-trilha' });
    if (tipo) setIcon(trilha.createSpan({ cls: 'aw-trilha-icone' }), tipo.icone);
    const sf = secao && this.arquivo(secao, ctx.sourcePath);
    if (sf && sf.path !== ctx.sourcePath) { this.link(trilha, sf, secao, ctx.sourcePath); if (m.subtipo) trilha.createSpan({ text: ' · ' + semLink(m.subtipo) }); }
    else if (m.subtipo) trilha.createSpan({ text: semLink(m.subtipo) });
    else if (tipo) trilha.createSpan({ text: tipo.rotulo });
    txt.createEl('h1', { cls: 'aw-titulo', text: titulo });
    if (m.resumo) { const r = txt.createDiv({ cls: 'aw-resumo' }); this.md(m.resumo, r, ctx.sourcePath, filho); }

    const campos = m.ficha && typeof m.ficha === 'object' ? Object.entries(m.ficha) : [];
    const RESERVADAS = ['tipo', 'titulo', 'subtipo', 'resumo', 'capa', 'capa_foco', 'imagem', 'imagem_foco', 'legenda', 'secao', 'onde', 'faccao', 'grupo', 'ordem', 'indice', 'ficha', 'link_ficha', 'aliases'];
    for (const [k, v] of Object.entries(yaml(src))) if (!RESERVADAS.includes(k)) campos.push([k, v]);
    if (m.imagem || campos.length) {
      const caixa = el.createEl('aside', { cls: 'aw-infobox' + (m.tipo ? ' aw-' + m.tipo : '') });
      caixa.createDiv({ cls: 'aw-infobox-titulo', text: titulo });
      if (m.imagem) {
        const fig = this.imagem(caixa, m.imagem, ctx.sourcePath, titulo, 'aw-infobox-img');
        const im = fig.querySelector('img'); if (im && m.legenda) im.dataset.legenda = semLink(m.legenda);
        if (m.legenda) caixa.createDiv({ cls: 'aw-legenda', text: semLink(m.legenda) });
      }
      if (campos.length) {
        const tb = caixa.createEl('table', { cls: 'aw-campos' });
        for (const [k, v] of campos) {
          if (v == null || v === '') continue;
          const tr = tb.createEl('tr');
          tr.createEl('th', { text: k });
          const td = tr.createEl('td');
          this.md(lista(v).map(x => Array.isArray(x) ? '[[' + x.flat(5).join('') + ']]' : String(x)).join(' · '), td, ctx.sourcePath, filho);
        }
      }
      if (m.link_ficha) {
        const a = caixa.createEl('a', { cls: 'aw-botao external-link', text: 'Abrir a ficha de personagem', attr: { href: String(m.link_ficha), target: '_blank', rel: 'noopener' } });
      }
    }
  }

  /* ---------- cartões ---------- */
  cartoes(src, el, ctx) {
    const o = yaml(src);
    let fs = [];
    if (o.lista) {
      fs = lista(o.lista).map(n => this.arquivo(n, ctx.sourcePath)).filter(Boolean);
    } else {
      fs = this.app.vault.getMarkdownFiles().filter(f => {
        if (f.path === ctx.sourcePath) return false;
        const m = this.fm(f);
        if (m.indice && !o.indices) return false;
        if (o.pasta && !f.path.startsWith(String(o.pasta).replace(/\/?$/, '/'))) return false;
        if (o.tipo && !lista(o.tipo).includes(m.tipo)) return false;
        if (o.subtipo && !lista(o.subtipo).some(s => String(m.subtipo || '').toLowerCase().includes(String(s).toLowerCase()))) return false;
        for (const chave of ['onde', 'faccao', 'grupo']) {
          if (!o[chave]) continue;
          const alvo = semLink(o[chave]).toLowerCase();
          if (!lista(m[chave]).some(x => semLink(x).toLowerCase() === alvo)) return false;
        }
        return !!(o.pasta || o.tipo || o.onde || o.faccao || o.grupo);
      });
      fs.sort((a, b) => {
        const oa = this.fm(a).ordem, ob = this.fm(b).ordem;
        if (oa != null || ob != null) return (oa == null ? 999 : oa) - (ob == null ? 999 : ob);
        return a.basename.localeCompare(b.basename, 'pt');
      });
    }
    if (!fs.length) { if (o.vazio) el.createDiv({ cls: 'aw-vazio', text: String(o.vazio) }); return; }
    const estilo = o.estilo || 'paisagem';
    const grade = el.createDiv({ cls: 'aw-cartoes aw-' + estilo });
    if (o.colunas) grade.style.setProperty('--aw-colunas', String(o.colunas));
    for (const f of fs) {
      const m = this.fm(f);
      const card = grade.createDiv({ cls: 'aw-card' });
      const img = estilo === 'retrato' ? (m.imagem || m.capa) : (m.capa || m.imagem);
      if (estilo !== 'lista') this.imagem(card, img, f.path, m.titulo || f.basename, 'aw-card-img', estilo === 'retrato' ? m.imagem_foco : (m.capa ? m.capa_foco : null));
      const c = card.createDiv({ cls: 'aw-card-corpo' });
      if (m.subtipo && estilo !== 'compacto') c.createDiv({ cls: 'aw-card-sub', text: semLink(m.subtipo) });
      this.link(c, f, m.titulo || f.basename, ctx.sourcePath, 'aw-card-titulo');
      if (m.resumo && o.resumo !== false) c.createDiv({ cls: 'aw-card-resumo', text: semLink(m.resumo).replace(/\*\*/g, '') });
      card.addEventListener('click', (ev) => { if (ev.target.closest('a')) return; this.app.workspace.openLinkText(f.path, ctx.sourcePath, ev.ctrlKey || ev.metaKey); });
    }
  }

  /* ---------- aparece em ---------- */
  relacionados(src, el, ctx) {
    const o = yaml(src);
    const rl = this.app.metadataCache.resolvedLinks || {};
    const fs = [];
    for (const origem in rl) {
      if (origem === ctx.sourcePath) continue;
      if (rl[origem] && rl[origem][ctx.sourcePath]) {
        const f = this.app.vault.getAbstractFileByPath(origem);
        if (f instanceof TFile && !this.fm(f).indice) fs.push(f);
      }
    }
    if (!fs.length) return;
    fs.sort((a, b) => a.basename.localeCompare(b.basename, 'pt'));
    const caixa = el.createDiv({ cls: 'aw-relacionados' });
    caixa.createDiv({ cls: 'aw-relacionados-titulo', text: o.titulo || 'Aparece em' });
    const chips = caixa.createDiv({ cls: 'aw-chips' });
    for (const f of fs) {
      const m = this.fm(f); const t = TIPOS[m.tipo];
      const a = this.link(chips, f, '', ctx.sourcePath, 'aw-chip');
      if (t) setIcon(a.createSpan({ cls: 'aw-chip-icone' }), t.icone);
      a.createSpan({ text: m.titulo || f.basename });
    }
  }

  /* ---------- mapa com pinos ---------- */
  mapa(src, el, ctx) {
    const o = yaml(src);
    const s = this.src(o.imagem, ctx.sourcePath);
    if (!s) { el.setText('Imagem do mapa não encontrada.'); return; }
    const W = Number(o.largura) || 3173, H = Number(o.altura) || 2454;
    const raiz = el.createDiv({ cls: 'aw-mapa' });
    const barra = raiz.createDiv({ cls: 'aw-mapa-barra' });
    const janela = raiz.createDiv({ cls: 'aw-mapa-janela' });
    const palco = janela.createDiv({ cls: 'aw-mapa-palco' });
    palco.style.aspectRatio = W + ' / ' + H;
    janela.style.aspectRatio = W + ' / ' + H;
    palco.createEl('img', { attr: { src: s.url, alt: 'Mapa de Andaluria', draggable: 'false' } });
    let z = 1, x = 0, y = 0;
    const aplicar = () => {
      const jw = janela.clientWidth, jh = janela.clientHeight, pw = jw * z, ph = pw * H / W;
      x = Math.min(0, Math.max(jw - pw, x)); y = ph <= jh ? (jh - ph) / 2 : Math.min(0, Math.max(jh - ph, y));
      palco.style.width = pw + 'px'; palco.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      raiz.style.setProperty('--aw-z', String(z));
    };
    const zoom = (fator, cx, cy) => {
      const jw = janela.clientWidth, jh = janela.clientHeight;
      cx = cx == null ? jw / 2 : cx; cy = cy == null ? jh / 2 : cy;
      const nz = Math.min(5, Math.max(1, z * fator));
      x = cx - (cx - x) * (nz / z); y = cy - (cy - y) * (nz / z); z = nz; aplicar();
    };
    const bt = (icone, dica, fn) => { const b = barra.createEl('button', { cls: 'aw-mapa-bt', attr: { 'aria-label': dica } }); setIcon(b, icone); b.addEventListener('click', fn); };
    bt('zoom-in', 'Aproximar', () => zoom(1.4));
    bt('zoom-out', 'Afastar', () => zoom(1 / 1.4));
    bt('maximize', 'Ver tudo', () => { z = 1; x = 0; y = 0; aplicar(); });
    barra.createSpan({ cls: 'aw-mapa-dica', text: 'Arraste para mover · role para aproximar · clique num ponto para abrir' });
    janela.addEventListener('wheel', (ev) => { ev.preventDefault(); const r = janela.getBoundingClientRect(); zoom(ev.deltaY < 0 ? 1.2 : 1 / 1.2, ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
    let arr = null, moveu = false;
    janela.addEventListener('pointerdown', (ev) => { if (ev.target.closest('.aw-pino')) return; arr = { px: ev.clientX, py: ev.clientY, x, y }; moveu = false; janela.setPointerCapture(ev.pointerId); janela.addClass('arrastando'); });
    janela.addEventListener('pointermove', (ev) => { if (!arr) return; x = arr.x + ev.clientX - arr.px; y = arr.y + ev.clientY - arr.py; moveu = true; aplicar(); });
    const soltar = () => { arr = null; janela.removeClass('arrastando'); };
    janela.addEventListener('pointerup', soltar); janela.addEventListener('pointercancel', soltar);

    const legenda = raiz.createDiv({ cls: 'aw-mapa-legenda' });
    const pinos = lista(o.pinos);
    pinos.forEach((p, i) => {
      const f = this.arquivo(p.nota, ctx.sourcePath);
      const n = p.n != null ? p.n : i + 1;
      const nome = p.nome || (f ? (this.fm(f).titulo || f.basename) : semLink(p.nota));
      const pino = palco.createDiv({ cls: 'aw-pino' });
      pino.style.left = (100 * p.x / W) + '%'; pino.style.top = (100 * p.y / H) + '%';
      pino.createSpan({ cls: 'aw-pino-n', text: String(n) });
      pino.createSpan({ cls: 'aw-pino-nome', text: nome });
      const ir = (ev) => { if (f) this.app.workspace.openLinkText(f.path, ctx.sourcePath, ev.ctrlKey || ev.metaKey); };
      pino.addEventListener('click', ir);
      const item = legenda.createDiv({ cls: 'aw-mapa-item' });
      item.createSpan({ cls: 'aw-pino-n', text: String(n) });
      const tx = item.createDiv();
      if (f) this.link(tx, f, nome, ctx.sourcePath, 'aw-mapa-nome'); else tx.createSpan({ cls: 'aw-mapa-nome', text: nome });
      const resumo = p.resumo || (f ? this.fm(f).resumo : '');
      if (resumo) tx.createDiv({ cls: 'aw-mapa-resumo', text: semLink(resumo).replace(/\*\*/g, '') });
      item.addEventListener('mouseenter', () => pino.addClass('destaque'));
      item.addEventListener('mouseleave', () => pino.removeClass('destaque'));
      pino.addEventListener('mouseenter', () => item.addClass('destaque'));
      pino.addEventListener('mouseleave', () => item.removeClass('destaque'));
    });
    const ro = new ResizeObserver(() => aplicar()); ro.observe(janela);
    el._awFilho && el._awFilho.register(() => ro.disconnect());
    setTimeout(aplicar, 50);
  }
};
