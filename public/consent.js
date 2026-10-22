(() => {
  const ads = document.currentScript.dataset.ads, KEY = 'consent', banner = document.getElementById('consent');
  const load = () => {
    if (!ads || document.getElementById('adsjs')) return;
    const s = document.createElement('script'); s.id = 'adsjs'; s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ads);
    document.head.appendChild(s);
  };
  const v = localStorage.getItem(KEY);
  if (v === 'granted') load(); else if (!v && ads && banner) banner.hidden = false;
  banner && banner.addEventListener('click', e => {
    const b = e.target.closest('button[data-choice]'); if (!b) return;
    localStorage.setItem(KEY, b.dataset.choice); banner.hidden = true; if (b.dataset.choice === 'granted') load();
  });
  const reset = document.getElementById('consent-reset');
  reset && reset.addEventListener('click', () => { localStorage.removeItem(KEY); if (ads && banner) banner.hidden = false; });
})();