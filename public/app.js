(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LABEL = { news: 'News', video: 'Video', paper: 'Paper' };
  const saved = new Set(JSON.parse(localStorage.getItem('saved') || '[]'));
  const persist = () => localStorage.setItem('saved', JSON.stringify([...saved].slice(-200)));
  const day = d => String(d).slice(0, 10);

  function card(it) {
    const chips = (it.topics || []).map(t => `<a class="chip" href="/?topic=${encodeURIComponent(t)}">${esc(t)}</a>`).join('');
    return `<article class="card" data-id="${it.id}">${it.image ? `<a class="thumb" href="/a/${it.id}"><img loading="lazy" width="320" height="180" src="${esc(it.image)}" alt=""></a>` : ''}
<div class="body"><div class="meta"><span class="badge b-${it.type}">${LABEL[it.type]}</span><span>${esc(it.source || '')}</span><time>${day(it.published_at)}</time></div>
<h3><a href="/a/${it.id}">${esc(it.title)}</a></h3><p class="desc">${esc(it.description || '')}</p><div class="chips">${chips}</div>
<div class="actions"><button class="sum-btn" type="button">✨ Summary</button><button class="save-btn" type="button" aria-pressed="false">☆ Save</button><a class="ext" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">Original ↗</a></div>
<div class="summary" hidden></div></div></article>`;
  }
  const syncSaved = () => document.querySelectorAll('[data-id]').forEach(el => {
    const b = el.querySelector('.save-btn'); if (!b) return;
    const on = saved.has(el.dataset.id); b.textContent = on ? '★ Saved' : '☆ Save'; b.setAttribute('aria-pressed', on);
  });

  // ----- feed -----
  const list = $('#list');
  const state = { type: '', topic: '', range: '', sort: 'new', q: '', page: 1 };
  if (list) {
    const sp = new URLSearchParams(location.search);
    if (sp.get('topic')) { state.topic = sp.get('topic'); $('#topic').value = state.topic; }
    const more = $('#more'), empty = $('#empty');
    let totalPages = 1, busy = false;
    async function load(reset) {
      if (busy) return; busy = true;
      if (reset) state.page = 1;
      const p = new URLSearchParams({ topic: state.topic, range: state.range, sort: state.sort, q: state.q, page: state.page });
      if (state.type === 'saved') p.set('ids', [...saved].join(',')); else p.set('type', state.type);
      try {
        if (state.type === 'saved' && !saved.size) { list.innerHTML = ''; empty.hidden = false; more.hidden = true; return; }
        const r = await fetch('/api/feed?' + p); const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (reset) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', d.items.map(card).join(''));
        totalPages = d.totalPages; empty.hidden = list.children.length > 0; more.hidden = state.page >= totalPages;
        syncSaved();
      } catch { more.hidden = false; more.textContent = 'Error, tap to retry'; } finally { busy = false; }
    }
    more.addEventListener('click', () => { more.textContent = 'Load more'; if (state.page < totalPages || more.textContent) { state.page++; load(false); } });
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t)); state.type = t.dataset.type; load(true);
    }));
    for (const id of ['topic', 'range', 'sort']) $('#' + id).addEventListener('change', e => { state[id] = e.target.value; load(true); });
    let tm; $('#q').addEventListener('input', e => { clearTimeout(tm); tm = setTimeout(() => { state.q = e.target.value; load(true); }, 350); });
    if (state.topic) load(true); else { totalPages = 99; more.hidden = false; }
  }

  // ----- summaries, save, share (delegated; works for server- and client-rendered cards) -----
  document.addEventListener('click', async e => {
    const root = e.target.closest('[data-id]'); if (!root) return;
    const id = root.dataset.id;
    if (e.target.closest('.save-btn')) { saved.has(id) ? saved.delete(id) : saved.add(id); persist(); syncSaved(); }
    if (e.target.closest('.share-btn')) {
      const url = location.origin + '/a/' + id;
      try { navigator.share ? await navigator.share({ title: document.title, url }) : (await navigator.clipboard.writeText(url), e.target.textContent = 'Link copied'); } catch { /* cancelled */ }
    }
    const sb = e.target.closest('.sum-btn');
    if (sb) {
      const box = root.querySelector('.summary');
      if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false;
      if (box.dataset.loaded) return;
      box.textContent = 'Summarizing…';
      try {
        const r = await fetch(`/api/items/${id}/summary`); const d = await r.json();
        if (!r.ok) throw new Error();
        box.textContent = '';
        let ul = null;
        for (const line of d.summary.split('\n').map(s => s.trim()).filter(Boolean)) {
          if (line.startsWith('- ')) { ul = ul || box.appendChild(document.createElement('ul')); ul.appendChild(document.createElement('li')).textContent = line.slice(2); }
          else box.appendChild(document.createElement('p')).textContent = line;
        }
        const note = box.appendChild(document.createElement('small'));
        note.textContent = d.method === 'ai' || d.method === 'cached' ? 'Auto-generated summary' : 'Automatic excerpt summary';
        box.dataset.loaded = '1';
      } catch { box.textContent = 'Could not load a summary right now.'; }
    }
  });
  syncSaved();

  // ----- reviews -----
  const rl = $('#review-list');
  if (rl) {
    let rpage = 1;
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    async function loadReviews(reset) {
      const r = await fetch('/api/reviews?page=' + rpage); const d = await r.json(); if (!r.ok) return;
      if (reset) rl.textContent = '';
      for (const v of d.reviews) {
        const el = rl.appendChild(document.createElement('div')); el.className = 'review';
        el.appendChild(document.createElement('strong')).textContent = v.name + ' ';
        el.appendChild(document.createElement('span')).textContent = stars(v.rating);
        el.appendChild(document.createElement('small')).textContent = ' ' + day(v.date);
        el.appendChild(document.createElement('p')).textContent = v.text;
      }
      $('#avg').textContent = d.count ? `(${d.average} / 5 from ${d.count})` : '';
      $('#review-more').hidden = rpage >= d.totalPages;
    }
    $('#review-more').addEventListener('click', () => { rpage++; loadReviews(false); });
    $('#review-form').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, msg = $('#review-msg'), fd = Object.fromEntries(new FormData(f));
      msg.textContent = 'Posting…';
      try {
        const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Something went wrong');
        f.reset(); msg.textContent = 'Thanks for your review!'; rpage = 1; loadReviews(true);
      } catch (err) { msg.textContent = err.message; }
    });
    loadReviews(true);
  }
})();