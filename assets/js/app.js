const App = (() => {
  'use strict';
  let _manifest = null;
  let _markedReady = false;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function pruneEmpty(obj) {
    return Object.entries(obj || {}).filter(([, v]) => v !== "" && v != null);
  }

  function tiLine(label, value) {
    if (!value) return '';
    return `<span class="ti-hl">${esc(label)} ›</span> ${value}`;
  }

  function sistemaLine(distro) {
    const parts = pruneEmpty(distro).map(([, v]) => esc(v));
    if (!parts.length) return '';
    return tiLine('Sistema', parts.join(' · '));
  }

  function hardwareLine(hardware) {
    const parts = pruneEmpty(hardware).map(([, v]) => esc(v));
    if (!parts.length) return '';
    return tiLine('Hardware', parts.join(' · '));
  }

  function ouvindoLine(music) {
    if (!music || !music.artist || !music.track) return '';
    const value = music.url
      ? `<a href="${esc(music.url)}" target="_blank" rel="noopener"><span class="np-icon">♬</span> ${esc(music.track)} <span class="np-dot">●</span> ${esc(music.artist)}</a>`
      : `<span class="np-icon">♬</span> ${esc(music.track)} <span class="np-dot">●</span> ${esc(music.artist)}`;
    return tiLine('Ouvindo', value);
  }

  function setContent(html) {
    $('#app').innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function loading(msg = 'Carregando') {
    setContent(`
      <div class="loading-block">
        <span class="c-dim">$ </span><span class="c-green">${esc(msg)}</span><span class="loading-dots"></span>
      </div>`);
  }
  function setupMarked() {
    if (_markedReady) return;
    const renderer = new marked.Renderer();
    renderer.code = function (token) {
      const code = typeof token === 'object' ? token.text : token;
      const lang = typeof token === 'object' ? token.lang : arguments[1];
      const language = hljs.getLanguage(lang || '') ? lang : 'plaintext';
      const highlighted = hljs.highlight(code || '', { language }).value;
      return `<pre><code class="hljs language-${esc(language)}">${highlighted}</code></pre>`;
    };
    renderer.link = function (token, title, text) {
      const href = (typeof token === 'object') ? token.href : token;
      const linkText = (typeof token === 'object') ? token.text : text;
      const linkTitle = (typeof token === 'object') ? token.title : title;
      const isExternal = href && href.startsWith('http');
      const target = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
      const titleAttr = linkTitle ? `title="${esc(linkTitle)}"` : '';
      return `<a href="${href}" ${target} ${titleAttr}>${linkText}</a>`;
    };
    marked.use({
      gfm: true,
      breaks: true,
      renderer: renderer
    });
    _markedReady = true;
  }
  function getRoute() {
    const raw = location.pathname.slice(1) || 'home';
    const [section, ...rest] = raw.split('/');
    return { section: section || 'home', slug: rest.join('/') || null };
  }
  function updateNav(section) {
    $$('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.section === section);
    });
  }
  async function route() {
    const { section, slug } = getRoute();
    updateNav(section);
    switch (section) {
      case 'home': await renderHome(); break;
      case 'projetos': await renderProjects(); break;
      case 'blog':
        if (slug) await renderPost(slug);
        else await renderBlogList();
        break;
      case 'social': await renderSocial(); break;
      default: await renderHome();
    }
  }
  //home
  async function renderHome() {
    const INFO = window.INFO || {};

    setContent(`
      <section class="section" id="home-section">
        <div class="card" style="animation-delay:.0s">
          <div class="card-header"><span class="sym">❯</span> ~/whoami</div>
          <div class="card-body">
            <div class="prompt-line">
              <span class="ps">visitor@portfolio:~$</span>
              <span class="cmd">cat sobre.txt</span>
            </div>
            <div id="typeit-target"></div>
          </div>
        </div>
        <div class="card" style="animation-delay:.1s">
          <div class="card-header"><span class="sym">❯</span> ~/stack</div>
          <div class="card-body">
            <div class="prompt-line">
              <span class="ps">visitor@portfolio:~$</span>
              <span class="cmd">ls skills/ --color</span>
            </div>
            <div class="skills-grid" id="skills-grid">
              ${(INFO.skills || []).map((s, i) => `<span class="skill-tag" style="animation-delay:${.05 * i}s">&lt;${esc(s)}/&gt;</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="home-cta" style="animation:fade-up .4s .2s both">
          <button class="btn btn-amber" data-nav="projetos">❯ ls ./projetos</button>
          <button class="btn btn-cyan"  data-nav="blog">❯ cat ./blog</button>
          <button class="btn"           data-nav="social">❯ ./social --contact</button>
        </div>
      </section>`);
    //typeit
    if (typeof TypeIt !== 'undefined') {
      const ti = new TypeIt('#typeit-target', {
        speed: 38,
        deleteSpeed: 20,
        waitUntilVisible: true,
      });
      const about = (INFO.about && INFO.about.length)
        ? [...INFO.about]
        : ['Olá! Sou <strong>Aglair</strong>.', '<span class="ti-hl">Status ›</span> disponível para projetos e colaborações.'];

      [sistemaLine(INFO.distro), hardwareLine(INFO.hardware), ouvindoLine(INFO.music)]
        .filter(Boolean)
        .forEach(line => about.push(line));

      about.forEach((line, i) => {
        ti.type(line, i === 0 ? { delay: 400 } : undefined);
        if (i < about.length - 1) ti.break();
      });
      ti.go();
    }
    $$('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.nav));
    });
  }
  //projetos
  async function renderProjects() {
    const projects = window.PROJECTS || [];
    const spacing = "1.2rem";
    const cards = projects.length
      ? projects.map((p, i) => `
        <div class="card project-card stagger" style="animation:fade-up .4s ${.07 * i}s both; display: flex; flex-direction: column; height: 100%;">
          <div class="card-header"><span class="sym">❯</span> ${esc(p.title)}</div>
          <div class="card-body" style="
            padding: ${spacing};
            display: flex;
            flex-direction: column;
            gap: ${spacing};
            flex-grow: 1;
          ">
            <p class="project-desc" style="margin: 0; line-height: 1.4; font-size: 0.95rem;">
              ${esc(p.description)}
            </p>
            <div class="project-tags" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0;">
              ${(p.tags || []).map(t => `<span class="tag" style="margin: 0; font-size: 0.75rem;">${esc(t)}</span>`).join('')}
            </div>
            <div class="project-links" style="display: flex; gap: 12px; margin: 0;">
              ${p.github ? `<a href="${esc(p.github)}" target="_blank" rel="noopener" class="btn btn-sm" style="margin: 0; padding: 2px 8px;">[ github ]</a>` : ''}
              ${p.site ? `<a href="${esc(p.site)}"   target="_blank" rel="noopener" class="btn btn-sm btn-cyan" style="margin: 0; padding: 2px 8px;">[ site ]</a>` : ''}
            </div>
          </div>
        </div>`).join('')
      : `<p class="alert alert-info">Nenhum projeto cadastrado.</p>`;
    setContent(`
      <section class="section" id="projetos-section">
        <div class="section-header" style="margin-bottom: 2rem;">
          <span class="ps">$</span> ls -la ./projetos
        </div>
        <div class="projects-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
          align-items: stretch;
        ">${cards}</div>
      </section>`);
  }
  //blog
  async function renderBlogList() {
    loading('Lendo blog/');
    try {
      if (!_manifest) {
        const res = await fetch('/blog/manifest.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _manifest = await res.json();
      }
      const posts = (_manifest.posts || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      const allTags = [...new Set(posts.flatMap(p => p.tags || []))].sort();
      setContent(`
        <section class="section" id="blog-section">
          <div class="section-header">
            <span class="ps">$</span> ls ./blog --sort=date
          </div>
          ${allTags.length ? `
          <div class="tag-filter">
            <span class="label">filtro:</span>
            <button class="tag active" data-filter="">tudo</button>
            ${allTags.map(t => `<button class="tag" data-filter="${esc(t)}">${esc(t)}</button>`).join('')}
          </div>` : ''}
          <div class="posts-list stagger" id="posts-list">
            ${posts.length
          ? posts.map(p => `
                <div class="post-item" data-tags="${esc((p.tags || []).join(','))}">
                  <div class="post-date">${esc(p.date)}</div>
                  <a href="/blog/${esc(p.slug)}" class="post-title">${esc(p.title)}</a>
                  ${p.excerpt ? `<p class="post-excerpt">${esc(p.excerpt)}</p>` : ''}
                  <div class="post-tags">
                    ${(p.tags || []).map(t => `<span class="tag" data-filtertag="${esc(t)}">${esc(t)}</span>`).join('')}
                  </div>
                </div>`).join('')
          : `<p class="alert alert-info">Nenhum post encontrado.</p>`}
          </div>
        </section>`);
      $$('.tag-filter .tag').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.dataset.filter || null;
          filterPosts(tag, btn);
        });
      });
      $$('[data-filtertag]').forEach(tag => {
        tag.addEventListener('click', () => filterByTag(tag.dataset.filtertag));
      });
    } catch (err) {
      setContent(`<div class="alert alert-error">Não foi possível carregar o blog. Tente novamente mais tarde.</div>`);
    }
  }
  //post
  async function renderPost(slug) {
    loading(`Lendo blog/${slug}.md`);
    try {
      if (!_manifest) {
        const res = await fetch('/blog/manifest.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _manifest = await res.json();
      }
      const meta = (_manifest.posts || []).find(p => p.slug === slug);
      if (!meta) throw new Error('post_not_found');
      const mdRes = await fetch(`/blog/${meta.file}`);
      if (!mdRes.ok) throw new Error('file_not_found');
      const raw = await mdRes.text();
      setupMarked();
      const html = marked.parse(raw);
      setContent(`
        <article class="section" id="post-section">
          <div class="post-nav">
            <button class="btn btn-sm" id="btn-voltar">← voltar</button>
            <a href="/blog" class="btn btn-sm">ls ./blog</a>
          </div>
          <div class="post-meta">
            <span class="c-dim">[ ${esc(meta.date)} ]</span>
            <div class="post-tags">
              ${(meta.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
          </div>
          <div class="post-content">${html}</div>
          <div class="post-footer">
            <button class="btn btn-sm btn-amber" id="btn-topo">↑ voltar ao topo</button>
          </div>
        </article>`);
      $('#btn-voltar').addEventListener('click', () => history.back());
      $('#btn-topo').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      $$('#post-section pre code').forEach(el => {
        if (!el.classList.contains('hljs')) hljs.highlightElement(el);
      });
    } catch (err) {
      setContent(`<div class="alert alert-error">Este post não está disponível no momento. <a href="/blog" class="btn btn-sm" style="margin-left:8px">← voltar ao blog</a></div>`);
    }
  }
  //social
  async function renderSocial() {
    const links = (window.INFO && window.INFO.social) || [];
    setContent(`
      <section class="section" id="social-section">
        <div class="section-header">
          <span class="ps">$</span> cat social.links
        </div>
        <div class="social-grid stagger">
          ${links.map(l => `
            <a href="${esc(l.url)}" target="_blank" rel="noopener" class="social-card card">
              <div class="card-header">
                <span class="sym">${esc(l.icon)}</span> ${esc(l.label)}
              </div>
              <div class="card-body">
                <p class="social-handle">${esc(l.handle)}</p>
                <p class="social-desc">${esc(l.desc)}</p>
              </div>
            </a>`).join('')}
        </div>
      </section>`);
  }
  function filterPosts(tag, btn) {
    $$('.tag-filter .tag').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    $$('.post-item').forEach(item => {
      if (!tag) {
        item.style.display = '';
      } else {
        const tags = item.dataset.tags.split(',');
        item.style.display = tags.includes(tag) ? '' : 'none';
      }
    });
  }
  function filterByTag(tag) {
    App.navigate('blog');
    setTimeout(() => {
      const btn = $$('.tag-filter .tag').find(b => b.textContent.trim() === tag);
      if (btn) filterPosts(tag, btn);
    }, 400);
  }
  function navigate(path) {
    history.pushState({}, '', '/' + path);
    route();
  }
  function startUptime() {
    const start = Date.now();
    const el = $('#uptime');
    if (!el) return;
    setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sc = String(s % 60).padStart(2, '0');
      if ($('#uptime')) $('#uptime').textContent = `${h}:${m}:${sc}`;
    }, 1000);
  }
  function applyHost() {
    const host = (window.INFO && window.INFO.host) || 'portfolio';
    const hostEl = $('.c-host');
    if (hostEl) hostEl.textContent = host;
    const footerHost = $('.site-footer .c-accent');
    if (footerHost) footerHost.textContent = host;
  }
  function init() {
    console.log('%c ꕤ AGL ', 'color: #00ff00; font-size: 1.2rem;');
    applyHost();
    $$('.nav-link').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        App.navigate(a.dataset.section);
      });
    });
    window.addEventListener('popstate', route);
    route();
    startUptime();
  }
  return { init, filterPosts, filterByTag, navigate };
})();
document.addEventListener('DOMContentLoaded', () => App.init());